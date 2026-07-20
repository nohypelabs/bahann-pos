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
import { getLimits, isUnlimited } from '@/lib/plans'
import bcrypt from 'bcryptjs'

const roleKeySchema = z.enum(['ADMIN_TENANT', 'AREA_MANAGER', 'STORE_MANAGER', 'CASHIER', 'AUDITOR'])
const scopeTypeSchema = z.enum(['TENANT', 'OUTLET', 'OUTLET_GROUP'])

type ManagedRoleKey = z.infer<typeof roleKeySchema>
type RoleScopeType = z.infer<typeof scopeTypeSchema>

function resolveScopeType(roleKey: ManagedRoleKey, scopeType?: RoleScopeType): RoleScopeType {
  if (scopeType) return scopeType

  switch (roleKey) {
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
}

async function enforceCashierPlanLimit(
  tenantId: string,
  roleKey: ManagedRoleKey,
  userIdToExclude?: string,
): Promise<void> {
  if (roleKey !== 'CASHIER') return

  if (userIdToExclude) {
    const { data: existingAssignment } = await supabaseAdmin
      .from('user_role_assignments')
      .select('role:roles!role_id(key)')
      .eq('tenant_id', tenantId)
      .eq('user_id', userIdToExclude)
      .maybeSingle()

    if ((existingAssignment as any)?.role?.key === 'CASHIER') {
      return
    }
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('owner_user_id, plan')
    .eq('id', tenantId)
    .maybeSingle()

  let plan = (tenant?.plan as string) || 'free'
  if (tenant?.owner_user_id) {
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', tenant.owner_user_id)
      .maybeSingle()

    if (owner?.plan) plan = owner.plan as string
  }

  const limits = getLimits(plan)
  if (isUnlimited(limits.maxCashiers)) return

  const { data: cashierRole } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('key', 'CASHIER')
    .eq('is_system', true)
    .is('tenant_id', null)
    .single()

  if (!cashierRole) return

  const { count } = await supabaseAdmin
    .from('user_role_assignments')
    .select('*', { count: 'estimated', head: true })
    .eq('tenant_id', tenantId)
    .eq('role_id', cashierRole.id)

  if ((count ?? 0) >= limits.maxCashiers) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Plan kamu hanya mendukung ${limits.maxCashiers} kasir. Upgrade untuk menambah lebih banyak.`,
    })
  }
}

async function validateRoleScope(params: {
  tenantId: string
  roleKey: ManagedRoleKey
  scopeType: RoleScopeType
  outletId?: string
  outletGroupId?: string
}): Promise<void> {
  const { tenantId, roleKey, scopeType, outletId, outletGroupId } = params

  if (roleKey === 'AREA_MANAGER' && scopeType !== 'OUTLET_GROUP') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Area Manager harus pakai OUTLET_GROUP scope' })
  }

  if ((roleKey === 'STORE_MANAGER' || roleKey === 'CASHIER') && scopeType !== 'OUTLET') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Store Manager / Kasir harus pakai OUTLET scope' })
  }

  if ((roleKey === 'ADMIN_TENANT' || roleKey === 'AUDITOR') && scopeType !== 'TENANT') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Role ini harus pakai TENANT scope' })
  }

  if (scopeType === 'OUTLET') {
    if (!outletId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pilih outlet untuk role ini' })
    }

    const { data: outlet } = await supabaseAdmin
      .from('outlets')
      .select('id')
      .eq('id', outletId)
      .eq('tenant_id', tenantId)
      .single()

    if (!outlet) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet tidak ditemukan di tenant ini' })
    }
  }

  if (scopeType === 'OUTLET_GROUP') {
    if (!outletGroupId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pilih outlet group untuk role ini' })
    }

    const { data: outletGroup } = await supabaseAdmin
      .from('outlet_groups')
      .select('id')
      .eq('id', outletGroupId)
      .eq('tenant_id', tenantId)
      .single()

    if (!outletGroup) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet group tidak ditemukan di tenant ini' })
    }
  }
}

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

    const outletGroupNameById = new Map((outletGroups || []).map(group => [group.id, group.name]))

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
        outlet_group_name: ura.outlet_group_id ? outletGroupNameById.get(ura.outlet_group_id) || null : null,
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
        password: z.string().min(8).optional(),
        sendInvite: z.boolean().default(false),
        whatsappNumber: z.string().min(9).regex(/^[0-9+\-\s()]+$/).optional(),
        roleKey: roleKeySchema,
        scopeType: scopeTypeSchema.optional(),
        outletId: z.string().uuid().optional(),
        outletGroupId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const scopeType = resolveScopeType(input.roleKey, input.scopeType)

      if (!input.sendInvite && !input.password) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Password wajib diisi jika undangan email dimatikan' })
      }

      await validateRoleScope({
        tenantId,
        roleKey: input.roleKey,
        scopeType,
        outletId: input.outletId,
        outletGroupId: input.outletGroupId,
      })

      await enforceCashierPlanLimit(tenantId, input.roleKey)

      // Check email uniqueness
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .single()

      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email sudah digunakan' })
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

      const passwordHash = await bcrypt.hash(input.password || crypto.randomUUID(), 12)

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

      if (input.sendInvite) {
        await container.requestPasswordResetUseCase().execute({ email: newUser.email })
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
            sendInvite: input.sendInvite,
          },
        },
      })

      return {
        ...newUser,
        inviteSent: input.sendInvite,
      }
    }),

  /**
   * Update user's RBAC role assignment
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        roleKey: roleKeySchema,
        scopeType: scopeTypeSchema.optional(),
        outletId: z.string().uuid().optional(),
        outletGroupId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: targetUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', input.userId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan di tenant ini' })
      }

      const scopeType = resolveScopeType(input.roleKey, input.scopeType)

      await validateRoleScope({
        tenantId,
        roleKey: input.roleKey,
        scopeType,
        outletId: input.outletId,
        outletGroupId: input.outletGroupId,
      })

      await enforceCashierPlanLimit(tenantId, input.roleKey, input.userId)

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
        changes: { roleKey: input.roleKey, scopeType, outletId: input.outletId, outletGroupId: input.outletGroupId },
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
        password: z.string().min(8).optional(),
        sendInvite: z.boolean().default(false),
        whatsappNumber: z.string().min(9).regex(/^[0-9+\-\s()]+$/),
        outletId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      if (!input.sendInvite && !input.password) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Password wajib diisi jika undangan email dimatikan' })
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

      await validateRoleScope({
        tenantId,
        roleKey: 'CASHIER',
        scopeType: 'OUTLET',
        outletId: input.outletId,
      })

      await enforceCashierPlanLimit(tenantId, 'CASHIER')

      // Get CASHIER role
      const { data: role } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('key', 'CASHIER')
        .eq('is_system', true)
        .is('tenant_id', null)
        .single()

      const passwordHash = await bcrypt.hash(input.password || crypto.randomUUID(), 12)

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

      if (input.sendInvite) {
        await container.requestPasswordResetUseCase().execute({ email: newUser.email })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'user',
        entityId: newUser.id,
        changes: { created: { name: input.name, email: input.email, outletId: input.outletId, sendInvite: input.sendInvite } },
        metadata: { role: 'CASHIER' },
      })

      return {
        ...newUser,
        inviteSent: input.sendInvite,
      }
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
