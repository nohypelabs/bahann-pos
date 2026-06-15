import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { getTenantOwnerId, getTenantOutletIds } from '@/server/lib/tenant'
import { supabaseAdmin } from '@/infra/supabase/server'

const EXPENSE_CATEGORIES = [
  { value: 'listrik', label: 'Listrik', icon: '⚡' },
  { value: 'air', label: 'Air', icon: '💧' },
  { value: 'gaji', label: 'Gaji Karyawan', icon: '👤' },
  { value: 'belanja_bahan', label: 'Belanja Bahan', icon: '🛒' },
  { value: 'perbaikan', label: 'Perbaikan', icon: '🔧' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'sewa', label: 'Sewa', icon: '🏠' },
  { value: 'lainnya', label: 'Lainnya', icon: '📋' },
] as const

export const expensesRouter = router({
  /**
   * Get expense categories
   */
  getCategories: protectedProcedure.query(() => {
    return EXPENSE_CATEGORIES
  }),

  /**
   * Create new expense
   */
  create: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        category: z.string().min(1),
        description: z.string().min(1),
        amount: z.number().positive(),
        receiptUrl: z.string().optional(),
        expenseDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access to this outlet
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const outletIds = await getTenantOutletIds(ownerId)
      if (!outletIds.includes(input.outletId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet not accessible' })
      }

      const { data, error } = await supabaseAdmin
        .from('operational_expenses')
        .insert({
          outlet_id: input.outletId,
          user_id: ctx.userId,
          category: input.category,
          description: input.description,
          amount: input.amount,
          receipt_url: input.receiptUrl || null,
          expense_date: input.expenseDate || new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true, expense: data }
    }),

  /**
   * List expenses with filters
   */
  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      let outletIds: string[]
      if (input.outletId) {
        outletIds = [input.outletId]
      } else {
        outletIds = await getTenantOutletIds(ownerId)
      }

      let query = supabaseAdmin
        .from('operational_expenses')
        .select(`
          *,
          user:users!user_id(id, name, email),
          outlet:outlets!outlet_id(id, name)
        `)
        .in('outlet_id', outletIds)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.startDate) {
        query = query.gte('expense_date', input.startDate)
      }
      if (input.endDate) {
        query = query.lte('expense_date', input.endDate)
      }
      if (input.category) {
        query = query.eq('category', input.category)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { expenses: data || [] }
    }),

  /**
   * Get daily summary for an outlet
   */
  getDailySummary: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        date: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const targetDate = input.date || new Date().toISOString().split('T')[0]

      let outletIds: string[]
      if (input.outletId) {
        outletIds = [input.outletId]
      } else {
        outletIds = await getTenantOutletIds(ownerId)
      }

      // Get expenses for the day
      const { data: expenses, error } = await supabaseAdmin
        .from('operational_expenses')
        .select(`
          *,
          user:users!user_id(id, name),
          outlet:outlets!outlet_id(id, name)
        `)
        .in('outlet_id', outletIds)
        .eq('expense_date', targetDate)
        .eq('is_voided', false)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Calculate summary
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)

      // Group by category
      const byCategory = Object.entries(
        (expenses || []).reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
          return acc
        }, {} as Record<string, number>)
      )
        .map(([category, total]) => ({
          category,
          total: total as number,
          count: (expenses || []).filter((e) => e.category === category).length,
        }))
        .sort((a, b) => b.total - a.total)

      return {
        totalExpenses,
        byCategory,
        expenses: expenses || [],
        date: targetDate,
      }
    }),

  /**
   * Void an expense (admin only)
   */
  void: protectedProcedure
    .input(
      z.object({
        expenseId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admin can void
      if (ctx.session.role !== 'admin' && ctx.session.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
      }

      const { data, error } = await supabaseAdmin
        .from('operational_expenses')
        .update({
          is_voided: true,
          voided_by: ctx.userId,
          voided_at: new Date().toISOString(),
          void_reason: input.reason || null,
        })
        .eq('id', input.expenseId)
        .select()
        .single()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true, expense: data }
    }),
})
