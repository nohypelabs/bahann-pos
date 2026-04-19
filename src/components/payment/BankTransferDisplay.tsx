/**
 * Bank Transfer Display Component
 *
 * Shows bank account details for manual transfer
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { getBankAccount } from '@/lib/payment/payment-service'

interface BankTransferDisplayProps {
  bankAccountId: string
  amount: number
  transactionId: string
  expiresAt?: Date
  onCancel?: () => void
  onConfirm?: () => void
}

export function BankTransferDisplay({
  bankAccountId,
  amount,
  transactionId,
  expiresAt,
  onCancel,
  onConfirm
}: BankTransferDisplayProps) {
  const [bankAccount, setBankAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    loadBankAccount()
  }, [bankAccountId])

  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const now = new Date()
      const remaining = expiresAt.getTime() - now.getTime()

      if (remaining <= 0) {
        setTimeRemaining('Expired')
        clearInterval(interval)
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        setTimeRemaining(`${hours} jam ${minutes} menit`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  async function loadBankAccount() {
    try {
      const data = await getBankAccount(bankAccountId)
      setBankAccount(data)
    } catch (error) {
      console.error('Failed to load bank account:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!bankAccount) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Data rekening bank tidak ditemukan</p>
      </div>
    )
  }

  const config = (bankAccount.account_details as any) || {}
  const bankName = config.bankName || process.env.NEXT_PUBLIC_BANK_NAME || '-'
  const accountNumber = config.accountNumber || process.env.NEXT_PUBLIC_BANK_ACCOUNT || '-'
  const accountHolder = config.accountHolder || process.env.NEXT_PUBLIC_BANK_HOLDER || '-'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Bank</h2>
        <p className="text-gray-600">
          Transfer ke rekening di bawah ini
        </p>
      </div>

      {/* Bank Account Info */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="space-y-4">
          {/* Bank Name */}
          <div>
            <p className="text-sm opacity-80 mb-1">Nama Bank</p>
            <p className="text-2xl font-bold">{bankName}</p>
          </div>

          {/* Account Number */}
          <div>
            <p className="text-sm opacity-80 mb-1">Nomor Rekening</p>
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
              <p className="text-xl font-mono font-bold tracking-wider">
                {accountNumber}
              </p>
              <button
                onClick={() => copyToClipboard(accountNumber, 'account')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                {copied === 'account' ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Account Holder */}
          <div>
            <p className="text-sm opacity-80 mb-1">Atas Nama</p>
            <p className="text-lg font-semibold">{accountHolder}</p>
          </div>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Jumlah Transfer</p>
        <div className="flex items-center justify-between">
          <p className="text-3xl font-bold text-yellow-600">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0
            }).format(amount)}
          </p>
          <button
            onClick={() => copyToClipboard(amount.toString(), 'amount')}
            className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-lg transition-colors font-medium"
          >
            {copied === 'amount' ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Transfer dengan nominal EXACT (tidak lebih, tidak kurang)
        </p>
      </div>

      {/* Transaction Info */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">ID Transaksi</span>
          <span className="text-sm font-mono text-gray-900">{transactionId}</span>
        </div>

        {expiresAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Berlaku hingga</span>
            <span className={`text-sm font-semibold ${
              timeRemaining === 'Expired' ? 'text-red-600' : 'text-green-600'
            }`}>
              {timeRemaining || 'Calculating...'}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Cara Pembayaran:</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Buka aplikasi mobile banking atau internet banking Anda</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Pilih menu "Transfer" atau "Transfer Antar Bank"</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Masukkan nomor rekening: <strong>{accountNumber}</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Pastikan nama penerima: <strong>{accountHolder}</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>Masukkan nominal transfer: <strong>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
              }).format(amount)}
            </strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">6.</span>
            <span>Isi berita transfer dengan: <strong>{transactionId}</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">7.</span>
            <span>Konfirmasi dan selesaikan transfer</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">8.</span>
            <span>Screenshot atau simpan bukti transfer</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">9.</span>
            <span>Tunjukkan bukti transfer ke kasir untuk konfirmasi</span>
          </li>
        </ol>
      </div>

      {/* Important Notice */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <h4 className="font-semibold text-red-900 mb-2">⚠️ Penting:</h4>
        <ul className="space-y-1 text-sm text-red-700">
          <li>• Transfer harus EXACT sesuai nominal yang tertera</li>
          <li>• Sertakan ID transaksi di berita transfer</li>
          <li>• Simpan bukti transfer untuk konfirmasi</li>
          <li>• Pembayaran akan diverifikasi manual oleh kasir</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onCancel}
            className="flex-1"
          >
            Batal
          </Button>
        )}
        {onConfirm && (
          <Button
            variant="primary"
            size="lg"
            onClick={onConfirm}
            className="flex-1"
          >
            Sudah Transfer - Konfirmasi
          </Button>
        )}
      </div>
    </div>
  )
}
