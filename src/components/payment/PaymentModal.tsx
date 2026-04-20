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
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { QRISDisplay } from './QRISDisplay'
import { BankTransferDisplay } from './BankTransferDisplay'
import { CashPaymentDisplay } from './CashPaymentDisplay'
import { EWalletDisplay } from './EWalletDisplay'
import { createPayment, confirmPayment } from '@/lib/payment/payment-service'
import type { PaymentMethod, PaymentResult } from '@/lib/payment/payment-service'

interface PaymentModalProps {
  transactionId: string
  amount: number
  customerName?: string
  customerPhone?: string
  userId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId: string, paymentMethod: PaymentMethod) => void
  onError?: (error: string) => void
}

type PaymentStep = 'method' | 'processing' | 'cash' | 'qris' | 'bank_transfer' | 'ewallet' | 'completed'

export function PaymentModal({
  transactionId,
  amount,
  customerName,
  customerPhone,
  userId,
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

  if (!isOpen) return null

  const handleMethodSelect = async (method: PaymentMethod) => {
    console.log('🔵 Payment method selected:', method)
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
    setLoading(true)
    setError('')

    try {
      const change = cashGiven ? cashGiven - amount : undefined
      const result = await createPayment({
        transactionId,
        amount,
        method,
        customerName,
        customerPhone,
        notes: cashGiven ? `Tunai: ${cashGiven} | Kembalian: ${change}` : undefined
      })

      setPaymentResult(result)
      setStep('completed')

      // Auto-close and trigger success after 1 second
      setTimeout(() => {
        onSuccess(result.paymentId, method)
        onClose()
      }, 1000)
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal memproses pembayaran'
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
      const result = await createPayment({
        transactionId,
        amount,
        method: 'qris',
        customerName,
        customerPhone
      })

      setPaymentResult(result)
      setStep('qris')
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal generate QRIS'
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
      const result = await createPayment({
        transactionId,
        amount,
        method: 'bank_transfer',
        customerName,
        customerPhone
      })

      setPaymentResult(result)
      setStep('bank_transfer')
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal memproses transfer bank'
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
      const result = await createPayment({
        transactionId,
        amount,
        method: 'ewallet',
        customerName,
        customerPhone
      })

      setPaymentResult(result)
      setStep('ewallet')
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal memproses pembayaran e-wallet'
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
      await confirmPayment({
        paymentId: paymentResult.paymentId,
        confirmedBy: userId
      })

      setStep('completed')

      setTimeout(() => {
        onSuccess(paymentResult.paymentId, selectedMethod)
        onClose()
      }, 1500)
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal konfirmasi pembayaran'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
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
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-base md:text-2xl">✕</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-red-700 font-medium">❌ {error}</p>
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

              {/* Debug info */}
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                Step: {step} | Selected: {selectedMethod} | Loading: {loading.toString()}
              </div>

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
              bankAccountId={paymentResult.bankAccountId!}
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
                <span className="text-6xl">✓</span>
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
