// Ties workshop service notes and the stamp card to the normal checkout path
// (payments.startCheckout / confirmCheckout) and to voids and refunds.
//
// The note, its prices, its customer and any voucher discount are read on the
// server: a note checkout never trusts items or a discount sent by the client.
import { TRPCError } from '@trpc/server'
import { supabaseAdmin } from '@/infra/supabase/server'
import { container } from '@/infra/container'
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException'
import { voucherDiscount } from '@/domain/workshop/rules'
import type { VoucherReward } from '@/domain/entities/Workshop'
import type { DiscountJustification, ManualDiscount } from '@/domain/sales/manualDiscount'

export interface NoteCheckout {
  serviceOrderId: string
  customerId: string | null
  vehicleId: string
  items: {
    productId: string
    productName: string
    productSku: string
    quantity: number
    agreedUnitPrice: number
    agreedReason: DiscountJustification | null
  }[]
  subtotal: number
  voucher: { id: string; code: string; discount: number } | null
  /** The cashier's amount off the whole note, with its reason. */
  manualDiscount: ManualDiscount | null
}

export interface LoyaltyOutcome {
  awarded: boolean
  balance?: number
  required?: number
  vouchers?: string[]
}

const VOUCHER_ERRORS: Record<string, DomainErrorCode> = {
  VOUCHER_NOT_FOUND: DomainErrorCode.VOUCHER_NOT_FOUND,
  VOUCHER_OTHER_CUSTOMER: DomainErrorCode.VOUCHER_OTHER_CUSTOMER,
  VOUCHER_NOT_AVAILABLE: DomainErrorCode.VOUCHER_NOT_AVAILABLE,
  VOUCHER_EXPIRED: DomainErrorCode.VOUCHER_EXPIRED,
}

function domainError(code: DomainErrorCode): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message: code })
}

/**
 * Cancels checkouts of this note that were started but never paid (a closed
 * QRIS screen, a refreshed browser): their payment is cancelled, their pending
 * sale voided — pending sales never deducted stock — and a voucher they claimed
 * goes back to the member.
 */
export async function cancelPendingNoteCheckouts(tenantId: string, serviceOrderId: string, onlyPaymentId?: string) {
  const { data: pending, error } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('service_order_id', serviceOrderId)
    .eq('status', 'pending')
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

  let txIds = (pending ?? []).map((t) => t.id as string)
  if (onlyPaymentId) {
    const { data: payment } = await supabaseAdmin
      .from('payments').select('transaction_id, status').eq('id', onlyPaymentId).eq('tenant_id', tenantId).maybeSingle()
    if (!payment || payment.status !== 'pending') return
    txIds = txIds.filter((id) => id === payment.transaction_id)
  }
  if (txIds.length === 0) return

  const now = new Date().toISOString()
  await supabaseAdmin.from('payments').update({ status: 'cancelled', updated_at: now })
    .eq('tenant_id', tenantId).in('transaction_id', txIds).eq('status', 'pending')
  await supabaseAdmin.from('transactions')
    .update({ status: 'voided', void_reason: 'Checkout nota dibatalkan sebelum dibayar', voided_at: now })
    .eq('tenant_id', tenantId).in('id', txIds).eq('status', 'pending')
  await supabaseAdmin.from('member_vouchers')
    .update({ status: 'issued', redeemed_at: null, redeemed_transaction_id: null })
    .eq('tenant_id', tenantId).in('redeemed_transaction_id', txIds).eq('status', 'redeemed')
}

/**
 * Reads an open note into checkout items at their agreed prices and, when a
 * voucher code is given, claims the voucher and works out its discount. A
 * claimed voucher must be linked with attachSaleToNote or released with
 * releaseVoucher.
 */
export async function prepareNoteCheckout(
  tenantId: string,
  outletId: string,
  serviceOrderId: string,
  voucherCode: string | undefined,
): Promise<NoteCheckout> {
  const order = await container.workshopRepo().getServiceOrder(tenantId, serviceOrderId)
  if (!order) domainError(DomainErrorCode.SERVICE_ORDER_NOT_FOUND)
  if (order.status !== 'open') domainError(DomainErrorCode.SERVICE_ORDER_NOT_OPEN)
  if (order.outletId !== outletId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Service note belongs to another outlet' })
  }
  if (order.items.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Service note has no items' })
  }

  await cancelPendingNoteCheckouts(tenantId, serviceOrderId)

  const items = order.items.map((i) => ({
    productId: i.productId,
    productName: i.productName,
    productSku: i.productSku,
    quantity: i.quantity,
    agreedUnitPrice: i.unitPrice ?? i.listPrice,
    agreedReason: i.priceReason ? { reason: i.priceReason, note: i.priceNote } : null,
  }))
  const subtotal = items.reduce((s, i) => s + i.agreedUnitPrice * i.quantity, 0)

  let voucher: NoteCheckout['voucher'] = null
  if (voucherCode?.trim()) {
    if (!order.customer?.isMember) domainError(DomainErrorCode.NOT_A_MEMBER)
    const { data, error } = await supabaseAdmin.rpc('claim_member_voucher', {
      p_tenant_id: tenantId, p_customer_id: order.customer.id, p_code: voucherCode,
    })
    if (error) {
      const code = Object.keys(VOUCHER_ERRORS).find((k) => error.message.includes(k))
      if (code) domainError(VOUCHER_ERRORS[code])
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }
    const claimed = data as { id: string; code: string; reward: VoucherReward }
    try {
      const lines = order.items.map((i) => ({ itemType: i.itemType, unitPrice: i.unitPrice ?? i.listPrice, quantity: i.quantity }))
      voucher = { id: claimed.id, code: claimed.code, discount: voucherDiscount(claimed.reward, lines) }
    } catch (err) {
      await releaseVoucher(claimed.id)
      if (err instanceof DomainException) domainError(err.code)
      throw err
    }
  }

  return {
    serviceOrderId, customerId: order.customer?.id ?? null, vehicleId: order.vehicle.id, items, subtotal, voucher,
    manualDiscount: order.manualDiscount,
  }
}

/** Records who and what a sale was for, and links its voucher. */
export async function attachSaleToNote(tenantId: string, transactionId: string, checkout: NoteCheckout) {
  const { error } = await supabaseAdmin
    .from('transactions')
    .update({
      customer_id: checkout.customerId,
      vehicle_id: checkout.vehicleId,
      service_order_id: checkout.serviceOrderId,
      voucher_id: checkout.voucher?.id ?? null,
      voucher_discount: checkout.voucher?.discount ?? 0,
    })
    .eq('id', transactionId)
    .eq('tenant_id', tenantId)
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

  if (checkout.voucher) {
    const { error: linkError } = await supabaseAdmin.rpc('link_voucher_to_sale', {
      p_voucher_id: checkout.voucher.id, p_transaction_id: transactionId,
    })
    if (linkError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: linkError.message })
  }
}

export async function releaseVoucher(voucherId: string) {
  await supabaseAdmin.rpc('release_member_voucher', { p_voucher_id: voucherId })
}

/**
 * After a sale completes: closes its note as paid (the motor's service history
 * entry) and awards the member's stamp. Never throws for loyalty, because the
 * money is already taken; a failure is logged and the stamp can be added by hand.
 */
export async function completeWorkshopSale(tenantId: string, transactionId: string): Promise<LoyaltyOutcome | null> {
  const { data: tx } = await supabaseAdmin
    .from('transactions')
    .select('id, status, customer_id, service_order_id')
    .eq('id', transactionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!tx || tx.status !== 'completed') return null

  if (tx.service_order_id) {
    await supabaseAdmin
      .from('service_orders')
      .update({ status: 'paid', transaction_id: tx.id, closed_at: new Date().toISOString() })
      .eq('id', tx.service_order_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
  }

  if (!tx.customer_id) return null
  const { data, error } = await supabaseAdmin.rpc('loyalty_award_stamps', { p_transaction_id: tx.id })
  if (error) {
    console.error('[workshop] stamp award failed', { transactionId, error: error.message })
    return null
  }
  return data as LoyaltyOutcome
}

/**
 * After a sale is voided or refunded: takes back its stamp, voids a reward it
 * triggered if unused, and returns a voucher it used. A voided note sale also
 * closes its note as cancelled, so the motor can get a new note and the void
 * does not count as a service.
 */
export async function reverseWorkshopSale(tenantId: string, transactionId: string, kind: 'void' | 'refund') {
  const { data: tx } = await supabaseAdmin
    .from('transactions')
    .select('id, customer_id, service_order_id, voucher_id')
    .eq('id', transactionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!tx || (!tx.customer_id && !tx.service_order_id && !tx.voucher_id)) return

  const { error } = await supabaseAdmin.rpc('loyalty_reverse_sale', { p_transaction_id: tx.id })
  if (error) console.error('[workshop] loyalty reversal failed', { transactionId, error: error.message })

  if (kind === 'void' && tx.service_order_id) {
    await supabaseAdmin
      .from('service_orders')
      .update({ status: 'cancelled', cancel_reason: 'Penjualan nota di-void', closed_at: new Date().toISOString() })
      .eq('id', tx.service_order_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
  }
}
