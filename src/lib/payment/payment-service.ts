/**
 * Payment Service
 *
 * Handles payment processing, QRIS generation, and payment confirmation.
 * Zero-budget solution using static QRIS and manual confirmation.
 */

import { supabase } from '@/infra/supabase/client'
import { generateQRISImage, generateQRISString } from './qris-generator'
import { v4 as uuidv4 } from 'uuid'

export type PaymentMethod = 'cash' | 'qris' | 'bank_transfer' | 'debit' | 'credit'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired'

/**
 * Map PaymentMethod to database code
 */
function mapMethodToCode(method: PaymentMethod): string {
  const mapping: Record<PaymentMethod, string> = {
    'cash': 'cash',
    'qris': 'qris_static',
    'bank_transfer': 'bank_transfer',
    'debit': 'debit_card',
    'credit': 'credit_card'
  }
  return mapping[method]
}

export interface PaymentRequest {
  transactionId: string
  amount: number
  method: PaymentMethod
  customerId?: string
  customerName?: string
  customerPhone?: string
  notes?: string
}

export interface PaymentResult {
  paymentId: string
  status: PaymentStatus
  method: PaymentMethod
  amount: number
  qrisImage?: string
  qrisString?: string
  bankAccountId?: string
  expiresAt?: Date
}

export interface PaymentConfirmation {
  paymentId: string
  proofImage?: string
  notes?: string
  confirmedBy: string
}

/**
 * Create a new payment
 */
export async function createPayment(request: PaymentRequest): Promise<PaymentResult> {
  const paymentId = uuidv4()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // For QRIS payment
  if (request.method === 'qris') {
    // Get QRIS configuration from database
    const { data: qrisConfig } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('code', 'qris_static')
      .eq('is_active', true)
      .single()

    if (!qrisConfig) {
      throw new Error('QRIS configuration not found')
    }

    const accountDetails = qrisConfig.account_details as any || {}

    // Generate QRIS code
    const qrisString = generateQRISString({
      merchantName: accountDetails.merchantName || 'AGDS Corp',
      merchantCity: accountDetails.merchantCity || 'Jakarta',
      merchantPAN: accountDetails.merchantPAN,
      amount: request.amount,
      transactionId: request.transactionId
    })

    const qrisImage = await generateQRISImage(
      {
        merchantName: accountDetails.merchantName || 'AGDS Corp',
        merchantCity: accountDetails.merchantCity || 'Jakarta',
        merchantPAN: accountDetails.merchantPAN,
        amount: request.amount,
        transactionId: request.transactionId
      },
      { width: 400 }
    )

    // Save payment to database
    const insertData = {
      id: paymentId,
      // Don't set transaction_id or reference_number (they're UUID types in DB)
      // We'll link via payment_id when creating the sales transaction
      amount: request.amount,
      payment_method_id: qrisConfig.id,
      status: 'pending',
      customer_name: request.customerName || null,
      customer_phone: request.customerPhone || null,
      qris_content: qrisString,
      confirmation_notes: `TRX: ${request.transactionId}${request.notes ? ' | ' + request.notes : ''}`,
      expired_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    }

    console.log('📝 Inserting payment data:', insertData)

    const { data: paymentData, error } = await supabase
      .from('payments')
      .insert(insertData)
      .select()

    if (error) {
      console.error('❌ Payment insert error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    console.log('✅ Payment created:', paymentData)

    return {
      paymentId,
      status: 'pending',
      method: 'qris',
      amount: request.amount,
      qrisImage,
      qrisString,
      expiresAt
    }
  }

  // For Bank Transfer
  if (request.method === 'bank_transfer') {
    // Get active bank account
    const { data: bankAccount } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('code', 'bank_transfer')
      .eq('is_active', true)
      .single()

    if (!bankAccount) {
      throw new Error('Bank transfer configuration not found')
    }

    // Save payment to database
    const { error } = await supabase.from('payments').insert({
      id: paymentId,
      amount: request.amount,
      payment_method_id: bankAccount.id,
      status: 'pending',
      customer_name: request.customerName || null,
      customer_phone: request.customerPhone || null,
      confirmation_notes: `TRX: ${request.transactionId}${request.notes ? ' | ' + request.notes : ''}`,
      expired_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    }).select()

    if (error) {
      console.error('❌ Bank transfer payment insert error:', error)
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    return {
      paymentId,
      status: 'pending',
      method: 'bank_transfer',
      amount: request.amount,
      bankAccountId: bankAccount.id,
      expiresAt
    }
  }

  // For Cash/Debit/Credit (instant payment)
  // Get payment method
  const methodCode = mapMethodToCode(request.method)
  const { data: paymentMethod } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('code', methodCode)
    .eq('is_active', true)
    .single()

  const { error } = await supabase.from('payments').insert({
    id: paymentId,
    amount: request.amount,
    payment_method_id: paymentMethod?.id || null,
    status: 'paid', // Instant payment
    customer_name: request.customerName || null,
    customer_phone: request.customerPhone || null,
    confirmation_notes: `TRX: ${request.transactionId}${request.notes ? ' | ' + request.notes : ''}`,
    confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }).select()

  if (error) {
    console.error('❌ Instant payment insert error:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to create payment: ${error.message}`)
  }

  return {
    paymentId,
    status: 'paid',
    method: request.method,
    amount: request.amount
  }
}

/**
 * Confirm a payment (manual confirmation by admin/cashier)
 */
export async function confirmPayment(confirmation: PaymentConfirmation): Promise<boolean> {
  try {
    // Get payment details
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', confirmation.paymentId)
      .single()

    if (fetchError || !payment) {
      throw new Error('Payment not found')
    }

    if (payment.status === 'paid') {
      throw new Error('Payment already confirmed')
    }

    if (payment.status === 'expired') {
      throw new Error('Payment has expired')
    }

    // Update payment status
    // Only set confirmed_by if it's a valid UUID (not 'anonymous')
    const isValidUUID = confirmation.confirmedBy &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(confirmation.confirmedBy)

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        confirmed_at: new Date().toISOString(),
        confirmed_by: isValidUUID ? confirmation.confirmedBy : null,
        payment_proof_url: confirmation.proofImage || null,
        confirmation_notes: confirmation.notes || null
      })
      .eq('id', confirmation.paymentId)

    if (updateError) {
      throw new Error(`Failed to update payment: ${updateError.message}`)
    }

    // Create confirmation record
    const { error: confirmError } = await supabase.from('payment_confirmations').insert({
      payment_id: confirmation.paymentId,
      performed_by: isValidUUID ? confirmation.confirmedBy : null,
      action: 'confirmed',
      reason: confirmation.notes || null,
      metadata: confirmation.proofImage ? { proof_url: confirmation.proofImage } : null
    })

    if (confirmError) {
      console.error('Failed to create confirmation record:', confirmError)
    }

    return true
  } catch (error: any) {
    console.error('Payment confirmation error:', error)
    throw error
  }
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, payment_confirmations(*)')
    .eq('id', paymentId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch payment: ${error.message}`)
  }

  return data
}

/**
 * Get payment by transaction ID
 */
export async function getPaymentByTransaction(transactionId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, payment_confirmations(*)')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw new Error(`Failed to fetch payment: ${error.message}`)
  }

  return data
}

/**
 * Get active payment methods
 */
export async function getActivePaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    throw new Error(`Failed to fetch payment methods: ${error.message}`)
  }

  return data
}

/**
 * Get bank account details
 */
export async function getBankAccount(bankAccountId: string) {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('id', bankAccountId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch bank account: ${error.message}`)
  }

  return data
}

/**
 * Mark expired payments
 * Should be run periodically (cron job or scheduled task)
 */
export async function markExpiredPayments() {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expired_at', new Date().toISOString())

  if (error) {
    console.error('Failed to mark expired payments:', error)
    return false
  }

  return true
}

/**
 * Get pending payments (for admin dashboard)
 */
export async function getPendingPayments(limit: number = 50) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch pending payments: ${error.message}`)
  }

  return data
}

/**
 * Reject/cancel a payment
 */
export async function rejectPayment(paymentId: string, reason?: string) {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      confirmation_notes: reason || 'Payment rejected'
    })
    .eq('id', paymentId)

  if (error) {
    throw new Error(`Failed to reject payment: ${error.message}`)
  }

  return true
}
