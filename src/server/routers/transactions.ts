/**
 * Transactions Router
 * Handles transaction creation, approval-backed void/refund, and reporting.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { createAuditLog } from '@/lib/audit'
import { supabaseAdmin } from '@/infra/supabase/server'
import {
  getUserOutletIds,
  requirePermission,
  assertOutletAccessible,
} from '@/server/lib/tenant'
import { container } from '@/infra/container'

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  warung: Infinity,
  starter: Infinity,
  professional: Infinity,
  business: Infinity,
  enterprise: Infinity,
}

const transactionItemInput = z.object({
  productId: z.string().uuid(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
})

type ApprovalActionType = 'void' | 'refund'

async function createApprovalRequest(input: {
  tenantId: string
  userId: string
  userEmail: string
  transactionId: string
  actionType: ApprovalActionType
  reason: string
  refundAmount?: number
}) {
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('id, status, outlet_id, tenant_id, total_amount')
    .eq('id', input.transactionId)
    .eq('tenant_id', input.tenantId)
    .single()

  if (txError || !transaction) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
  }

  await assertOutletAccessible(input.userId, input.tenantId, transaction.outlet_id)
  await requirePermission(
    input.userId,
    input.tenantId,
    input.actionType === 'void' ? 'pos.transaction.void.request' : 'pos.refund.request',
    transaction.outlet_id,
  )

  if (transaction.status !== 'completed') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Can only request approval for completed transactions',
    })
  }

  const amount = input.actionType === 'refund'
    ? input.refundAmount ?? transaction.total_amount
    : null

  if (amount !== null && (amount <= 0 || amount > transaction.total_amount)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Refund amount must be positive and cannot exceed transaction total',
    })
  }

  const { data: existingApproval, error: existingError } = await supabaseAdmin
    .from('transaction_approvals')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .eq('transaction_id', input.transactionId)
    .eq('action_type', input.actionType)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: existingError.message })
  }

  if (existingApproval) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A pending approval request already exists for this transaction',
    })
  }

  const { data: approval, error: insertError } = await supabaseAdmin
    .from('transaction_approvals')
    .insert({
      tenant_id: input.tenantId,
      outlet_id: transaction.outlet_id,
      transaction_id: input.transactionId,
      action_type: input.actionType,
      requested_by: input.userId,
      status: 'pending',
      reason: input.reason,
      amount,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
  }

  await createAuditLog({
    userId: input.userId,
    userEmail: input.userEmail,
    action: 'CREATE',
    entityType: 'transaction_approval',
    entityId: approval.id,
    changes: { approval },
    metadata: {
      actionType: input.actionType,
      transactionId: input.transactionId,
      amount,
    },
  })

  return { success: true, approval }
}

export const transactionsRouter = router({
  getPlanUsage: protectedProcedure
    .input(z.object({ outletId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await assertOutletAccessible(ctx.userId, tenantId, input.outletId)
      const plan = await container.getAccountPlanUseCase().execute(ctx.userId)
      const useCase = container.listTransactionsUseCase()
      return useCase.getPlanUsage(input.outletId, plan, PLAN_LIMITS)
    }),

  create: protectedProcedure
    .input(
      z.object({
        transactionId: z.string().min(1).optional(),
        outletId: z.string().uuid(),
        deviceId: z.string().uuid().optional(),
        shiftId: z.string().uuid().optional(),
        status: z.enum(['pending', 'completed']).optional(),
        items: z.array(transactionItemInput).min(1),
        paymentMethod: z.enum(['cash', 'card', 'transfer', 'ewallet']),
        amountPaid: z.number().nonnegative().optional(),
        discountAmount: z.number().nonnegative().default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      await assertOutletAccessible(ctx.userId, tenantId, input.outletId)
      await requirePermission(ctx.userId, tenantId, 'pos.transaction.create', input.outletId)

      if (input.shiftId) {
        const { data: shift, error: shiftError } = await supabaseAdmin
          .from('shifts')
          .select('id, tenant_id, outlet_id, status, device_id')
          .eq('id', input.shiftId)
          .eq('tenant_id', tenantId)
          .single()

        if (shiftError || !shift) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
        }

        if (shift.outlet_id !== input.outletId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift does not belong to this outlet' })
        }

        if (shift.status !== 'open') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift is not open' })
        }

        if (input.deviceId && shift.device_id && shift.device_id !== input.deviceId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift does not belong to this device' })
        }
      }

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

      try {
        const result = await container.createTransactionUseCase().execute({
          tenantId,
          transactionId: input.transactionId,
          outletId: input.outletId,
          cashierId: ctx.userId,
          deviceId: input.deviceId,
          shiftId: input.shiftId,
          status: input.status,
          items: input.items,
          paymentMethod: input.paymentMethod,
          amountPaid: input.amountPaid,
          discountAmount: input.discountAmount,
          notes: input.notes,
          planLimit: limit === Infinity ? null : limit,
          currentMonthCount,
        })

        if (!result.replayed) {
          await createAuditLog({
            userId: ctx.userId,
            userEmail: ctx.session.email || 'unknown',
            action: 'CREATE',
            entityType: 'transaction',
            entityId: result.transaction.id,
            changes: { transaction: result.transaction },
            metadata: {
              transactionId: result.transactionId,
              totalAmount: result.transaction.totalAmount,
              status: result.transaction.status,
            },
          })
        }

        return result
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'An unexpected error occurred while creating transaction'

        if (message.startsWith('PLAN_LIMIT_REACHED:')) {
          throw new TRPCError({ code: 'FORBIDDEN', message })
        }

        if (
          message === 'Insufficient payment amount'
          || message === 'Transaction ID conflict'
          || message.startsWith('Cannot finalize transaction')
        ) {
          throw new TRPCError({ code: 'BAD_REQUEST', message })
        }

        if (message.startsWith('Product not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message })
        }

        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
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
      return createApprovalRequest({
        tenantId: ctx.session.tenantId!,
        userId: ctx.userId,
        userEmail: ctx.session.email || 'unknown',
        transactionId: input.transactionId,
        actionType: 'void',
        reason: input.reason,
      })
    }),

  refund: protectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        reason: z.string().min(10, 'Reason must be at least 10 characters'),
        refundAmount: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createApprovalRequest({
        tenantId: ctx.session.tenantId!,
        userId: ctx.userId,
        userEmail: ctx.session.email || 'unknown',
        transactionId: input.transactionId,
        actionType: 'refund',
        reason: input.reason,
        refundAmount: input.refundAmount,
      })
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const tenantOutlets = await getUserOutletIds(ctx.userId, tenantId)
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
      const tenantId = ctx.session.tenantId!
      const tenantOutlets = await getUserOutletIds(ctx.userId, tenantId)

      if (input.outletId && !tenantOutlets.includes(input.outletId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: outlet not accessible' })
      }

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
      const tenantId = ctx.session.tenantId!
      const tenantOutlets = await getUserOutletIds(ctx.userId, tenantId)

      if (input.outletId && !tenantOutlets.includes(input.outletId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: outlet not accessible' })
      }

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
