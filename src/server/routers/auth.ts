import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import { LoginUserUseCase } from '@/use-cases/auth/LoginUserUseCase'
import { RegisterUserUseCase } from '@/use-cases/auth/RegisterUserUseCase'
import { LogoutUserUseCase } from '@/use-cases/auth/LogoutUserUseCase'
import { BusinessProfile } from '@/domain/entities/BusinessProfile'
import { BUSINESS_TYPES } from '@/domain/catalog/value-objects/business-type'
import { setAuthCookie, deleteAuthCookie, setRefreshCookie, deleteRefreshCookie, getRefreshCookie } from '@/lib/cookies'
import { createAuditLog } from '@/lib/audit'
import { createRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '@/lib/refreshToken'
import { generateResetToken, sendNewUserNotification, sendWelcomeEmail, sendVerificationEmail } from '@/lib/email'
import { AppError } from '@/shared/exceptions/AppError'
import { checkRateLimit, RateLimitPresets } from '@/lib/security/rateLimiter'
import { logger } from '@/lib/logger'
import { container } from '@/infra/container'
import { supabaseAdmin } from '@/infra/supabase/server'

function getRequestIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }

  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

async function cleanupFailedRegistration(params: {
  tenantId: string
  userId?: string | null
  outletIds?: string[]
}) {
  const { tenantId, userId, outletIds = [] } = params

  if (outletIds.length > 0) {
    await supabaseAdmin.from('outlets').delete().in('id', outletIds)
  }

  if (userId) {
    await supabaseAdmin.from('business_profiles').delete().eq('user_id', userId)
    await supabaseAdmin.from('user_role_assignments').delete().eq('user_id', userId)
    await supabaseAdmin.from('users').delete().eq('id', userId)
  }

  await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
}

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
        storeName: z.string().min(1, 'Nama toko wajib diisi'),
        initialOutletNames: z.array(z.string().min(1)).optional(),
        whatsappNumber: z.string().min(9, 'Nomor WhatsApp tidak valid').regex(/^[0-9+\-\s()]+$/, 'Format nomor tidak valid'),
        businessType: z.enum(BUSINESS_TYPES as [string, ...string[]]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const requestIp = getRequestIp(ctx.req)
      const rateLimit = await checkRateLimit(`register:${requestIp}`, RateLimitPresets.REGISTER)

      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Terlalu banyak percobaan pendaftaran. Coba lagi dalam 15 menit.',
        })
      }

      const userId = crypto.randomUUID()
      let createdUserId: string | null = null
      let createdOutletIds: string[] = []

      try {
        const { error: tenantError } = await supabaseAdmin
          .from('tenants')
          .insert({
            id: userId,
            name: input.storeName,
            status: 'active',
            plan: 'free',
          })

        if (tenantError) {
          logger.error('Failed to create tenant:', tenantError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create tenant',
          })
        }

        const useCase = new RegisterUserUseCase(container.userRepository())
        const result = await useCase.execute({ ...input, id: userId, role: 'admin' })
        createdUserId = result.userId

        await supabaseAdmin
          .from('tenants')
          .update({ owner_user_id: userId })
          .eq('id', userId)

        await createAuditLog({
          userId: result.userId,
          userEmail: result.email,
          action: 'REGISTER',
          entityType: 'auth',
          metadata: { name: result.name, whatsappNumber: input.whatsappNumber, ipAddress: requestIp },
        })

        const verifyToken = generateResetToken()
        const regUseCase = container.completeRegistrationUseCase()
        const registration = await regUseCase.execute(
          result.userId,
          input.storeName,
          verifyToken,
          input.initialOutletNames ?? [],
        )
        createdOutletIds = registration.outletIds

        const { data: adminRole } = await supabaseAdmin
          .from('roles')
          .select('id')
          .eq('key', 'ADMIN_TENANT')
          .eq('is_system', true)
          .single()

        if (adminRole) {
          await supabaseAdmin
            .from('user_role_assignments')
            .insert({
              user_id: userId,
              tenant_id: userId,
              role_id: adminRole.id,
              scope_type: 'TENANT',
            })
        }

        const profile = BusinessProfile.createDefaults(
          result.userId,
          input.businessType as import('@/domain/catalog/value-objects/business-type').BusinessType,
          userId,
        )
        await container.businessProfileRepo().save(profile)

        sendVerificationEmail({
          to: result.email,
          name: result.name,
          token: verifyToken,
        }).catch(() => {})

        sendWelcomeEmail({
          to: result.email,
          name: result.name,
          storeName: input.storeName,
        }).catch(() => {})

        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
        if (adminEmail) {
          sendNewUserNotification({
            adminEmail,
            newUserName: result.name,
            newUserEmail: result.email,
            newUserWhatsapp: input.whatsappNumber,
          }).catch(() => {})
        }

        return {
          ...result,
          token: null,
        }
      } catch (error) {
        await cleanupFailedRegistration({
          tenantId: userId,
          userId: createdUserId,
          outletIds: createdOutletIds,
        }).catch((cleanupError) => {
          logger.error('Failed to cleanup partial registration state', cleanupError)
        })

        if (error instanceof AppError) {
          const code =
            error.statusCode === 400
              ? 'BAD_REQUEST'
              : error.statusCode === 401
                ? 'UNAUTHORIZED'
                : error.statusCode === 403
                  ? 'FORBIDDEN'
                  : error.statusCode === 409
                    ? 'CONFLICT'
                    : 'INTERNAL_SERVER_ERROR'

          throw new TRPCError({
            code,
            message: error.message,
          })
        }

        throw error
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
      // Rate limit: 5 login attempts per 15 minutes per email
      const rateLimitKey = `login:${input.email}`
      const rateLimit = await checkRateLimit(rateLimitKey, RateLimitPresets.LOGIN)
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
        })
      }

      const useCase = new LoginUserUseCase(container.userRepository())
      const result = await useCase.execute(input)

      // Check if tenant (or tenant's admin) is suspended
      const userRepo = container.userRepository()
      const suspension = await userRepo.getSuspensionStatus(result.user.id)

      if (suspension.isSuspended) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Akun Anda telah dinonaktifkan. Hubungi admin.' })
      }

      // If cashier, check if their admin (outlet owner) is suspended
      if (suspension.role === 'user' && suspension.outletId) {
        const ownerSuspended = await userRepo.isOwnerSuspended(suspension.outletId)
        if (ownerSuspended) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Akun bisnis Anda telah dinonaktifkan. Hubungi pemilik.' })
        }
      }

      // Create refresh token and set cookies in parallel
      const { refreshToken, accessToken } = await createRefreshToken(result.user.id)
      await Promise.all([setAuthCookie(accessToken), setRefreshCookie(refreshToken)])

      // Fire-and-forget audit log (non-critical, don't block response)
      createAuditLog({
        userId: result.user.id,
        userEmail: result.user.email,
        action: 'LOGIN',
        entityType: 'auth',
        metadata: { name: result.user.name, role: result.user.role },
      }).catch(() => {})

      return {
        ...result,
        token: accessToken,
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
   * Get current user's full profile (for receipt/nota and profile page)
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const useCase = container.getProfileUseCase()
    const profile = await useCase.execute({ userId: ctx.userId })
    return {
      ...profile,
      name: profile.name || ctx.session?.name || '',
      email: profile.email || ctx.session?.email || '',
      role: profile.role || ctx.session?.role || 'user',
      outletId: profile.outletId || ctx.session?.outletId || null,
      tenantId: profile.tenantId || ctx.session?.tenantId || null,
    }
  }),

  /**
   * Update current user's profile (name and whatsapp_number)
   */
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      whatsappNumber: z.string().regex(/^[0-9+\-\s()]*$/).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const useCase = container.updateProfileUseCase()
      await useCase.execute({
        userId: ctx.userId,
        name: input.name,
        whatsappNumber: input.whatsappNumber,
      })
      return { success: true }
    }),

  /**
   * Get current user's subscription plan
   */
  getPlan: protectedProcedure.query(async ({ ctx }) => {
    const plan = await container.userRepository().getPlan(ctx.userId)
    return { plan }
  }),

  /**
   * Refresh access token using refresh token
   * This implements token rotation for security
   */
  refresh: publicProcedure.mutation(async ({ ctx }) => {
    const rateLimitKey = `refresh:${getRequestIp(ctx.req)}`
    const rateLimit = await checkRateLimit(rateLimitKey, RateLimitPresets.REFRESH)
    if (!rateLimit.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Terlalu banyak permintaan refresh session. Coba lagi sebentar.',
      })
    }

    const useCase = container.refreshTokenUseCase()
    return await useCase.execute()
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
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1
      const limit = input?.limit || 20
      const search = input?.search
      const tenantId = ctx.session.tenantId

      const result = await container.userRepository().findAll({ page, limit, search, tenantId })

      return {
        users: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
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
      const normalizedEmail = input.email.trim().toLowerCase()
      const rateLimitKey = `password-reset:${normalizedEmail}`
      const rateLimit = await checkRateLimit(rateLimitKey, RateLimitPresets.PASSWORD_RESET)

      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit.',
        })
      }

      const useCase = container.requestPasswordResetUseCase()
      return await useCase.execute({ email: normalizedEmail })
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
      const useCase = container.verifyResetTokenUseCase()
      return await useCase.execute(input.token)
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
      try {
        const useCase = container.resetPasswordUseCase()
        return await useCase.execute({ token: input.token, newPassword: input.newPassword })
      } catch (error) {
        if (error instanceof AppError) {
          throw new TRPCError({
            code: error.statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR',
            message: error.message,
          })
        }
        throw error
      }
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const useCase = container.verifyEmailUseCase()
      return await useCase.execute(input.token)
    }),

  resendVerification: protectedProcedure.mutation(async ({ ctx }) => {
    const useCase = container.resendVerificationUseCase()
    return await useCase.execute(ctx.userId)
  }),

  getEmailVerified: protectedProcedure.query(async ({ ctx }) => {
    const useCase = container.getEmailVerifiedUseCase()
    return await useCase.execute(ctx.userId)
  }),
})
