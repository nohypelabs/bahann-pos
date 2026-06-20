/**
 * Payment Method Selector
 *
 * Allows users to select payment method (Cash, QRIS, Bank Transfer, etc.)
 */

'use client'

import { type ReactNode } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Banknote, Smartphone, Building2, Wallet, CreditCard, DollarSign, Check } from 'lucide-react'

export type PaymentMethod = 'cash' | 'qris' | 'bank_transfer' | 'ewallet' | 'debit' | 'credit'

interface PaymentMethodOption {
  id: string
  type: PaymentMethod
  name: string
  icon: ReactNode
  description?: string
  isActive: boolean
}

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  amount: number
  disabled?: boolean
}

export function PaymentMethodSelector({
  value,
  onChange,
  amount,
  disabled = false
}: PaymentMethodSelectorProps) {
  const { data, isLoading } = trpc.payments.getActiveMethods.useQuery()

  function mapDatabaseCodeToType(code: string): PaymentMethod {
    // Map database payment method codes to PaymentMethod types
    const mapping: Record<string, PaymentMethod> = {
      'cash': 'cash',
      'qris_static': 'qris',
      'bank_transfer': 'bank_transfer',
      'debit_card': 'debit',
      'credit_card': 'credit',
      'ewallet_manual': 'ewallet'
    }
    return mapping[code] || 'cash'
  }

  function getMethodIcon(type: string): ReactNode {
    const icons: Record<string, ReactNode> = {
      cash: <Banknote className="w-6 h-6" />,
      qris: <Smartphone className="w-6 h-6" />,
      bank_transfer: <Building2 className="w-6 h-6" />,
      ewallet: <Wallet className="w-6 h-6" />,
      debit: <CreditCard className="w-6 h-6" />,
      credit: <CreditCard className="w-6 h-6" />,
    }
    return icons[type] || <DollarSign className="w-6 h-6" />
  }

  const fallbackMethods: PaymentMethodOption[] = [
    { id: 'cash', type: 'cash', name: 'Cash', icon: <Banknote className="w-6 h-6" />, isActive: true },
  ]

  const methods: PaymentMethodOption[] = data && data.length > 0
    ? data.map((method) => {
      const mappedType = mapDatabaseCodeToType(method.code)
      return {
        id: method.id,
        type: mappedType,
        name: method.name,
        icon: getMethodIcon(mappedType),
        description: method.instructions ?? undefined,
        isActive: method.is_active === true,
      }
    })
    : fallbackMethods

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs md:text-lg font-semibold text-gray-900">Pilih Metode Pembayaran</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            disabled={disabled || !method.isActive}
            onClick={() => onChange(method.type)}
            className={`
              relative p-4 rounded-xl border-2 transition-all
              ${value === method.type
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
              ${disabled || !method.isActive
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:shadow-md'
              }
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-gray-700">{method.icon}</span>
              <span className="text-sm font-semibold text-gray-900 text-center">
                {method.name}
              </span>
              {method.description && (
                <span className="text-xs text-gray-500 text-center">
                  {method.description}
                </span>
              )}
            </div>

            {value === method.type && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Amount Display */}
      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Total Pembayaran:</span>
          <span className="text-base md:text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0
            }).format(amount)}
          </span>
        </div>
      </div>
    </div>
  )
}
