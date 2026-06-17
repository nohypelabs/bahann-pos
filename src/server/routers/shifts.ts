/**
 * Shifts Router
 * Handles cashier shift lifecycle: open → submit → approve/reject
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin } from '@/infra/supabase/server'
import { assertOutletAccessible, getUserOutletIds } from '@/server/lib/tenant'
import { TRPCError } from '@trpc/server'

export const shiftsRouter = router({
  /**
   * Open a new shift
   * Verifies outlet access and ensures no active shift exists
   */
  open: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        openingCash: z.number().min(0),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await assertOutletAccessible(ctx.userId, tenantId, input.outletId)

      // Validate device belongs to outlet if provided
      if (input.deviceId) {
        const { data: device, error: deviceError } = await supabaseAdmin
          .from('pos_devices')
          .select('id')
          .eq('id', input.deviceId)
          .eq('tenant_id', tenantId)
          .eq('outlet_id', input.outletId)
          .single()

        if (deviceError || !device) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Device not found or does not belong to this outlet',
          })
        }
      }

      // Check for existing active shift
      const { data: existing } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', input.outletId)
        .eq('cashier_user_id', ctx.userId)
        .eq('status', 'open')
        .single()

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An active shift already exists for this outlet',
        })
      }

      // Insert new shift
      const { data: shift, error } = await supabaseAdmin
        .from('shifts')
        .insert({
          tenant_id: tenantId,
          outlet_id: input.outletId,
          device_id: input.deviceId || null,
          cashier_user_id: ctx.userId,
          opening_cash: input.openingCash,
          status: 'open',
          expected_cash: null,
          actual_cash: null,
          cash_difference: null,
          cashier_note: null,
          manager_note: null,
          closed_at: null,
          submitted_at: null,
          approved_by: null,
          approved_at: null,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to open shift: ${error.message}`,
        })
      }

      return shift
    }),

  /**
   * Get current active shift for the authenticated cashier
   * Includes transaction counts
   */
  getActive: protectedProcedure
    .input(z.object({ outletId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: shift, error } = await supabaseAdmin
        .from('shifts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', input.outletId)
        .eq('cashier_user_id', ctx.userId)
        .eq('status', 'open')
        .single()

      if (error || !shift) {
        return null
      }

      // Get transaction counts for this shift
      const { count: totalTransactions } = await supabaseAdmin
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('shift_id', shift.id)

      const { count: cashTransactions } = await supabaseAdmin
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('shift_id', shift.id)
        .eq('payment_method', 'cash')

      return {
        ...shift,
        transaction_count: totalTransactions || 0,
        cash_transaction_count: cashTransactions || 0,
      }
    }),

  /**
   * Submit shift for approval
   * Calls submit_shift() DB function which computes expected cash
   * If difference = 0, auto-closes; otherwise status = pending_approval
   */
  submit: protectedProcedure
    .input(
      z.object({
        shiftId: z.string().uuid(),
        actualCash: z.number().min(0),
        cashierNote: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Verify shift belongs to user and tenant
      const { data: shift, error: fetchError } = await supabaseAdmin
        .from('shifts')
        .select('id, tenant_id, cashier_user_id, status')
        .eq('id', input.shiftId)
        .single()

      if (fetchError || !shift) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
      }

      if (shift.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      if (shift.cashier_user_id !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the shift cashier can submit this shift',
        })
      }

      if (shift.status !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Shift is not in open status',
        })
      }

      // Call DB function
      const { data: result, error: rpcError } = await supabaseAdmin.rpc(
        'submit_shift',
        {
          p_shift_id: input.shiftId,
          p_actual_cash: input.actualCash,
          p_cashier_note: input.cashierNote || null,
        },
      )

      if (rpcError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to submit shift: ${rpcError.message}`,
        })
      }

      // Fetch updated shift
      const { data: updated } = await supabaseAdmin
        .from('shifts')
        .select('*')
        .eq('id', input.shiftId)
        .single()

      return updated
    }),

  /**
   * Approve or reject a submitted shift (admin/manager only)
   * Calls approve_shift() DB function
   */
  approve: adminProcedure
    .input(
      z.object({
        shiftId: z.string().uuid(),
        action: z.enum(['approve', 'reject']),
        managerNote: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Verify shift exists and belongs to this tenant
      const { data: shift, error: fetchError } = await supabaseAdmin
        .from('shifts')
        .select('id, tenant_id, status')
        .eq('id', input.shiftId)
        .single()

      if (fetchError || !shift) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
      }

      if (shift.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      if (shift.status !== 'pending_approval') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Shift is not pending approval',
        })
      }

      // Call DB function
      const { data: result, error: rpcError } = await supabaseAdmin.rpc(
        'approve_shift',
        {
          p_shift_id: input.shiftId,
          p_approver_id: ctx.userId,
          p_manager_note: input.managerNote || null,
          p_action: input.action,
        },
      )

      if (rpcError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to ${input.action} shift: ${rpcError.message}`,
        })
      }

      // Fetch updated shift
      const { data: updated } = await supabaseAdmin
        .from('shifts')
        .select('*')
        .eq('id', input.shiftId)
        .single()

      return updated
    }),

  /**
   * List shifts with optional filters
   * Returns shifts with cashier user info
   */
  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        status: z.enum(['open', 'pending_approval', 'closed', 'rejected']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const outletIds = await getUserOutletIds(ctx.userId, tenantId)

      if (outletIds.length === 0) {
        return { shifts: [], total: 0 }
      }

      let query = supabaseAdmin
        .from('shifts')
        .select(
          `
          *,
          cashier:cashier_user_id (
            id,
            name,
            email
          )
        `,
          { count: 'exact' },
        )
        .eq('tenant_id', tenantId)
        .in('outlet_id', input.outletId ? [input.outletId] : outletIds)
        .order('opened_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }

      const { data: shifts, error, count } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch shifts: ${error.message}`,
        })
      }

      return {
        shifts: shifts || [],
        total: count || 0,
      }
    }),

  /**
   * Get shift by ID with transaction details
   */
  getById: protectedProcedure
    .input(z.object({ shiftId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: shift, error } = await supabaseAdmin
        .from('shifts')
        .select(
          `
          *,
          cashier:cashier_user_id (
            id,
            name,
            email
          )
        `,
        )
        .eq('id', input.shiftId)
        .eq('tenant_id', tenantId)
        .single()

      if (error || !shift) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
      }

      // Get transactions for this shift
      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('id, total, payment_method, status, created_at')
        .eq('shift_id', input.shiftId)
        .order('created_at', { ascending: true })

      return {
        ...shift,
        transactions: transactions || [],
      }
    }),
})

export type ShiftsRouter = typeof shiftsRouter
