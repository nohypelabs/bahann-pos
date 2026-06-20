import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '../trpc'
import { container } from '@/infra/container'
import { AppError } from '@/shared/exceptions/AppError'
import { supabaseAdmin } from '@/infra/supabase/server'
import { assertOutletAccessible, requirePermission } from '@/server/lib/tenant'
import { createAuditLog } from '@/lib/audit'

type CheckoutMethod = 'cash' | 'qris' | 'bank_transfer' | 'ewallet' | 'debit' | 'credit'

const checkoutMethodSchema = z.enum(['cash', 'qris', 'bank_transfer', 'ewallet', 'debit', 'credit'])

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
})

function methodToCode(method: CheckoutMethod) {
  const mapping: Record<CheckoutMethod, string> = {
    cash: 'cash',
    qris: 'qris_static',
    bank_transfer: 'bank_transfer',
    ewallet: 'ewallet_manual',
    debit: 'debit_card',
    credit: 'credit_card',
  }
  return mapping[method]
}

function methodToTransactionPaymentMethod(method: CheckoutMethod) {
  if (method === 'cash') return 'cash'
  if (method === 'debit' || method === 'credit') return 'card'
  if (method === 'bank_transfer') return 'transfer'
  return 'ewallet'
}

function isInstantMethod(method: CheckoutMethod) {
  return method === 'cash' || method === 'debit' || method === 'credit'
}

function safeAccountDetails(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function displayDetailsForMethod(method: CheckoutMethod, accountDetails: Record<string, unknown>) {
  if (method === 'bank_transfer') {
    return {
      bankName: accountDetails.bankName ?? null,
      accountNumber: accountDetails.accountNumber ?? null,
      accountHolder: accountDetails.accountHolder ?? null,
    }
  }

  if (method === 'ewallet') {
    return {
      phone: accountDetails.phone ?? null,
      provider: accountDetails.provider ?? null,
    }
  }

  return null
}

export const paymentsRouter = router({
  getActiveMethods: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.tenantId!
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('id, code, name, type, is_active, requires_confirmation, icon, instructions, display_order, tenant_id')
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('display_order', { ascending: true })

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }

    return (data ?? []).map((method) => ({
      id: method.id,
      code: method.code,
      name: method.name,
      type: method.type,
      is_active: method.is_active,
      requires_confirmation: method.requires_confirmation,
      icon: method.icon,
      instructions: method.instructions,
      display_order: method.display_order,
    }))
  }),

  startCheckout: protectedProcedure
    .input(z.object({
      transactionId: z.string().min(1).optional(),
      outletId: z.string().uuid(),
      deviceId: z.string().uuid().optional(),
      shiftId: z.string().uuid(),
      method: checkoutMethodSchema,
      amountPaid: z.number().nonnegative().optional(),
      items: z.array(checkoutItemSchema).min(1),
      discountAmount: z.number().nonnegative().default(0),
      notes: z.string().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await assertOutletAccessible(ctx.userId, tenantId, input.outletId)
      await requirePermission(ctx.userId, tenantId, 'pos.transaction.create', input.outletId)

      const { data: shift, error: shiftError } = await supabaseAdmin
        .from('shifts')
        .select('id, tenant_id, outlet_id, cashier_user_id, status, device_id')
        .eq('id', input.shiftId)
        .eq('tenant_id', tenantId)
        .single()

      if (shiftError || !shift) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
      }

      if (shift.outlet_id !== input.outletId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift does not belong to this outlet' })
      }

      if (shift.cashier_user_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the active shift cashier can checkout this sale' })
      }

      if (shift.status !== 'open') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift is not open' })
      }

      if (input.deviceId && shift.device_id && shift.device_id !== input.deviceId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift does not belong to this device' })
      }

      const methodCode = methodToCode(input.method)
      const { data: paymentMethod, error: paymentMethodError } = await supabaseAdmin
        .from('payment_methods')
        .select('id, code, name, account_details, tenant_id')
        .eq('code', methodCode)
        .eq('is_active', true)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .order('tenant_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (paymentMethodError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: paymentMethodError.message })
      }

      if (!paymentMethod && input.method !== 'cash') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment method is not active' })
      }

      const accountDetails = safeAccountDetails(paymentMethod?.account_details)
      const expiresAt = isInstantMethod(input.method)
        ? null
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const qrisImage = input.method === 'qris' ? String(accountDetails.imageBase64 ?? '') : null

      if (input.method === 'qris' && !qrisImage) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Gambar QRIS belum diupload. Silakan upload di Settings Pembayaran QRIS.',
        })
      }

      const plan = await container.getAccountPlanUseCase().execute(ctx.userId)
      const planLimits: Record<string, number> = {
        free: 100,
        warung: Infinity,
        starter: Infinity,
        professional: Infinity,
        business: Infinity,
        enterprise: Infinity,
      }
      const limit = planLimits[plan] ?? 100
      const planUsage = limit === Infinity
        ? { count: 0 }
        : await container.listTransactionsUseCase().getPlanUsage(input.outletId, plan, planLimits)

      const transactionResult = await container.createTransactionUseCase().execute({
        tenantId,
        transactionId: input.transactionId,
        outletId: input.outletId,
        cashierId: ctx.userId,
        deviceId: input.deviceId,
        shiftId: input.shiftId,
        status: 'pending',
        items: input.items,
        paymentMethod: methodToTransactionPaymentMethod(input.method),
        amountPaid: 0,
        discountAmount: input.discountAmount,
        notes: input.notes,
        planLimit: limit === Infinity ? null : limit,
        currentMonthCount: planUsage.count,
      })

      const paymentId = crypto.randomUUID()
      const instant = isInstantMethod(input.method)
      const paidAt = instant ? new Date().toISOString() : null
      const amountPaid = input.amountPaid ?? transactionResult.transaction.totalAmount

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          id: paymentId,
          tenant_id: tenantId,
          transaction_id: transactionResult.transaction.id,
          payment_method_id: paymentMethod?.id ?? null,
          amount: transactionResult.transaction.totalAmount,
          fee: null,
          reference_number: null,
          payment_proof_url: null,
          qris_content: qrisImage,
          status: instant ? 'paid' : 'pending',
          confirmed_by: instant ? ctx.userId : null,
          confirmed_at: paidAt,
          confirmation_notes: input.notes ?? null,
          customer_name: input.customerName ?? null,
          customer_phone: input.customerPhone ?? null,
          customer_email: null,
          wa_message_id: null,
          wa_status: null,
          wa_sent_at: null,
          expired_at: expiresAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: paymentError.message })
      }

      if (instant) {
        await container.createTransactionUseCase().finalizePendingTransaction({
          tenantId,
          transactionId: transactionResult.transaction.id,
          amountPaid,
        })

        await supabaseAdmin.from('payment_confirmations').insert({
          tenant_id: tenantId,
          payment_id: payment.id,
          action: 'confirmed',
          performed_by: ctx.userId,
          reason: 'Instant checkout',
          metadata: { method: input.method },
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session.email || 'unknown',
        action: 'CREATE',
        entityType: 'payment',
        entityId: payment.id,
        changes: { payment },
        metadata: {
          checkoutMethod: input.method,
          transactionId: transactionResult.transaction.id,
          instant,
        },
      })

      return {
        paymentId: payment.id,
        status: payment.status,
        method: input.method,
        amount: payment.amount,
        transactionId: transactionResult.transaction.id,
        transactionNumber: transactionResult.transaction.transactionId,
        qrisImage: qrisImage ?? undefined,
        qrisString: qrisImage ?? undefined,
        bankAccountId: input.method === 'bank_transfer' ? paymentMethod?.id : undefined,
        displayDetails: displayDetailsForMethod(input.method, accountDetails),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      }
    }),

  confirmCheckout: protectedProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      proofImage: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('id, tenant_id, transaction_id, amount, status, expired_at')
        .eq('id', input.paymentId)
        .eq('tenant_id', tenantId)
        .single()

      if (paymentError || !payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
      }

      if (payment.status === 'paid') {
        return { success: true }
      }

      if (payment.status === 'expired' || (payment.expired_at && new Date(payment.expired_at).getTime() < Date.now())) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment has expired' })
      }

      if (!payment.transaction_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment is not linked to a transaction' })
      }

      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('transactions')
        .select('id, tenant_id, outlet_id, total_amount, status')
        .eq('id', payment.transaction_id)
        .eq('tenant_id', tenantId)
        .single()

      if (transactionError || !transaction) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' })
      }

      await assertOutletAccessible(ctx.userId, tenantId, transaction.outlet_id)
      await requirePermission(ctx.userId, tenantId, 'pos.transaction.create', transaction.outlet_id)

      const confirmedAt = new Date().toISOString()
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'paid',
          confirmed_by: ctx.userId,
          confirmed_at: confirmedAt,
          payment_proof_url: input.proofImage ?? null,
          confirmation_notes: input.notes ?? null,
          updated_at: confirmedAt,
        })
        .eq('id', input.paymentId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
      }

      const { error: confirmationError } = await supabaseAdmin.from('payment_confirmations').insert({
        tenant_id: tenantId,
        payment_id: input.paymentId,
        action: 'confirmed',
        performed_by: ctx.userId,
        reason: input.notes ?? null,
        metadata: input.proofImage ? { proof_url: input.proofImage } : null,
      })

      if (confirmationError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: confirmationError.message })
      }

      await container.createTransactionUseCase().finalizePendingTransaction({
        tenantId,
        transactionId: transaction.id,
        amountPaid: payment.amount,
      })

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session.email || 'unknown',
        action: 'UPDATE',
        entityType: 'payment',
        entityId: input.paymentId,
        changes: { before: { status: payment.status }, after: { status: 'paid' } },
        metadata: { transactionId: transaction.id },
      })

      return { success: true }
    }),

  getSettings: protectedProcedure.query(async () => {
    const useCase = container.listPaymentsUseCase()
    try {
      return await useCase.getSettings()
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch payment settings',
      })
    }
  }),

  updateBankTransfer: adminProcedure
    .input(z.object({
      bankName: z.string().min(1),
      accountNumber: z.string().min(1),
      accountHolder: z.string().min(1),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const useCase = container.createPaymentUseCase()
      try {
        return await useCase.updateBankTransfer(input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update bank transfer settings',
        })
      }
    }),

  updateEWallet: adminProcedure
    .input(z.object({
      phone: z.string().min(1),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const useCase = container.createPaymentUseCase()
      try {
        return await useCase.updateEWallet(input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update e-wallet settings',
        })
      }
    }),

  updateQRIS: adminProcedure
    .input(z.object({
      imageBase64: z.string().min(1),
      merchantName: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const useCase = container.createPaymentUseCase()
      try {
        return await useCase.updateQRIS(input)
      } catch (error) {
        if (error instanceof AppError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update QRIS settings',
        })
      }
    }),
})
