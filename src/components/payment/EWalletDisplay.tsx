'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'

interface EWalletDisplayProps {
  amount: number
  transactionId: string
  expiresAt?: Date
  onCancel?: () => void
  onConfirm?: () => void
}

const WALLETS = [
  { name: 'GoPay', icon: '🟢', color: 'from-green-500 to-green-600' },
  { name: 'DANA', icon: '🔵', color: 'from-blue-500 to-blue-600' },
]

export function EWalletDisplay({
  amount,
  transactionId,
  expiresAt,
  onCancel,
  onConfirm
}: EWalletDisplayProps) {
  const { data: settings } = trpc.payments.getSettings.useQuery()
  const ewalletPhone = settings?.ewallet.phone || process.env.NEXT_PUBLIC_SUPPORT_WA || '-'

  const [copied, setCopied] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [selectedWallet, setSelectedWallet] = useState<string>('GoPay')

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const remaining = expiresAt.getTime() - Date.now()
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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const wallet = WALLETS.find(w => w.name === selectedWallet)!

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-base md:text-2xl font-bold text-gray-900 mb-2">E-Wallet</h2>
        <p className="text-gray-600">Pilih aplikasi e-wallet dan transfer ke nomor berikut</p>
      </div>

      {/* Wallet Selector */}
      <div className="flex gap-3">
        {WALLETS.map(w => (
          <button
            key={w.name}
            onClick={() => setSelectedWallet(w.name)}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              selectedWallet === w.name
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
          >
            {w.icon} {w.name}
          </button>
        ))}
      </div>

      {/* Phone Number Card */}
      <div className={`bg-gradient-to-br ${wallet.color} rounded-2xl p-3 md:p-6 text-white shadow-lg`}>
        <div className="space-y-4">
          <div>
            <p className="text-sm opacity-80 mb-1">Kirim ke nomor {selectedWallet}</p>
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
              <p className="text-base md:text-2xl font-mono font-bold tracking-wider">{ewalletPhone}</p>
              <button
                onClick={() => copyToClipboard(ewalletPhone, 'phone')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
              >
                {copied === 'phone' ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Jumlah Transfer</p>
        <div className="flex items-center justify-between">
          <p className="text-xs md:text-lg md:text-3xl font-bold text-yellow-600">
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
        <p className="text-xs text-gray-500 mt-2">Transfer dengan nominal EXACT</p>
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
            <span className={`text-sm font-semibold ${timeRemaining === 'Expired' ? 'text-red-600' : 'text-green-600'}`}>
              {timeRemaining || 'Calculating...'}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Cara Pembayaran ({selectedWallet}):</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2"><span className="font-bold">1.</span><span>Buka aplikasi {selectedWallet} di HP Anda</span></li>
          <li className="flex gap-2"><span className="font-bold">2.</span><span>Pilih menu "Kirim" atau "Transfer"</span></li>
          <li className="flex gap-2"><span className="font-bold">3.</span><span>Masukkan nomor: <strong>{ewalletPhone}</strong></span></li>
          <li className="flex gap-2"><span className="font-bold">4.</span><span>Masukkan nominal: <strong>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)}</strong></span></li>
          <li className="flex gap-2"><span className="font-bold">5.</span><span>Isi catatan/berita: <strong>{transactionId}</strong></span></li>
          <li className="flex gap-2"><span className="font-bold">6.</span><span>Konfirmasi dan selesaikan transfer</span></li>
          <li className="flex gap-2"><span className="font-bold">7.</span><span>Tunjukkan bukti transfer ke kasir</span></li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel} className="flex-1">
            Batal
          </Button>
        )}
        {onConfirm && (
          <Button variant="primary" size="lg" onClick={onConfirm} className="flex-1">
            Sudah Transfer - Konfirmasi
          </Button>
        )}
      </div>
    </div>
  )
}
