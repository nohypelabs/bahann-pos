'use client'

import { CloudOff } from 'lucide-react'
import { CashPaymentDisplay } from '@/components/payment/CashPaymentDisplay'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  amount: number
  onConfirm: (cashGiven: number) => void
  onClose: () => void
}

/** Cash payment while the server cannot be reached: recorded on the station, sent later. */
export function OfflineCashModal({ amount, onConfirm, onClose }: Props) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('workshop.offline.payTitle')}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-3 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <CloudOff className="w-4 h-4 flex-shrink-0" /> {t('workshop.offline.payNotice')}
        </p>
        <CashPaymentDisplay amount={amount} onConfirm={onConfirm} onCancel={onClose} />
      </div>
    </div>
  )
}
