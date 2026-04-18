import { z } from 'zod'
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import { LoginUserUseCase } from '@/use-cases/auth/LoginUserUseCase'
import { RegisterUserUseCase } from '@/use-cases/auth/RegisterUserUseCase'
import { LogoutUserUseCase } from '@/use-cases/auth/LogoutUserUseCase'
import { SupabaseUserRepository } from '@/infra/repositories/SupabaseUserRepository'
import { setAuthCookie, deleteAuthCookie, setRefreshCookie, deleteRefreshCookie, getRefreshCookie } from '@/lib/cookies'
import { createAuditLog } from '@/lib/audit'
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '@/lib/refreshToken'
import { sendPasswordResetEmail, generateResetToken, sendNewUserNotification } from '@/lib/email'
import bcrypt from 'bcryptjs'

const userRepository = new SupabaseUserRepository()

export const authRouter = router({
  /**
   * Register new user (with Audit Logging and Refresh Tokens)
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
        whatsappNumber: z.string().min(9, 'Nomor WhatsApp tidak valid').regex(/^[0-9+\-\s()]+$/, 'Format nomor tidak valid'),
      })
    )
    .mutation(async ({ input }) => {
      const useCase = new RegisterUserUseCase(userRepository)
      // Public registration always creates an admin (warung owner)
      const result = await useCase.execute({ ...input, role: 'admin' })

      // Create refresh token and new short-lived access token
      const { refreshToken, accessToken } = await createRefreshToken(result.userId)

      // Set httpOnly cookies (access token = 30 min, refresh token = 30 days)
      await setAuthCookie(accessToken)
      await setRefreshCookie(refreshToken)

      // Audit log for registration
      await createAuditLog({
        userId: result.userId,
        userEmail: result.email,
        action: 'REGISTER',
        entityType: 'auth',
        metadata: { name: result.name, whatsappNumber: input.whatsappNumber },
      })

      // Auto-create first outlet for new warung owner
      const { supabaseAdmin } = await import('@/infra/supabase/server')
      const { data: outlet } = await supabaseAdmin
        .from('outlets')
        .insert({
          name: `${result.name} - Outlet Utama`,
          owner_id: result.userId,
        })
        .select('id')
        .single()

      if (outlet) {
        await supabaseAdmin
          .from('users')
          .update({ outlet_id: outlet.id })
          .eq('id', result.userId)
      }

      // Notify admin of new registration (non-fatal)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
      if (adminEmail) {
        await sendNewUserNotification({
          adminEmail,
          newUserName: result.name,
          newUserEmail: result.email,
          newUserWhatsapp: input.whatsappNumber,
        })
      }

      return {
        ...result,
        token: accessToken,
      }
    }),

  /**
   * Login user (with Audit Logging and Refresh Tokens)
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const useCase = new LoginUserUseCase(userRepository)
      const result = await useCase.execute(input)

      // Create refresh token and new short-lived access token
      const { refreshToken, accessToken } = await createRefreshToken(result.user.id)

      // Set httpOnly cookies (access token = 30 min, refresh token = 30 days)
      await setAuthCookie(accessToken)
      await setRefreshCookie(refreshToken)

      // Audit log for login
      await createAuditLog({
        userId: result.user.id,
        userEmail: result.user.email,
        action: 'LOGIN',
        entityType: 'auth',
        metadata: {
          name: result.user.name,
          role: result.user.role,
        },
      })

      return {
        ...result,
        token: accessToken, // Return new access token
      }
    }),

  /**
   * Logout user (with Audit Logging and Refresh Token Revocation)
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const useCase = new LogoutUserUseCase()
    await useCase.execute({ userId: ctx.userId })

    // Revoke refresh token if exists
    const refreshToken = await getRefreshCookie()
    if (refreshToken) {
      try {
        await revokeRefreshToken(refreshToken)
      } catch (error) {
        // Token might already be invalid, continue with logout
      }
    }

    // Audit log for logout
    await createAuditLog({
      userId: ctx.userId,
      userEmail: ctx.session?.email || 'unknown',
      action: 'LOGOUT',
      entityType: 'auth',
      metadata: {
        name: ctx.session?.name,
        role: ctx.session?.role,
      },
    })

    // Delete httpOnly cookies
    await deleteAuthCookie()
    await deleteRefreshCookie()

    return { success: true }
  }),

  /**
   * Get current user session
   */
  me: protectedProcedure.query(({ ctx }) => {
    return {
      userId: ctx.userId,
      session: ctx.session,
    }
  }),

  /**
   * Refresh access token using refresh token
   * This implements token rotation for security
   */
  refresh: publicProcedure.mutation(async () => {
    // Get refresh token from cookie
    const refreshToken = await getRefreshCookie()

    if (!refreshToken) {
      throw new Error('No refresh token found')
    }

    try {
      // Rotate refresh token (generates new refresh + access tokens)
      const { refreshToken: newRefreshToken, accessToken: newAccessToken } =
        await rotateRefreshToken(refreshToken)

      // Set new cookies
      await setAuthCookie(newAccessToken)
      await setRefreshCookie(newRefreshToken)

      return {
        success: true,
        message: 'Tokens refreshed successfully',
      }
    } catch (error) {
      // Invalid/expired/revoked token - clear cookies
      await deleteAuthCookie()
      await deleteRefreshCookie()

      throw new Error('Failed to refresh token - please login again')
    }
  }),

  /**
   * Revoke all refresh tokens for current user (logout from all devices)
   */
  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    await revokeAllUserTokens(ctx.userId)

    // Audit log
    await createAuditLog({
      userId: ctx.userId,
      userEmail: ctx.session?.email || 'unknown',
      action: 'LOGOUT',
      entityType: 'auth',
      metadata: {
        type: 'all_sessions',
        name: ctx.session?.name,
        role: ctx.session?.role,
      },
    })

    // Delete current session cookies
    await deleteAuthCookie()
    await deleteRefreshCookie()

    return {
      success: true,
      message: 'All sessions revoked successfully',
    }
  }),

  /**
   * Get all users - ADMIN ONLY with pagination
   * SECURE: Now requires admin role and supports pagination
   */
  getAllUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { supabase } = await import('@/infra/supabase/client')
      const page = input?.page || 1
      const limit = input?.limit || 20
      const search = input?.search
      const offset = (page - 1) * limit

      // Build query
      let query = supabase
        .from('users')
        .select('id, email, name, outlet_id, role, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Add search if provided
      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`)
      }

      return {
        users: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }),

  /**
   * Request password reset - sends email with reset token
   */
  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const { supabase } = await import('@/infra/supabase/client')

      // Check if user exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', input.email)
        .single()

      // Security: Always return success even if user doesn't exist
      // to prevent email enumeration attacks
      if (error || !user) {
        console.log('⚠️ Password reset requested for non-existent email:', input.email)
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent',
        }
      }

      // Generate reset token
      const resetToken = generateResetToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

      // Save token to database
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
        })

      if (insertError) {
        console.error('❌ Failed to save reset token:', insertError)
        throw new Error('Failed to process password reset request')
      }

      // Send email
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetToken,
        })

        // Audit log
        await createAuditLog({
          userId: user.id,
          userEmail: user.email,
          action: 'PASSWORD_RESET_REQUEST',
          entityType: 'auth',
          metadata: {
            name: user.name,
          },
        })

        console.log('✅ Password reset email sent to:', user.email)
      } catch (emailError) {
        console.error('❌ Failed to send reset email:', emailError)
        // Don't throw error to user - security
      }

      return {
        success: true,
        message: 'If the email exists, a reset link has been sent',
      }
    }),

  /**
   * Verify reset token
   */
  verifyResetToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { supabase } = await import('@/infra/supabase/client')

      const { data: tokenData, error } = await supabase
        .from('password_reset_tokens')
        .select('id, user_id, expires_at, used_at')
        .eq('token', input.token)
        .single()

      if (error || !tokenData) {
        return { valid: false, message: 'Token tidak valid' }
      }

      // Check if already used
      if (tokenData.used_at) {
        return { valid: false, message: 'Token sudah digunakan' }
      }

      // Check if expired
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      if (now > expiresAt) {
        return { valid: false, message: 'Token sudah kadaluarsa' }
      }

      return { valid: true, userId: tokenData.user_id }
    }),

  /**
   * Reset password using token
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8, 'Password minimal 8 karakter'),
      })
    )
    .mutation(async ({ input }) => {
      const { supabase } = await import('@/infra/supabase/client')

      // Verify token first
      const { data: tokenData, error } = await supabase
        .from('password_reset_tokens')
        .select('id, user_id, expires_at, used_at')
        .eq('token', input.token)
        .single()

      if (error || !tokenData) {
        throw new Error('Token tidak valid')
      }

      // Check if already used
      if (tokenData.used_at) {
        throw new Error('Token sudah digunakan')
      }

      // Check if expired
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      if (now > expiresAt) {
        throw new Error('Token sudah kadaluarsa. Silakan request reset password lagi.')
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10)

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', tokenData.user_id)

      if (updateError) {
        console.error('❌ Failed to update password:', updateError)
        throw new Error('Gagal mengupdate password')
      }

      // Mark token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)

      // Get user info for audit log
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', tokenData.user_id)
        .single()

      // Audit log
      await createAuditLog({
        userId: tokenData.user_id,
        userEmail: user?.email || 'unknown',
        action: 'PASSWORD_RESET_COMPLETE',
        entityType: 'auth',
        metadata: {
          name: user?.name,
        },
      })

      // Revoke all refresh tokens for security (logout from all devices)
      await revokeAllUserTokens(tokenData.user_id)

      console.log('✅ Password reset successful for user:', tokenData.user_id)

      return {
        success: true,
        message: 'Password berhasil direset. Silakan login dengan password baru.',
      }
    }),
})
