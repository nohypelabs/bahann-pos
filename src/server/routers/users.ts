/**
 * Users Router
 * Handles user management with RBAC role assignments
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure, superAdminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { supabaseAdmin } from '@/infra/supabase/server'
import { TRPCError } from '@trpc/server'
import { sendPlanUpgradeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

export const usersRouter = router({
  /**
   * List all users in the tenant with RBAC role assignments
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.tenantId!

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, name, email, role, outlet_id, tenant_id, is_active, created_at,
        outlet:outlets!outlet_id(id, name),
        user_role_assignments(
          id, scope_type, outlet_id, outlet_group_id,
          role:roles!role_id(id, key, name)
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    // Get outlet groups for area manager assignments
    const { data: outletGroups } = await supabaseAdmin
      .from('outlet_groups')
      .select('id, name')
      .eq('tenant_id', tenantId)

    return (users || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      outlet_id: u.outlet_id,
      is_active: u.is_active,
      created_at: u.created_at,
      outlet_name: (u.outlet as any)?.name || null,
      rbac_roles: (u.user_role_assignments || []).map((ura: any) => ({
        id: ura.id,
        role_key: ura.role?.key || null,
        role_name: ura.role?.name || null,
        scope_type: ura.scope_type,
        outlet_id: ura.outlet_id,
        outlet_group_id: ura.outlet_group_id,
      })),
    }))
  }),

  /**
   * Get available roles for user creation
   */
  getRoles: adminProcedure.query(async ({ ctx }) => {
    const { data: roles } = await supabaseAdmin
      .from('roles')
      .select('id, key, name, description')
      .eq('is_system', true)
      .is('tenant_id', null)
      .order('key')

    return roles || []
  }),

  /**
   * Get outlet groups for the tenant
   */
  getOutletGroups: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.tenantId!

    const { data: groups } = await supabaseAdmin
      .from('outlet_groups')
      .select(`
        id, name, description,
        members:outlet_group_members(outlet_id)
      `)
      .eq('tenant_id', tenantId)
      .order('name')

    return (groups || []).map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      outlet_ids: (g.members || []).map((m: any) => m.outlet_id),
    }))
  }),

  /**
   * Create a new user with RBAC role assignment (universal)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        whatsappNumber: z.string().min(9).regex(/^[0-9+\-\s()]+$/).optional(),
        roleKey: z.enum(['ADMIN_TENANT', 'AREA_MANAGER', 'STORE_MANAGER', 'CASHIER', 'AUDITOR']),
        scopeType: z.enum(['TENANT', 'OUTLET', 'OUTLET_GROUP']).optional(),
        outletId: z.string().uuid().optional(),
        outletGroupId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Determine scope type from role if not provided
      const scopeType = input.scopeType || (() => {
        switch (input.roleKey) {
          case 'ADMIN_TENANT':
          case 'AUDITOR':
            return 'TENANT'
          case 'AREA_MANAGER':
            return 'OUTLET_GROUP'
          case 'STORE_MANAGER':
          case 'CASHIER':
            return 'OUTLET'
          default:
            return 'TENANT'
        }
      })()

      // Validate scope matches role
      if (input.roleKey === 'AREA_MANAGER' && scopeType !== 'OUTLET_GROUP') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Area Manager harus pakai OUTLET_GROUP scope' })
      }
      if ((input.roleKey === 'STORE_MANAGER' || input.roleKey === 'CASHIER') && scopeType !== 'OUTLET') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Store Manager / Kasir harus pakai OUTLET scope' })
      }
      if (scopeType === 'OUTLET' && !input.outletId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pilih outlet untuk role ini' })
      }
      if (scopeType === 'OUTLET_GROUP' && !input.outletGroupId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pilih outlet group untuk role ini' })
      }

      // Check email uniqueness
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .single()

      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email sudah digunakan' })
      }

      // If OUTLET scope, verify outlet belongs to tenant
      if (input.outletId) {
        const { data: outlet } = await supabaseAdmin
          .from('outlets')
          .select('id')
          .eq('id', input.outletId)
          .eq('tenant_id', tenantId)
          .single()

        if (!outlet) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet tidak ditemukan di tenant ini' })
        }
      }

      // Get role ID
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('key', input.roleKey)
        .eq('is_system', true)
        .is('tenant_id', null)
        .single()

      if (!role) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Role ${input.roleKey} tidak ditemukan` })
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12)

      // Create user
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          name: input.name,
          email: input.email.toLowerCase(),
          password_hash: passwordHash,
          tenant_id: tenantId,
          role: input.roleKey === 'ADMIN_TENANT' ? 'admin' : input.roleKey === 'CASHIER' ? 'user' : 'manager',
          outlet_id: scopeType === 'OUTLET' ? input.outletId : null,
          whatsapp_number: input.whatsappNumber || null,
        })
        .select('id, name, email, role, tenant_id, outlet_id')
        .single()

      if (userError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message })
      }

      // Create RBAC role assignment
      const { error: assignmentError } = await supabaseAdmin
        .from('user_role_assignments')
        .insert({
          tenant_id: tenantId,
          user_id: newUser.id,
          role_id: role.id,
          scope_type: scopeType,
          outlet_id: scopeType === 'OUTLET' ? input.outletId : null,
          outlet_group_id: scopeType === 'OUTLET_GROUP' ? input.outletGroupId : null,
        })

      if (assignmentError) {
        // Rollback: delete user if assignment fails
        await supabaseAdmin.from('users').delete().eq('id', newUser.id)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: assignmentError.message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'user',
        entityId: newUser.id,
        changes: {
          created: {
            name: input.name,
            email: input.email,
            roleKey: input.roleKey,
            scopeType,
            outletId: input.outletId,
            outletGroupId: input.outletGroupId,
          },
        },
      })

      return newUser
    }),

  /**
   * Update user's RBAC role assignment
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        roleKey: z.enum(['ADMIN_TENANT', 'AREA_MANAGER', 'STORE_MANAGER', 'CASHIER', 'AUDITOR']),
        scopeType: z.enum(['TENANT', 'OUTLET', 'OUTLET_GROUP']).optional(),
        outletId: z.string().uuid().optional(),
        outletGroupId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Get role ID
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('key', input.roleKey)
        .eq('is_system', true)
        .is('tenant_id', null)
        .single()

      if (!role) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Role ${input.roleKey} tidak ditemukan` })
      }

      // Determine scope
      const scopeType = input.scopeType || (() => {
        switch (input.roleKey) {
          case 'ADMIN_TENANT': case 'AUDITOR': return 'TENANT'
          case 'AREA_MANAGER': return 'OUTLET_GROUP'
          case 'STORE_MANAGER': case 'CASHIER': return 'OUTLET'
          default: return 'TENANT'
        }
      })()

      // Delete old assignments
      await supabaseAdmin
        .from('user_role_assignments')
        .delete()
        .eq('user_id', input.userId)
        .eq('tenant_id', tenantId)

      // Create new assignment
      const { error } = await supabaseAdmin
        .from('user_role_assignments')
        .insert({
          tenant_id: tenantId,
          user_id: input.userId,
          role_id: role.id,
          scope_type: scopeType,
          outlet_id: scopeType === 'OUTLET' ? input.outletId : null,
          outlet_group_id: scopeType === 'OUTLET_GROUP' ? input.outletGroupId : null,
        })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Also update legacy role column for backward compat
      await supabaseAdmin
        .from('users')
        .update({
          role: input.roleKey === 'ADMIN_TENANT' ? 'admin' : input.roleKey === 'CASHIER' ? 'user' : 'manager',
          outlet_id: scopeType === 'OUTLET' ? input.outletId : null,
        })
        .eq('id', input.userId)
        .eq('tenant_id', tenantId)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user_role_assignment',
        entityId: input.userId,
        changes: { roleKey: input.roleKey, scopeType, outletId: input.outletId },
      })

      return { success: true }
    }),

  /**
   * Legacy createCashier endpoint (backward compat)
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
      const tenantId = ctx.session.tenantId!

      // Check email uniqueness
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .single()

      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email sudah digunakan' })
      }

      // Get CASHIER role
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('key', 'CASHIER')
        .eq('is_system', true)
        .is('tenant_id', null)
        .single()

      const passwordHash = await bcrypt.hash(input.password, 12)

      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          name: input.name,
          email: input.email.toLowerCase(),
          password_hash: passwordHash,
          tenant_id: tenantId,
          role: 'user',
          outlet_id: input.outletId,
          whatsapp_number: input.whatsappNumber,
        })
        .select('id, name, email, role, tenant_id, outlet_id')
        .single()

      if (userError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message })
      }

      // Create RBAC assignment
      if (role) {
        await supabaseAdmin
          .from('user_role_assignments')
          .insert({
            tenant_id: tenantId,
            user_id: newUser.id,
            role_id: role.id,
            scope_type: 'OUTLET',
            outlet_id: input.outletId,
          })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'user',
        entityId: newUser.id,
        changes: { created: { name: input.name, email: input.email, outletId: input.outletId } },
        metadata: { role: 'CASHIER' },
      })

      return newUser
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      try {
        return await uc.getById(input.id, ctx.userId, ctx.session?.role)
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('own profile')) throw new TRPCError({ code: 'FORBIDDEN', message: msg })
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }
    }),

  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.getMyPermissions(ctx.userId)
    } catch {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    }
  }),

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
      const uc = container.userManagementUseCase()
      let result
      try {
        result = await uc.updatePermissions(input.userId, input.permissions)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: { before: { permissions: result.before }, after: { permissions: result.after } },
      })

      return { success: true }
    }),

  listAllAdmins: superAdminProcedure.query(async () => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.listAllAdmins()
    } catch (e) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
    }
  }),

  updatePlan: superAdminProcedure
    .input(z.object({
      userId: z.string().uuid(),
      plan: z.enum(['free', 'warung', 'starter', 'professional', 'business', 'enterprise']),
      amount: z.number().int().min(0).optional(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      let result
      try {
        result = await uc.updatePlan(input.userId, input.plan, input.amount ?? 0, input.note, ctx.userId)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: { before: { plan: result.before.plan }, after: { plan: result.after.plan } },
        metadata: { targetEmail: result.before.email, targetName: result.before.name, amount: input.amount, note: input.note },
      })

      if (result.before.email && result.before.name) {
        await sendPlanUpgradeEmail({
          to: result.before.email,
          name: result.before.name,
          oldPlan: result.before.plan,
          newPlan: input.plan,
        })
      }

      return { success: true }
    }),

  getBillingHistory: protectedProcedure.query(async ({ ctx }) => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.getBillingHistory(ctx.userId)
    } catch (e) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
    }
  }),

  checkPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      const hasPermission = await uc.checkPermission(ctx.userId, input.permission, ctx.session?.role)
      return { hasPermission }
    }),

  /**
   * Set or update PIN code for the current user (kepala toko / admin)
   * PIN is 4-6 digits, stored as bcrypt hash
   */
  setPin: protectedProcedure
    .input(
      z.object({
        pin: z.string().min(4, 'PIN minimal 4 digit').max(6, 'PIN maksimal 6 digit').regex(/^\d+$/, 'PIN harus angka'),
        currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Verify current password
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, password_hash')
        .eq('id', ctx.userId)
        .eq('tenant_id', tenantId)
        .single()

      if (userError || !user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan' })
      }

      const passwordValid = await bcrypt.compare(input.currentPassword, user.password_hash)
      if (!passwordValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password saat ini salah' })
      }

      // Hash PIN
      const pinHash = await bcrypt.hash(input.pin, 10)

      // Update PIN
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ pin_code_hash: pinHash })
        .eq('id', ctx.userId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: ctx.userId,
        changes: { pin_set: true },
      })

      return { success: true, message: 'PIN berhasil diset' }
    }),

  /**
   * Check if current user has a PIN set
   */
  hasPin: protectedProcedure.query(async ({ ctx }) => {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('pin_code_hash')
      .eq('id', ctx.userId)
      .single()

    return { hasPin: !!user?.pin_code_hash }
  }),

  /**
   * Verify a user's PIN (used during approval flow)
   * Accepts targetUserId to verify kepala toko's PIN, not the requester's
   */
  verifyPin: protectedProcedure
    .input(
      z.object({
        pin: z.string().min(4).max(6).regex(/^\d+$/, 'PIN harus angka'),
        targetUserId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: targetUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, pin_code_hash, name')
        .eq('id', input.targetUserId)
        .eq('tenant_id', tenantId)
        .single()

      if (userError || !targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan' })
      }

      if (!targetUser.pin_code_hash) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'User belum mengatur PIN' })
      }

      const pinValid = await bcrypt.compare(input.pin, targetUser.pin_code_hash)
      if (!pinValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN salah' })
      }

      return { valid: true, userName: targetUser.name }
    }),
})
