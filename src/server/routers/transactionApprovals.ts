/**
 * Transaction Approvals Router
 * Handles void/refund approval workflow
 * - Kasir requests void/refund → creates pending approval
 * - Admin/manager approves/rejects → updates approval status
 * - On approval → transaction status changes to voided/refunded
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { getUserOutletIds, requirePermission } from '@/server/lib/tenant'
import { supabaseAdmin } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'

export const transactionApprovalsRouter = router({
  /**
   * List pending approvals for the user's accessible outlets
   */
  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        actionType: z.enum(['void', 'refund', 'discount_override', 'cash_drawer_open', 'payment_correction', 'shift_close']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const outletIds = await getUserOutletIds(ctx.userId, tenantId)

      if (outletIds.length === 0) {
        return { approvals: [] }
      }

      let query = supabaseAdmin
        .from('transaction_approvals')
        .select(`
          *,
          requester:users!requested_by(id, name, email),
          approver:users!approved_by(id, name, email),
          outlet:outlets!outlet_id(id, name),
          transaction:transactions!transaction_id(id, transaction_id, total_amount, status)
        `)
        .eq('tenant_id', tenantId)
        .in('outlet_id', input.outletId ? [input.outletId] : outletIds)
        .order('requested_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.status) {
        query = query.eq('status', input.status)
      }
      if (input.actionType) {
        query = query.eq('action_type', input.actionType)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { approvals: data || [] }
    }),

  /**
   * Create a new approval request (kasir requests void/refund)
   */
  create: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        transactionId: z.string().uuid(),
        shiftId: z.string().uuid().optional(),
        actionType: z.enum(['void', 'refund', 'discount_override', 'cash_drawer_open', 'payment_correction', 'shift_close']),
        reason: z.string().min(10, 'Reason must be at least 10 characters'),
        amount: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Verify outlet access
      const outletIds = await getUserOutletIds(ctx.userId, tenantId)
      if (!outletIds.includes(input.outletId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: outlet not accessible' })
      }

      // Verify transaction exists and belongs to the outlet
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('id, status, outlet_id')
        .eq('id', input.transactionId)
        .single()

      if (txError || !transaction) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
      }

      if (transaction.outlet_id !== input.outletId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transaction does not belong to this outlet' })
      }

      if (transaction.status !== 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only request approval for completed transactions' })
      }

      // Check for existing pending approval on this transaction
      const { data: existingApproval } = await supabaseAdmin
        .from('transaction_approvals')
        .select('id')
        .eq('transaction_id', input.transactionId)
        .eq('action_type', input.actionType)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingApproval) {
        throw new TRPCError({ code: 'CONFLICT', message: 'A pending approval request already exists for this transaction' })
      }

      // Create approval request
      const { data: approval, error: insertError } = await supabaseAdmin
        .from('transaction_approvals')
        .insert({
          tenant_id: tenantId,
          outlet_id: input.outletId,
          transaction_id: input.transactionId,
          shift_id: input.shiftId || null,
          action_type: input.actionType,
          requested_by: ctx.userId,
          status: 'pending',
          reason: input.reason,
          amount: input.amount || null,
          requested_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'transaction_approval',
        entityId: approval.id,
        changes: { approval },
        metadata: { actionType: input.actionType, transactionId: input.transactionId },
      })

      return { success: true, approval }
    }),

  /**
   * Approve a pending request (admin/manager)
   * If approved → transaction status changes to voided/refunded
   */
  approve: protectedProcedure
    .input(
      z.object({
        approvalId: z.string().uuid(),
        pin: z.string().min(4).max(6).regex(/^\d+$/, 'PIN harus angka'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Verify the approver's own PIN first
      const { data: approver, error: approverError } = await supabaseAdmin
        .from('users')
        .select('id, pin_code_hash, name')
        .eq('id', ctx.userId)
        .eq('tenant_id', tenantId)
        .single()

      if (approverError || !approver) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan' })
      }

      if (!approver.pin_code_hash) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Anda belum mengatur PIN. Atur PIN di Pengaturan → Profil terlebih dahulu.' })
      }

      const bcrypt = await import('bcryptjs')
      const pinValid = await bcrypt.compare(input.pin, approver.pin_code_hash)
      if (!pinValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN salah' })
      }

      // Fetch the approval request
      const { data: approval, error: fetchError } = await supabaseAdmin
        .from('transaction_approvals')
        .select('*')
        .eq('id', input.approvalId)
        .single()

      if (fetchError || !approval) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Approval request not found' })
      }

      if (approval.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: approval belongs to a different tenant' })
      }

      if (approval.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Approval request is not pending' })
      }

      // Verify outlet access
      const outletIds = await getUserOutletIds(ctx.userId, tenantId)
      if (!outletIds.includes(approval.outlet_id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: outlet not accessible' })
      }

      // Check if user has approval permission (admin/manager)
      await requirePermission(ctx.userId, tenantId, 'pos.transaction.void.approve', approval.outlet_id)

      // Update approval status
      const { data: updatedApproval, error: updateError } = await supabaseAdmin
        .from('transaction_approvals')
        .update({
          status: 'approved',
          approved_by: ctx.userId,
          decided_at: new Date().toISOString(),
          pin_verified_at: new Date().toISOString(),
        })
        .eq('id', input.approvalId)
        .select()
        .single()

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
      }

      // If approved, update the transaction status
      if (approval.action_type === 'void') {
        const { error: txUpdateError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'voided',
            void_reason: approval.reason,
            voided_by: ctx.userId,
            voided_at: new Date().toISOString(),
          })
          .eq('id', approval.transaction_id)

        if (txUpdateError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: txUpdateError.message })
        }
      } else if (approval.action_type === 'refund') {
        const { error: txUpdateError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'refunded',
            refund_reason: approval.reason,
            refunded_by: ctx.userId,
            refunded_at: new Date().toISOString(),
          })
          .eq('id', approval.transaction_id)

        if (txUpdateError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: txUpdateError.message })
        }
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'transaction_approval',
        entityId: input.approvalId,
        changes: { before: { status: 'pending' }, after: { status: 'approved' } },
        metadata: { actionType: approval.action_type, transactionId: approval.transaction_id },
      })

      return { success: true, approval: updatedApproval }
    }),

  /**
   * Reject a pending request (admin/manager)
   * If rejected → request marked rejected, transaction unchanged
   */
  reject: protectedProcedure
    .input(
      z.object({
        approvalId: z.string().uuid(),
        rejectionReason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Fetch the approval request
      const { data: approval, error: fetchError } = await supabaseAdmin
        .from('transaction_approvals')
        .select('*')
        .eq('id', input.approvalId)
        .single()

      if (fetchError || !approval) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Approval request not found' })
      }

      if (approval.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: approval belongs to a different tenant' })
      }

      if (approval.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Approval request is not pending' })
      }

      // Verify outlet access
      const outletIds = await getUserOutletIds(ctx.userId, tenantId)
      if (!outletIds.includes(approval.outlet_id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: outlet not accessible' })
      }

      // Check if user has approval permission (admin/manager)
      await requirePermission(ctx.userId, tenantId, 'pos.transaction.void.approve', approval.outlet_id)

      // Update approval status to rejected
      const { data: updatedApproval, error: updateError } = await supabaseAdmin
        .from('transaction_approvals')
        .update({
          status: 'rejected',
          approved_by: ctx.userId,
          decided_at: new Date().toISOString(),
        })
        .eq('id', input.approvalId)
        .select()
        .single()

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'transaction_approval',
        entityId: input.approvalId,
        changes: { before: { status: 'pending' }, after: { status: 'rejected' } },
        metadata: { actionType: approval.action_type, transactionId: approval.transaction_id, rejectionReason: input.rejectionReason },
      })

      return { success: true, approval: updatedApproval }
    }),
})
