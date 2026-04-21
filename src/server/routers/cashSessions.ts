/**
 * Cash Sessions Router
 * Handles opening/closing day and EOD reports
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
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
      // Check if there's already an open session
      const { data: existing } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('outlet_id', input.outletId)
        .eq('status', 'open')
        .maybeSingle()

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'There is already an open cash session for this outlet',
        })
      }

      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          outlet_id: input.outletId,
          opened_by: ctx.userId,
          opened_at: new Date().toISOString(),
          opening_cash: input.openingCash,
          status: 'open',
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to open cash session: ${error.message}`,
        })
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
      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('id', input.sessionId)
        .single()

      if (sessionError || !session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      if (session.status === 'closed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session already closed',
        })
      }

      // Calculate sales summary from transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('outlet_id', session.outlet_id)
        .eq('status', 'completed')
        .gte('created_at', session.opened_at)
        .lte('created_at', new Date().toISOString())

      if (txError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch transactions: ${txError.message}`,
        })
      }

      const summary = (transactions || []).reduce(
        (acc, tx) => ({
          totalSales: acc.totalSales + tx.total_amount,
          totalTransactions: acc.totalTransactions + 1,
          cashSales:
            acc.cashSales + (tx.payment_method === 'cash' ? tx.total_amount : 0),
          cardSales:
            acc.cardSales + (tx.payment_method === 'card' ? tx.total_amount : 0),
          transferSales:
            acc.transferSales + (tx.payment_method === 'transfer' ? tx.total_amount : 0),
          ewalletSales:
            acc.ewalletSales + (tx.payment_method === 'ewallet' ? tx.total_amount : 0),
          totalDiscount: acc.totalDiscount + tx.discount_amount,
        }),
        {
          totalSales: 0,
          totalTransactions: 0,
          cashSales: 0,
          cardSales: 0,
          transferSales: 0,
          ewalletSales: 0,
          totalDiscount: 0,
        }
      )

      const expectedCash = session.opening_cash + summary.cashSales
      const actualCash = input.closingCash
      const difference = actualCash - expectedCash

      // Update session
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closed_by: ctx.userId,
          closed_at: new Date().toISOString(),
          closing_cash: input.closingCash,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          difference,
          total_sales: summary.totalSales,
          total_transactions: summary.totalTransactions,
          cash_sales: summary.cashSales,
          card_sales: summary.cardSales,
          transfer_sales: summary.transferSales,
          ewallet_sales: summary.ewalletSales,
          total_discount: summary.totalDiscount,
          notes: input.notes,
          status: 'closed',
        })
        .eq('id', input.sessionId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to close session: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'cash_session',
        entityId: input.sessionId,
        changes: {
          before: { status: 'open' },
          after: { status: 'closed', difference },
        },
        metadata: { action: 'close', difference },
      })

      return { success: true, difference }
    }),

  /**
   * Get current open session for an outlet
   */
  getCurrent: protectedProcedure
    .input(z.object({ outletId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data } = await supabase
        .from('cash_sessions')
        .select(
          `
          *,
          outlet:outlets (id, name, address),
          opened_by_user:users!opened_by (id, name)
        `
        )
        .eq('outlet_id', input.outletId)
        .eq('status', 'open')
        .maybeSingle()

      return data
    }),

  /**
   * Get EOD report for a session
   */
  getReport: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select(
          `
          *,
          outlet:outlets (id, name, address),
          opened_by_user:users!opened_by (id, name),
          closed_by_user:users!closed_by (id, name)
        `
        )
        .eq('id', input.sessionId)
        .single()

      if (sessionError || !session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        })
      }

      // Get detailed breakdown of transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .eq('outlet_id', session.outlet_id)
        .gte('created_at', session.opened_at)
        .lte('created_at', session.closed_at || new Date().toISOString())
        .order('created_at', { ascending: false })

      return {
        session,
        transactions: transactions || [],
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
    .query(async ({ input }) => {
      let query = supabase
        .from('cash_sessions')
        .select(
          `
          *,
          outlet:outlets (id, name),
          opened_by_user:users!opened_by (id, name)
        `,
          { count: 'estimated' }
        )
        .order('opened_at', { ascending: false })

      if (input.outletId) query = query.eq('outlet_id', input.outletId)
      if (input.status) query = query.eq('status', input.status)
      if (input.dateFrom) query = query.gte('opened_at', input.dateFrom)
      if (input.dateTo) query = query.lte('opened_at', input.dateTo)

      query = query.range(input.offset, input.offset + input.limit - 1)

      const { data, count, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch cash sessions: ${error.message}`,
        })
      }

      return {
        sessions: data || [],
        total: count || 0,
      }
    }),
})
