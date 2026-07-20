import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, superAdminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { AppError } from '@/shared/exceptions/AppError'

const optionalTextSetting = (max: number) => z.string().trim().max(max)
const optionalUrlSetting = (max: number) => z.union([z.literal(''), z.string().trim().url().max(max)])
const optionalPhoneSetting = (max: number) =>
  z.string().trim().max(max).regex(/^[0-9+\-\s()]*$/, 'Format nomor tidak valid')

const platformSettingsSchema = z.object({
  solana_wallet_address: optionalTextSetting(120),
  solana_rpc_url: optionalUrlSetting(500),
  bank_name: optionalTextSetting(120),
  bank_account: z.string().trim().max(64).regex(/^[0-9\s-]*$/, 'Nomor rekening tidak valid'),
  bank_holder: optionalTextSetting(120),
  support_wa: optionalPhoneSetting(32),
  qris_image_url: optionalUrlSetting(1000),
}).strict()

export const superAdminRouter = router({
  globalStats: superAdminProcedure.query(async () => {
    const platformUseCase = container.platformUseCase()
    return platformUseCase.getGlobalStats()
  }),

  listTenants: superAdminProcedure
    .input(z.object({
      search: z.string().optional(),
      plan: z.string().optional(),
      suspended: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const platformUseCase = container.platformUseCase()
      return platformUseCase.listTenants({
        search: input?.search,
        plan: input?.plan,
        suspended: input?.suspended,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      })
    }),

  getTenantDetail: superAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input }) => {
      const platformUseCase = container.platformUseCase()
      return platformUseCase.getTenantDetail(input.tenantId)
    }),

  suspendTenant: superAdminProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      suspend: z.boolean(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const platformUseCase = container.platformUseCase()

      const tenant = await platformUseCase.getTenantDetail(input.tenantId)

      await platformUseCase.suspendTenant(input.tenantId, input.suspend)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: input.suspend ? 'SUSPEND' : 'ACTIVATE',
        entityType: 'tenant',
        entityId: input.tenantId,
        changes: {
          before: { is_suspended: tenant.is_suspended },
          after: { is_suspended: input.suspend },
        },
        metadata: { tenantEmail: tenant.email, reason: input.reason },
      })

      return { success: true }
    }),

  getGrowthChart: superAdminProcedure
    .input(z.object({ days: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      const platformUseCase = container.platformUseCase()
      return platformUseCase.getGrowthChart(input?.days ?? 30)
    }),

  getSettings: superAdminProcedure.query(async () => {
    const platformUseCase = container.platformUseCase()
    return platformUseCase.getSettings()
  }),

  updateSettings: superAdminProcedure
    .input(platformSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const platformUseCase = container.platformUseCase()
      await platformUseCase.updateSettings(input, ctx.userId)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'tenant',
        changes: input,
        metadata: { scope: 'platform_settings' },
      })

      return { success: true }
    }),

  uploadQris: superAdminProcedure
    .input(z.object({
      base64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const platformUseCase = container.platformUseCase()
        const url = await platformUseCase.uploadQris(input.base64, input.fileName, ctx.userId)
        return { url }
      } catch (error) {
        if (error instanceof AppError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }
        throw error
      }
    }),

  /**
   * List all users across all tenants (superadmin only)
   */
  listAllUsers: superAdminProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.enum(['admin', 'super_admin', 'user', 'manager', 'owner']).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const { supabaseAdmin } = await import('@/infra/supabase/server')

      let query = supabaseAdmin
        .from('users')
        .select(`
          id, name, email, role, outlet_id, is_active, created_at,
          outlet:outlets!outlet_id(id, name, owner_id),
          owner:outlets!outlet_id(owner_id)
        `)
        .order('created_at', { ascending: false })
        .range(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 50) - 1)

      if (input?.search) {
        query = query.or(`name.ilike.%${input.search}%,email.ilike.%${input.search}%`)
      }
      if (input?.role) {
        query = query.eq('role', input.role)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)

      // Get total count
      let countQuery = supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (input?.search) {
        countQuery = countQuery.or(`name.ilike.%${input.search}%,email.ilike.%${input.search}%`)
      }
      if (input?.role) {
        countQuery = countQuery.eq('role', input.role)
      }

      const { count } = await countQuery

      return {
        users: data || [],
        total: count || 0,
      }
    }),

  /**
   * Update any user's role (superadmin only)
   */
  updateUserRole: superAdminProcedure
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(['admin', 'super_admin', 'user', 'manager', 'owner']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { supabaseAdmin } = await import('@/infra/supabase/server')

      // Get current user data
      const { data: currentUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role')
        .eq('id', input.userId)
        .single()

      if (fetchError || !currentUser) {
        throw new Error('User not found')
      }

      // Prevent self-demotion
      if (input.userId === ctx.userId && input.role !== 'super_admin') {
        throw new Error('Cannot change your own superadmin role')
      }

      // Update role
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: input.role })
        .eq('id', input.userId)

      if (updateError) throw new Error(updateError.message)

      // Audit log
      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: {
          before: { role: currentUser.role },
          after: { role: input.role },
        },
        metadata: { targetUser: currentUser.email },
      })

      return {
        success: true,
        message: `Role ${currentUser.name} diubah ke ${input.role}`,
      }
    }),
})
