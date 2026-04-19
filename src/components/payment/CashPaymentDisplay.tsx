'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface CashPaymentDisplayProps {
  amount: number
  onConfirm: (cashGiven: number) => void
  onCancel?: () => void
  loading?: boolean
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000]

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export function CashPaymentDisplay({ amount, onConfirm, onCancel, loading }: CashPaymentDisplayProps) {
  const [cashGiven, setCashGiven] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const change = cashGiven - amount
  const isEnough = cashGiven >= amount

  // Smart quick amounts: show denominations >= amount, plus extras
  const smartQuickAmounts = QUICK_AMOUNTS.filter(d => d >= amount)
  // Also add the exact amount if not already in the list
  const displayAmounts = smartQuickAmounts.length > 0
    ? smartQuickAmounts
    : QUICK_AMOUNTS.filter((_, i) => i >= QUICK_AMOUNTS.findIndex(d => d >= amount / 2))

  function selectQuick(val: number) {
    setCashGiven(val)
    setInputValue(val.toLocaleString('id-ID'))
    inputRef.current?.blur()
  }

  function handleInput(raw: string) {
    const numeric = raw.replace(/\D/g, '')
    setInputValue(numeric ? Number(numeric).toLocaleString('id-ID') : '')
    setCashGiven(numeric ? Number(numeric) : 0)
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Pembayaran Tunai</h2>
        <p className="text-gray-500 text-sm">Masukkan jumlah uang yang diterima</p>
      </div>

      {/* Total */}
      <div className="bg-gray-50 rounded-2xl p-5 text-center">
        <p className="text-sm font-medium text-gray-500 mb-1">Total Belanja</p>
        <p className="text-4xl font-bold text-gray-900">{formatRupiah(amount)}</p>
      </div>

      {/* Quick denominations */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Uang Diterima</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map(val => (
            <button
              key={val}
              onClick={() => selectQuick(val)}
              disabled={val < amount}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                cashGiven === val
                  ? 'border-blue-500 bg-blue-500 text-white shadow-md scale-105'
                  : val < amount
                  ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {val >= 1000 ? `${val / 1000}K` : val}
            </button>
          ))}
        </div>
      </div>

      {/* Manual input */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Atau masukkan nominal lain</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={e => handleInput(e.target.value)}
            placeholder="0"
            className="w-full pl-12 pr-4 py-4 text-2xl font-bold text-right border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Change display */}
      <div className={`rounded-2xl p-5 transition-all ${
        cashGiven === 0
          ? 'bg-gray-50'
          : isEnough
          ? 'bg-green-50 border-2 border-green-200'
          : 'bg-red-50 border-2 border-red-200'
      }`}>
        {cashGiven === 0 ? (
          <p className="text-center text-gray-400 text-sm">Kembalian akan tampil di sini</p>
        ) : isEnough ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Kembalian</p>
              <p className="text-3xl font-bold text-green-600">{formatRupiah(change)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600">Diterima</p>
              <p className="text-lg font-semibold text-green-700">{formatRupiah(cashGiven)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-red-600">Uang kurang</p>
            <p className="text-2xl font-bold text-red-500">{formatRupiah(Math.abs(change))}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel} className="flex-1" disabled={loading}>
            Batal
          </Button>
        )}
        <Button
          variant="primary"
          size="lg"
          onClick={() => onConfirm(cashGiven)}
          disabled={!isEnough || loading}
          className="flex-1"
        >
          {loading ? 'Memproses...' : `Konfirmasi · Kembalian ${isEnough ? formatRupiah(change) : '—'}`}
        </Button>
      </div>
    </div>
  )
}
