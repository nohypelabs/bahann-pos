import { z } from 'zod'
import { router, superAdminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'

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
    .input(z.record(z.string(), z.string()))
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
      const platformUseCase = container.platformUseCase()
      const url = await platformUseCase.uploadQris(input.base64, input.fileName, ctx.userId)
      return { url }
    }),
})
