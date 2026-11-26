/**
 * Payment Modal
 *
 * Main payment flow component that handles:
 * - Payment method selection
 * - QRIS display
 * - Bank transfer display
 * - Payment confirmation
 */

'use client'

import { useState } from 'react'
import { Check, X, XCircle } from 'lucide-react'
import { PaymentMethodSelector, type PaymentMethod } from './PaymentMethodSelector'
import { QRISDisplay } from './QRISDisplay'
import { BankTransferDisplay } from './BankTransferDisplay'
import { CashPaymentDisplay } from './CashPaymentDisplay'
import { EWalletDisplay } from './EWalletDisplay'
import { trpc } from '@/lib/trpc/client'
import type { DiscountReason, ManualDiscount } from '@/domain/sales/manualDiscount'
import { friendlyError } from '@/lib/errors/friendlyError'

type CheckoutItem = {
  productId: string
  productName?: string
  productSku?: string
  quantity: number
  unitPrice?: number
  priceOverride?: { unitPrice: number; reason: DiscountReason; note?: string | null }
}

type PaymentResult = {
  paymentId: string
  status: string | null
  method: PaymentMethod
  amount: number
  transactionId: string
  transactionNumber: string
  qrisImage?: string
  qrisString?: string
  bankAccountId?: string
  displayDetails?: Record<string, unknown> | null
  expiresAt?: Date
  loyalty?: LoyaltyOutcome | null
}

/** Stamp-card result of a workshop sale (see src/server/lib/workshopSale.ts). */
export type LoyaltyOutcome = { awarded: boolean; balance?: number; required?: number; vouchers?: string[] }

/** What the receipt needs about a finished payment. */
export interface PaidTransaction {
  id: string
  number: string
  /** Cash handed over (the total for non-cash methods). */
  amountPaid: number
  change: number
}

interface PaymentModalProps {
  transactionId: string
  outletId: string
  shiftId: string
  deviceId?: string | null
  amount: number
  items: CheckoutItem[]
  discountAmount?: number
  /** The cashier's amount off the whole sale, with its reason (not for service notes). */
  manualDiscount?: ManualDiscount | null
  notes?: string
  customerName?: string
  customerPhone?: string
  /** Paying a workshop service note: the server takes items, prices and discount from the note. */
  serviceOrderId?: string
  voucherCode?: string
  /** Called when the cashier leaves without paying a checkout that was already started. */
  onAbandonPending?: (paymentId: string) => void
  isOpen: boolean
  onClose: () => void
  onSuccess: (
    paymentId: string,
    paymentMethod: PaymentMethod,
    transaction?: PaidTransaction,
    loyalty?: LoyaltyOutcome | null,
  ) => void
  onError?: (error: string) => void
}

type PaymentStep = 'method' | 'processing' | 'cash' | 'qris' | 'bank_transfer' | 'ewallet' | 'completed'

function getErrorMessage(error: unknown, fallback: string) {
  return friendlyError(error, fallback)
}

export function PaymentModal({
  transactionId,
  outletId,
  shiftId,
  deviceId,
  amount,
  items,
  discountAmount = 0,
  manualDiscount,
  notes,
  customerName,
  customerPhone,
  serviceOrderId,
  voucherCode,
  onAbandonPending,
  isOpen,
  onClose,
  onSuccess,
  onError
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('method')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash')
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const startCheckout = trpc.payments.startCheckout.useMutation()
  const confirmCheckout = trpc.payments.confirmCheckout.useMutation()

  if (!isOpen) return null

  const startPayment = async (method: PaymentMethod, amountPaid?: number) => {
    if (!outletId || !shiftId) {
      throw new Error('Shift kasir belum aktif. Buka shift sebelum checkout online.')
    }

    return startCheckout.mutateAsync({
      transactionId,
      outletId,
      shiftId,
      deviceId: deviceId ?? undefined,
      method,
      amountPaid,
      items,
      discountAmount,
      manualDiscount: manualDiscount ?? undefined,
      notes,
      customerName,
      customerPhone,
      serviceOrderId,
      voucherCode,
    })
  }

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method)

    // Cash — show change calculator first
    if (method === 'cash') {
      setStep('cash')
      return
    }

    // Debit/credit - instant payment
    if (method === 'debit' || method === 'credit') {
      await processInstantPayment(method)
    }
  }

  const processInstantPayment = async (method: PaymentMethod, cashGiven?: number) => {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const amountPaid = cashGiven ?? amount
      const result = await startPayment(method, amountPaid)

      setPaymentResult(result)
      setStep('completed')

      // Auto-close and trigger success after 1 second
      setTimeout(() => {
        onSuccess(result.paymentId, method, {
          id: result.transactionId,
          number: result.transactionNumber,
          amountPaid,
          change: Math.max(0, amountPaid - amount),
        }, result.loyalty)
        onClose()
      }, 1000)
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Gagal memproses pembayaran')
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const processQRISPayment = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await startPayment('qris')

      setPaymentResult(result)
      setStep('qris')
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Gagal generate QRIS')
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const processBankTransfer = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await startPayment('bank_transfer')

      setPaymentResult(result)
      setStep('bank_transfer')
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Gagal memproses transfer bank')
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const processEWalletPayment = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await startPayment('ewallet')

      setPaymentResult(result)
      setStep('ewallet')
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Gagal memproses pembayaran e-wallet')
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!paymentResult) return

    setLoading(true)
    setError('')

    try {
      const confirmed = await confirmCheckout.mutateAsync({
        paymentId: paymentResult.paymentId,
      })

      setStep('completed')

      setTimeout(() => {
        onSuccess(paymentResult.paymentId, selectedMethod, {
          id: paymentResult.transactionId,
          number: paymentResult.transactionNumber,
          amountPaid: amount,
          change: 0,
        }, confirmed.loyalty)
        onClose()
      }, 1500)
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Gagal konfirmasi pembayaran')
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (paymentResult && paymentResult.status !== 'paid' && step !== 'completed') {
      onAbandonPending?.(paymentResult.paymentId)
    }
    setStep('method')
    setSelectedMethod('cash')
    setPaymentResult(null)
    setError('')
  }

  const handleClose = () => {
    handleCancel()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-3 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <h2 className="text-base md:text-2xl font-bold text-gray-900">
              {step === 'method' && 'Pembayaran'}
              {step === 'qris' && 'QRIS Payment'}
              {step === 'cash' && 'Pembayaran Tunai'}
              {step === 'bank_transfer' && 'Bank Transfer'}
              {step === 'ewallet' && 'E-Wallet'}
              {step === 'completed' && 'Pembayaran Berhasil'}
            </h2>
            <button
              onClick={handleClose}
              aria-label="Tutup"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="flex items-start gap-2 text-red-700 font-medium"><XCircle className="w-5 h-5 shrink-0 mt-0.5" /> {error}</p>
            </div>
          )}

          {/* Step: Method Selection */}
          {step === 'method' && (
            <div className="space-y-3 md:space-y-6">
              <PaymentMethodSelector
                value={selectedMethod}
                onChange={handleMethodSelect}
                amount={amount}
                disabled={loading}
              />


              {selectedMethod === 'qris' && (
                <button
                  onClick={processQRISPayment}
                  disabled={loading}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating QRIS...' : 'Lanjut ke QRIS'}
                </button>
              )}

              {selectedMethod === 'bank_transfer' && (
                <button
                  onClick={processBankTransfer}
                  disabled={loading}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Lanjut ke Transfer Bank'}
                </button>
              )}

              {selectedMethod === 'ewallet' && (
                <button
                  onClick={processEWalletPayment}
                  disabled={loading}
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Lanjut ke E-Wallet'}
                </button>
              )}
            </div>
          )}

          {/* Step: QRIS Display */}
          {step === 'qris' && paymentResult && (
            <QRISDisplay
              qrisImage={paymentResult.qrisImage!}
              amount={amount}
              transactionId={transactionId}
              expiresAt={paymentResult.expiresAt}
              onCancel={handleCancel}
              onConfirm={handleConfirmPayment}
            />
          )}

          {/* Step: Cash */}
          {step === 'cash' && (
            <CashPaymentDisplay
              amount={amount}
              loading={loading}
              onCancel={handleCancel}
              onConfirm={(cashGiven) => processInstantPayment('cash', cashGiven)}
            />
          )}

          {/* Step: E-Wallet Display */}
          {step === 'ewallet' && paymentResult && (
            <EWalletDisplay
              amount={amount}
              transactionId={transactionId}
              expiresAt={paymentResult.expiresAt}
              onCancel={handleCancel}
              onConfirm={handleConfirmPayment}
            />
          )}

          {/* Step: Bank Transfer Display */}
          {step === 'bank_transfer' && paymentResult && (
            <BankTransferDisplay
              bankAccount={paymentResult.displayDetails}
              amount={amount}
              transactionId={transactionId}
              expiresAt={paymentResult.expiresAt}
              onCancel={handleCancel}
              onConfirm={handleConfirmPayment}
            />
          )}

          {/* Step: Completed */}
          {step === 'completed' && (
            <div className="text-center py-4 md:py-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-base md:text-2xl font-bold text-gray-900 mb-2">
                Pembayaran Berhasil!
              </h3>
              <p className="text-gray-600">
                Transaksi telah dikonfirmasi
              </p>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && step !== 'method' && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Processing...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
