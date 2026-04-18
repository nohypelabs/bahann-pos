/**
 * Users Router
 * Handles user management and permissions
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'

export const usersRouter = router({
  /**
   * List users scoped to the current admin's tenant (their outlets)
   */
  list: adminProcedure.query(async ({ ctx }) => {
    // Get all outlet IDs owned by this admin
    const { data: outlets } = await supabase
      .from('outlets')
      .select('id')
      .eq('owner_id', ctx.userId)

    const outletIds = outlets?.map(o => o.id) || []

    // Fetch admin themselves + all users assigned to their outlets
    let query = supabase
      .from('users')
      .select('id, email, name, role, outlet_id, permissions, created_at')
      .order('created_at', { ascending: false })

    if (outletIds.length > 0) {
      query = query.or(`id.eq.${ctx.userId},outlet_id.in.(${outletIds.join(',')})`)
    } else {
      query = query.eq('id', ctx.userId)
    }

    const { data, error } = await query

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch users: ${error.message}`,
      })
    }

    return data || []
  }),

  /**
   * Create a cashier account linked to one of the admin's outlets
   */
  createCashier: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        whatsappNumber: z.string().min(9).regex(/^[0-9+\-\s()]+$/),
        outletId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the outlet belongs to this admin
      const { data: outlet } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('id', input.outletId)
        .eq('owner_id', ctx.userId)
        .single()

      if (!outlet) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Outlet tidak ditemukan atau bukan milik Anda',
        })
      }

      // Check email not taken
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .single()

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email sudah digunakan',
        })
      }

      const passwordHash = await bcrypt.hash(input.password, 10)

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: input.email.toLowerCase(),
          name: input.name,
          password_hash: passwordHash,
          whatsapp_number: input.whatsappNumber,
          role: 'user',
          outlet_id: input.outletId,
        })
        .select('id, email, name, role, outlet_id')
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Gagal membuat akun kasir: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'user',
        entityId: newUser.id,
        changes: { created: { name: input.name, email: input.email, outletId: input.outletId } },
        metadata: { role: 'user', outletName: outlet.name },
      })

      return newUser
    }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Users can only view their own profile unless they're admin
      if (input.id !== ctx.userId && ctx.session?.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own profile',
        })
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, outlet_id, permissions, created_at')
        .eq('id', input.id)
        .single()

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      return data
    }),

  /**
   * Get current user's permissions
   */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from('users')
      .select('permissions, role')
      .eq('id', ctx.userId)
      .single()

    if (error) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    return {
      permissions: data.permissions || {},
      role: data.role,
    }
  }),

  /**
   * Update user permissions (admin only)
   */
  updatePermissions: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        permissions: z.object({
          canVoidTransactions: z.boolean().optional(),
          canGiveDiscount: z.boolean().optional(),
          maxDiscountPercent: z.number().min(0).max(100).optional(),
          canCloseDay: z.boolean().optional(),
          canManageUsers: z.boolean().optional(),
          canEditPrices: z.boolean().optional(),
          canManagePromotions: z.boolean().optional(),
          canViewReports: z.boolean().optional(),
          canManageInventory: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get current permissions
      const { data: currentUser } = await supabase
        .from('users')
        .select('permissions')
        .eq('id', input.userId)
        .single()

      const currentPermissions = currentUser?.permissions || {}

      // Merge with new permissions
      const updatedPermissions = {
        ...currentPermissions,
        ...input.permissions,
      }

      const { error } = await supabase
        .from('users')
        .update({ permissions: updatedPermissions })
        .eq('id', input.userId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update permissions: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: {
          before: { permissions: currentPermissions },
          after: { permissions: updatedPermissions },
        },
      })

      return { success: true }
    }),

  /**
   * Update user role (admin only)
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['admin', 'manager', 'cashier', 'user']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', input.userId)
        .single()

      const { error } = await supabase
        .from('users')
        .update({ role: input.role })
        .eq('id', input.userId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update role: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: {
          before: { role: currentUser?.role },
          after: { role: input.role },
        },
      })

      return { success: true }
    }),

  /**
   * Check if current user has specific permission
   */
  checkPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ input, ctx }) => {
      // Admins have all permissions
      if (ctx.session?.role === 'admin') {
        return { hasPermission: true }
      }

      const { data, error } = await supabase
        .from('users')
        .select('permissions')
        .eq('id', ctx.userId)
        .single()

      if (error) {
        return { hasPermission: false }
      }

      const permissions = data?.permissions || {}
      return { hasPermission: !!permissions[input.permission] }
    }),
})
