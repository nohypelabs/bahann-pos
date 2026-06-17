/**
 * Cash Sessions Router
 * Handles opening/closing day and EOD reports
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { getUserOutletIds } from '@/server/lib/tenant'
import { TRPCError } from '@trpc/server'

export const cashSessionsRouter = router({
  /**
   * Open cash session (start of day)
   */
  open: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        openingCash: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      if (tenantId) {
        const { assertOutletBelongsToTenant } = await import('@/server/lib/tenant')
        await assertOutletBelongsToTenant(ctx.userId, tenantId, input.outletId)
      }

      const uc = container.cashSessionUseCase()
      let data
      try {
        data = await uc.open(input.outletId, ctx.userId, input.openingCash)
      } catch (e) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'cash_session',
        entityId: data.id,
        changes: { session: data },
        metadata: { action: 'open', openingCash: input.openingCash },
      })

      return data
    }),

  /**
   * Close cash session (end of day)
   */
  close: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        closingCash: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.cashSessionUseCase()

      let result
      try {
        result = await uc.close(input.sessionId, ctx.userId, input.closingCash, input.notes, tenantOutlets)
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('not found')) throw new TRPCError({ code: 'NOT_FOUND', message: msg })
        if (msg.includes('already closed')) throw new TRPCError({ code: 'BAD_REQUEST', message: msg })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'cash_session',
        entityId: input.sessionId,
        changes: {
          before: { status: 'open' },
          after: { status: 'closed', difference: result.difference },
        },
        metadata: { action: 'close', difference: result.difference },
      })

      return result
    }),

  /**
   * Get current open session for an outlet
   */
  getCurrent: protectedProcedure
    .input(z.object({ outletId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      if (tenantId) {
        const { assertOutletBelongsToTenant } = await import('@/server/lib/tenant')
        await assertOutletBelongsToTenant(ctx.userId, tenantId, input.outletId)
      }

      const uc = container.cashSessionUseCase()
      return uc.getCurrent(input.outletId)
    }),

  /**
   * Get EOD report for a session
   */
  getReport: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.cashSessionUseCase()

      try {
        const session = await uc.getReport(input.sessionId, tenantOutlets)
        const txRepo = container.transactionRepo()
        const { transactions } = await txRepo.findByOutletIds(
          [session.outlet_id],
          {
            dateFrom: session.opened_at,
            dateTo: session.closed_at || new Date().toISOString(),
            limit: 1000,
          },
        )

        return {
          session,
          transactions,
        }
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }
    }),

  /**
   * List cash sessions with filters
   */
  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        status: z.enum(['open', 'closed']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await getUserOutletIds(ctx.userId, ctx.session.tenantId!)
      const uc = container.cashSessionUseCase()

      return uc.list(tenantOutlets, {
        outletId: input.outletId,
        status: input.status,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        limit: input.limit,
        offset: input.offset,
      })
    }),
})
