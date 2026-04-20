/**
 * QRIS Display Component
 *
 * Shows QRIS QR code with payment instructions
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'

interface QRISDisplayProps {
  qrisImage: string
  amount: number
  transactionId: string
  expiresAt?: Date
  onCancel?: () => void
  onConfirm?: () => void
}

export function QRISDisplay({
  qrisImage,
  amount,
  transactionId,
  expiresAt,
  onCancel,
  onConfirm
}: QRISDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')

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
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  const downloadQRIS = () => {
    const link = document.createElement('a')
    link.href = qrisImage
    link.download = `qris-${transactionId}.png`
    link.click()
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-base md:text-2xl font-bold text-gray-900 mb-2">Scan QRIS untuk Bayar</h2>
        <p className="text-gray-600">
          Gunakan aplikasi e-wallet atau mobile banking untuk scan QR code
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="relative p-3 md:p-6 bg-white rounded-2xl shadow-lg border-2 border-gray-200">
          <div className="relative w-80 h-80 bg-white rounded-xl overflow-hidden">
            <Image
              src={qrisImage}
              alt="QRIS QR Code"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Download Button */}
          <button
            onClick={downloadQRIS}
            className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
            title="Download QR Code"
          >
            <span className="text-sm md:text-xl">⬇️</span>
          </button>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Total Pembayaran</span>
          <span className="text-base md:text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0
            }).format(amount)}
          </span>
        </div>

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
            <span>Buka aplikasi e-wallet (GoPay, OVO, Dana, ShopeePay, dll) atau mobile banking</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Pilih menu "Scan QR" atau "QRIS"</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Arahkan kamera ke QR code di atas</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Pastikan nominal sudah sesuai: <strong>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
              }).format(amount)}
            </strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>Konfirmasi pembayaran di aplikasi Anda</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">6.</span>
            <span>Setelah berhasil, tunjukkan bukti pembayaran ke kasir untuk konfirmasi</span>
          </li>
        </ol>
      </div>

      {/* Supported Apps */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">Didukung oleh semua aplikasi QRIS:</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">
            GoPay
          </span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">
            OVO
          </span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">
            Dana
          </span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">
            ShopeePay
          </span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">
            LinkAja
          </span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">
            + Mobile Banking
          </span>
        </div>
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
            Sudah Bayar - Konfirmasi
          </Button>
        )}
      </div>
    </div>
  )
}
