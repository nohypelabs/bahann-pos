/**
 * Stock Alerts Router
 * Handles inventory alerts and notifications
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { getUserOutletIds } from '@/server/lib/tenant'
import { TRPCError } from '@trpc/server'

export const stockAlertsRouter = router({
  /**
   * Get active alerts for an outlet
   */
  getActive: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.stockAlertUseCase()
      return uc.getActive(tenantOutlets, input.outletId)
    }),

  /**
   * Generate alerts (run periodically or on-demand)
   */
  generate: adminProcedure.mutation(async ({ ctx }) => {
    const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
    const uc = container.stockAlertUseCase()

    try {
      const alertsGenerated = await uc.generate(tenantOutlets)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'stock_alert',
        metadata: { alertsGenerated },
      })

      return { alertsGenerated }
    } catch {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate stock alerts' })
    }
  }),

  /**
   * Acknowledge alert
   */
  acknowledge: protectedProcedure
    .input(z.object({ alertId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.stockAlertUseCase()

      try {
        await uc.acknowledge(input.alertId, ctx.userId, tenantOutlets)
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found' })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'stock_alert',
        entityId: input.alertId,
        metadata: { action: 'acknowledge' },
      })

      return { success: true }
    }),

  /**
   * Acknowledge all alerts for a product
   */
  acknowledgeByProduct: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        outletId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.stockAlertUseCase()
      await uc.acknowledgeByProduct(input.productId, tenantOutlets, input.outletId)
      return { success: true }
    }),

  /**
   * Get alert history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        productId: z.string().uuid().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.stockAlertUseCase()
      return uc.getHistory(tenantOutlets, input)
    }),

  /**
   * Get alert summary by type
   */
  getSummary: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.stockAlertUseCase()
      return uc.getSummary(tenantOutlets, input.outletId)
    }),

  /**
   * Update product reorder settings
   */
  updateReorderSettings: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        reorderPoint: z.number().min(0).optional(),
        reorderQuantity: z.number().min(1).optional(),
        leadTimeDays: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const uc = container.stockAlertUseCase()

      try {
        await uc.updateReorderSettings(input.productId, {
          reorderPoint: input.reorderPoint,
          reorderQuantity: input.reorderQuantity,
          leadTimeDays: input.leadTimeDays,
        }, tenantId)
      } catch (e) {
        if ((e as Error).message.includes('Access denied')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'product',
        entityId: input.productId,
        changes: { reorderSettings: { reorderPoint: input.reorderPoint, reorderQuantity: input.reorderQuantity, leadTimeDays: input.leadTimeDays } },
      })

      return { success: true }
    }),
})
