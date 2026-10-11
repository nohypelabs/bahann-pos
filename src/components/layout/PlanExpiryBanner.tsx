'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, Clock, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const WARN_DAYS = 3

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })
}

/**
 * Warns the tenant before its trial or paid period ends and during the grace
 * period, when access still works but will drop to Free.
 */
export function PlanExpiryBanner() {
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(false)
  const { data } = trpc.auth.getPlan.useQuery(undefined, { staleTime: 5 * 60 * 1000 })

  if (dismissed || !data || data.storedPlan === 'free' || data.daysLeft === null) return null

  const planName = data.storedPlan.charAt(0).toUpperCase() + data.storedPlan.slice(1)
  const kind = data.isTrial ? t('plan.expiry.trial') : t('plan.expiry.subscription')
  let message: string

  if (data.inGrace && data.accessEndsAt) {
    message = t('plan.expiry.grace')
      .replace('{kind}', kind).replace('{plan}', planName).replace('{date}', formatDate(data.accessEndsAt))
  } else if (data.daysLeft >= 0 && data.daysLeft <= WARN_DAYS && data.periodEndsAt) {
    message = t('plan.expiry.soon')
      .replace('{kind}', kind).replace('{plan}', planName).replace('{date}', formatDate(data.periodEndsAt))
  } else {
    return null
  }

  const urgent = data.inGrace
  return (
    <div className={`border-b px-4 py-3 mb-4 ${urgent
      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50'
      : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {urgent
            ? <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            : <Clock className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
          <p className="text-sm text-gray-800 dark:text-gray-100">{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/settings/subscriptions"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0f5f56] hover:bg-[#0b4e48]">
            {t('plan.expiry.renew')}
          </Link>
          <button onClick={() => setDismissed(true)} aria-label={t('plan.expiry.dismiss')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
