/**
 * Audit Logs Router
 * Handles viewing and filtering audit trail for compliance
 */

import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { TRPCError } from '@trpc/server'

export const auditRouter = router({
  /**
   * Get audit logs with filtering and pagination
   */
  getLogs: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        searchQuery: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const uc = container.auditUseCase()
      const tenantUserIds = await uc.getTenantUserIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      return uc.getLogs(tenantUserIds, input)
    }),

  /**
   * Get audit log by ID with full details
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const uc = container.auditUseCase()
      const tenantUserIds = await uc.getTenantUserIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      try {
        return await uc.getById(input.id, tenantUserIds)
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Audit log not found' })
      }
    }),

  /**
   * Get summary statistics for audit logs
   */
  getStats: adminProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const uc = container.auditUseCase()
      const tenantUserIds = await uc.getTenantUserIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      return uc.getStats(tenantUserIds, input)
    }),

  /**
   * Get distinct values for filters
   */
  getFilterOptions: adminProcedure.query(async ({ ctx }) => {
    const uc = container.auditUseCase()
    const tenantUserIds = await uc.getTenantUserIds(ctx.userId, ctx.session.role, ctx.session.outletId)
    return uc.getFilterOptions(tenantUserIds)
  }),
})
