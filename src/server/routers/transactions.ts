/**
 * Transactions Router
 * Handles transaction creation, void, refund, and management
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { createAuditLog } from '@/lib/audit'
import { resolveTenantOutletIds } from '@/server/lib/tenant'
import { TRPCError } from '@trpc/server'
import { container } from '@/infra/container'

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  warung: Infinity,
  starter: Infinity,
  professional: Infinity,
  business: Infinity,
  enterprise: Infinity,
}

export const transactionsRouter = router({
  getPlanUsage: protectedProcedure
    .input(z.object({ outletId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const plan = await container.getAccountPlanUseCase().execute(ctx.userId)
      const useCase = container.listTransactionsUseCase()
      return useCase.getPlanUsage(input.outletId, plan, PLAN_LIMITS)
    }),

  create: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            productName: z.string(),
            productSku: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number(),
          })
        ),
        paymentMethod: z.enum(['cash', 'card', 'transfer', 'ewallet']),
        amountPaid: z.number(),
        discountAmount: z.number().default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const plan = await container.getAccountPlanUseCase().execute(ctx.userId)
      const limit = PLAN_LIMITS[plan] ?? 100

      let currentMonthCount = 0
      if (limit !== Infinity) {
        const listUseCase = container.listTransactionsUseCase()
        const planUsage = await listUseCase.getPlanUsage(input.outletId, plan, PLAN_LIMITS)
        currentMonthCount = planUsage.count

        if (currentMonthCount >= limit) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `PLAN_LIMIT_REACHED:${plan}:${currentMonthCount}:${limit}`,
          })
        }
      }

      const useCase = container.createTransactionUseCase()

      try {
        const result = await useCase.execute({
          outletId: input.outletId,
          cashierId: ctx.userId,
          items: input.items,
          paymentMethod: input.paymentMethod,
          amountPaid: input.amountPaid,
          discountAmount: input.discountAmount,
          notes: input.notes,
          planLimit: limit === Infinity ? null : limit,
          currentMonthCount,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'CREATE',
          entityType: 'transaction',
          entityId: result.transaction.id,
          changes: { transaction: result.transaction },
          metadata: { transactionId: result.transactionId, totalAmount: result.transaction.totalAmount },
        })

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred while creating transaction'
        if (message.startsWith('PLAN_LIMIT_REACHED:') || message === 'Insufficient payment amount') {
          throw new TRPCError({
            code: message.startsWith('PLAN_LIMIT_REACHED') ? 'FORBIDDEN' : 'BAD_REQUEST',
            message,
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message,
        })
      }
    }),

  void: protectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        reason: z.string().min(10, 'Reason must be at least 10 characters'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantOutlets = await resolveTenantOutletIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      const useCase = container.voidTransactionUseCase()

      try {
        await useCase.execute({
          transactionId: input.transactionId,
          reason: input.reason,
          userId: ctx.userId,
          tenantOutletIds: tenantOutlets,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'UPDATE',
          entityType: 'transaction',
          entityId: input.transactionId,
          changes: {
            before: { status: 'completed' },
            after: { status: 'voided', reason: input.reason },
          },
          metadata: { action: 'void' },
        })

        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to void transaction'
        if (message === 'Transaction not found') {
          throw new TRPCError({ code: 'NOT_FOUND', message })
        }
        if (message.startsWith('Can only void')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
      }
    }),

  refund: protectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        reason: z.string().min(10),
        refundAmount: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantOutlets = await resolveTenantOutletIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      const useCase = container.refundTransactionUseCase()

      try {
        await useCase.execute({
          transactionId: input.transactionId,
          reason: input.reason,
          refundAmount: input.refundAmount,
          userId: ctx.userId,
          tenantOutletIds: tenantOutlets,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'UPDATE',
          entityType: 'transaction',
          entityId: input.transactionId,
          changes: {
            before: { status: 'completed' },
            after: { status: 'refunded', refundAmount: input.refundAmount },
          },
          metadata: { action: 'refund' },
        })

        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refund transaction'
        if (message === 'Transaction not found') {
          throw new TRPCError({ code: 'NOT_FOUND', message })
        }
        if (message.includes('already voided') || message.includes('cannot exceed')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await resolveTenantOutletIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      const useCase = container.listTransactionsUseCase()

      try {
        return await useCase.getById(input.id, tenantOutlets)
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        status: z.enum(['pending', 'completed', 'voided', 'refunded']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await resolveTenantOutletIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      const useCase = container.listTransactionsUseCase()

      try {
        return await useCase.list(tenantOutlets, {
          outletId: input.outletId,
          status: input.status,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          limit: input.limit,
          offset: input.offset,
        })
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch transactions',
        })
      }
    }),

  getSummary: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantOutlets = await resolveTenantOutletIds(ctx.userId, ctx.session.role, ctx.session.outletId)
      const useCase = container.listTransactionsUseCase()

      try {
        return await useCase.getSummary(tenantOutlets, input.outletId, input.dateFrom, input.dateTo)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch transaction summary',
        })
      }
    }),
})
