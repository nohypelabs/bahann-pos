/**
 * Transactions Router
 * Handles transaction creation, void, refund, and management
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  warung: Infinity,
  starter: Infinity,
  professional: Infinity,
  business: Infinity,
  enterprise: Infinity,
}

async function getMonthlyTransactionCount(outletId: string): Promise<number> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('outlet_id', outletId)
    .eq('status', 'completed')
    .gte('created_at', startOfMonth)
  return count ?? 0
}

async function getAccountPlan(userId: string): Promise<string> {
  const { data: user } = await supabase
    .from('users')
    .select('plan, role, outlet_id')
    .eq('id', userId)
    .single()

  if (!user) return 'free'

  // Admin uses their own plan
  if (user.role === 'admin') return user.plan ?? 'free'

  // Cashier inherits plan from their outlet's owner (tenant root)
  if (user.outlet_id) {
    const { data: outlet } = await supabase
      .from('outlets')
      .select('owner_id')
      .eq('id', user.outlet_id)
      .single()

    if (outlet?.owner_id) {
      const { data: owner } = await supabase
        .from('users')
        .select('plan')
        .eq('id', outlet.owner_id)
        .single()

      return owner?.plan ?? 'free'
    }
  }

  return 'free'
}

export const transactionsRouter = router({
  /**
   * Get current plan usage for the authenticated user
   */
  getPlanUsage: protectedProcedure
    .input(z.object({ outletId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const plan = await getAccountPlan(ctx.userId)
      const limit = PLAN_LIMITS[plan] ?? 100
      const count = await getMonthlyTransactionCount(input.outletId)
      return {
        plan,
        limit: limit === Infinity ? null : limit,
        count,
        remaining: limit === Infinity ? null : Math.max(0, limit - count),
        isAtLimit: limit !== Infinity && count >= limit,
      }
    }),

  /**
   * Create new transaction (replaces direct sales.record for atomic transactions)
   */
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
      // Check plan transaction limit
      const plan = await getAccountPlan(ctx.userId)
      const limit = PLAN_LIMITS[plan] ?? 100
      if (limit !== Infinity) {
        const count = await getMonthlyTransactionCount(input.outletId)
        if (count >= limit) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `PLAN_LIMIT_REACHED:${plan}:${count}:${limit}`,
          })
        }
      }

      // Calculate totals
      const subtotal = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )
      const taxAmount = 0 // Can be calculated if needed
      const totalAmount = subtotal - input.discountAmount + taxAmount
      const changeAmount = input.amountPaid - totalAmount

      if (changeAmount < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient payment amount',
        })
      }

      // Generate transaction ID
      const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      try {
        // Create transaction
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            transaction_id: transactionId,
            outlet_id: input.outletId,
            cashier_id: ctx.userId,
            status: 'completed',
            subtotal,
            discount_amount: input.discountAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            payment_method: input.paymentMethod,
            amount_paid: input.amountPaid,
            change_amount: changeAmount,
            notes: input.notes,
          })
          .select()
          .single()

        if (txError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create transaction: ${txError.message}`,
          })
        }

        // Insert transaction items
        const items = input.items.map((item) => ({
          transaction_id: transaction.id,
          product_id: item.productId,
          product_name: item.productName,
          product_sku: item.productSku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.quantity * item.unitPrice,
        }))

        const { error: itemsError } = await supabase
          .from('transaction_items')
          .insert(items)

        if (itemsError) {
          // Rollback transaction by voiding it
          await supabase
            .from('transactions')
            .update({ status: 'voided', void_reason: 'Failed to insert items' })
            .eq('id', transaction.id)

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create transaction items: ${itemsError.message}`,
          })
        }

        // Record in daily_sales for backward compatibility
        for (const item of input.items) {
          const { error: salesError } = await supabase.from('daily_sales').insert({
            product_id: item.productId,
            outlet_id: input.outletId,
            sale_date: new Date().toISOString().split('T')[0],
            quantity_sold: item.quantity,
            unit_price: item.unitPrice,
            revenue: item.quantity * item.unitPrice,
          })

          if (salesError) {
            console.error('Failed to insert daily_sales:', salesError)
            // Don't fail the whole transaction, but log the error
            // Transaction is already committed, daily_sales is just for reporting
          }
        }

        // Update stock - deduct sold items from inventory
        const today = new Date().toISOString().split('T')[0]

        for (const item of input.items) {
          // Get latest stock for this product at this outlet
          const { data: latestStock } = await supabase
            .from('daily_stock')
            .select('*')
            .eq('product_id', item.productId)
            .eq('outlet_id', input.outletId)
            .eq('stock_date', today)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (latestStock) {
            // Update existing stock record - add to stock_out and recalculate stock_akhir
            const newStockOut = (latestStock.stock_out || 0) + item.quantity
            const newStockAkhir = latestStock.stock_awal + (latestStock.stock_in || 0) - newStockOut

            const { error: stockUpdateError } = await supabase
              .from('daily_stock')
              .update({
                stock_out: newStockOut,
                stock_akhir: newStockAkhir,
              })
              .eq('id', latestStock.id)

            if (stockUpdateError) {
              console.error('Failed to update stock:', stockUpdateError)
              // Don't fail transaction, but log for monitoring
            }
          } else {
            // No stock record for today - create new one with stock_out
            // Get yesterday's stock as stock_awal
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayDate = yesterday.toISOString().split('T')[0]

            const { data: yesterdayStock } = await supabase
              .from('daily_stock')
              .select('stock_akhir')
              .eq('product_id', item.productId)
              .eq('outlet_id', input.outletId)
              .eq('stock_date', yesterdayDate)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            const stockAwal = yesterdayStock?.stock_akhir || 0
            const stockAkhir = stockAwal - item.quantity

            const { error: stockInsertError } = await supabase
              .from('daily_stock')
              .insert({
                product_id: item.productId,
                outlet_id: input.outletId,
                stock_date: today,
                stock_awal: stockAwal,
                stock_in: 0,
                stock_out: item.quantity,
                stock_akhir: stockAkhir,
              })

            if (stockInsertError) {
              console.error('Failed to create stock record:', stockInsertError)
              // Don't fail transaction, but log for monitoring
            }
          }
        }

        // Create audit log
        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'CREATE',
          entityType: 'transaction',
          entityId: transaction.id,
          changes: { transaction },
          metadata: { transactionId, totalAmount },
        })

        return {
          success: true,
          transaction,
          transactionId,
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while creating transaction',
        })
      }
    }),

  /**
   * Void transaction (before end of day)
   * Can only void completed transactions from today
   */
  void: protectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        reason: z.string().min(10, 'Reason must be at least 10 characters'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get transaction
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', input.transactionId)
        .single()

      if (fetchError || !transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      if (transaction.status !== 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only void completed transactions',
        })
      }

      // Check if same day (can only void same-day transactions)
      const txDate = new Date(transaction.created_at).toDateString()
      const today = new Date().toDateString()
      if (txDate !== today) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Can only void transactions from today. Use refund for older transactions.',
        })
      }

      // Update transaction status
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'voided',
          void_reason: input.reason,
          voided_by: ctx.userId,
          voided_at: new Date().toISOString(),
        })
        .eq('id', input.transactionId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to void transaction: ${error.message}`,
        })
      }

      // Create audit log
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
    }),

  /**
   * Refund transaction (after end of day or for partial refunds)
   */
  refund: protectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        reason: z.string().min(10),
        refundAmount: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', input.transactionId)
        .single()

      if (fetchError || !transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      if (transaction.status === 'voided' || transaction.status === 'refunded') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transaction already voided or refunded',
        })
      }

      const refundAmount = input.refundAmount || transaction.total_amount

      if (refundAmount > transaction.total_amount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Refund amount cannot exceed transaction total',
        })
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'refunded',
          refund_reason: input.reason,
          refunded_by: ctx.userId,
          refunded_at: new Date().toISOString(),
          refund_amount: refundAmount,
        })
        .eq('id', input.transactionId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to refund transaction: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'transaction',
        entityId: input.transactionId,
        changes: {
          before: { status: transaction.status },
          after: { status: 'refunded', refundAmount },
        },
        metadata: { action: 'refund' },
      })

      return { success: true }
    }),

  /**
   * Get transaction by ID with items
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(
          `
          *,
          transaction_items (*),
          outlets (id, name, address),
          cashier:users!cashier_id (id, name, email)
        `
        )
        .eq('id', input.id)
        .single()

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      }

      return transaction
    }),

  /**
   * List transactions with filters
   */
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
    .query(async ({ input }) => {
      let query = supabase
        .from('transactions')
        .select(
          `
          *,
          transaction_items (*),
          outlets (id, name),
          cashier:users!cashier_id (id, name)
        `,
          { count: 'estimated' }
        )
        .order('created_at', { ascending: false })

      if (input.outletId) query = query.eq('outlet_id', input.outletId)
      if (input.status) query = query.eq('status', input.status)
      if (input.dateFrom) query = query.gte('created_at', input.dateFrom)
      if (input.dateTo) query = query.lte('created_at', input.dateTo)

      query = query.range(input.offset, input.offset + input.limit - 1)

      const { data, count, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch transactions: ${error.message}`,
        })
      }

      return {
        transactions: data || [],
        total: count || 0,
      }
    }),

  /**
   * Get transaction summary for a date range
   */
  getSummary: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ input }) => {
      let query = supabase
        .from('transactions')
        .select('*')
        .gte('created_at', input.dateFrom)
        .lte('created_at', input.dateTo)

      if (input.outletId) {
        query = query.eq('outlet_id', input.outletId)
      }

      const { data: transactions, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch transaction summary: ${error.message}`,
        })
      }

      const summary = {
        totalTransactions: transactions?.length || 0,
        completedTransactions: transactions?.filter((t) => t.status === 'completed')
          .length || 0,
        voidedTransactions: transactions?.filter((t) => t.status === 'voided').length || 0,
        refundedTransactions: transactions?.filter((t) => t.status === 'refunded')
          .length || 0,
        totalRevenue: transactions
          ?.filter((t) => t.status === 'completed')
          .reduce((sum, t) => sum + t.total_amount, 0) || 0,
        totalDiscounts: transactions
          ?.filter((t) => t.status === 'completed')
          .reduce((sum, t) => sum + t.discount_amount, 0) || 0,
        cashSales: transactions
          ?.filter((t) => t.status === 'completed' && t.payment_method === 'cash')
          .reduce((sum, t) => sum + t.total_amount, 0) || 0,
        cardSales: transactions
          ?.filter((t) => t.status === 'completed' && t.payment_method === 'card')
          .reduce((sum, t) => sum + t.total_amount, 0) || 0,
        transferSales: transactions
          ?.filter((t) => t.status === 'completed' && t.payment_method === 'transfer')
          .reduce((sum, t) => sum + t.total_amount, 0) || 0,
        ewalletSales: transactions
          ?.filter((t) => t.status === 'completed' && t.payment_method === 'ewallet')
          .reduce((sum, t) => sum + t.total_amount, 0) || 0,
      }

      return summary
    }),
})
