'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, History, ShieldAlert } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function formatDuration(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  const minutes = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Who from the platform entered this tenant, why, for how long, and how many
 * actions they performed. Collapsed by default so it does not clutter the page.
 */
export function ImpersonationHistory({ tenantId }: { tenantId: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = trpc.impersonation.history.useQuery(
    { tenantId, limit: 20, offset: 0 },
    { enabled: open },
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {t('impersonation.history.title')}
          </span>
          {typeof data?.total === 'number' && data.total > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {data.total}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {isLoading && (
            <p className="px-4 py-6 text-center text-xs text-gray-400">{t('common.loading')}</p>
          )}

          {!isLoading && (data?.sessions.length ?? 0) === 0 && (
            <p className="px-4 py-6 text-center text-xs text-gray-400">
              {t('impersonation.history.empty')}
            </p>
          )}

          {(data?.sessions ?? []).map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-1.5 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  {session.impersonatorName}
                  <span className="font-normal text-gray-400">({session.impersonatorEmail})</span>
                </span>
                {session.endedAt ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    {t('impersonation.history.ended')}
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {t('impersonation.history.active')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span>
                  <span className="font-semibold">{t('impersonation.history.started')}:</span>{' '}
                  {formatDateTime(session.startedAt)}
                </span>
                <span>
                  <span className="font-semibold">{t('impersonation.history.duration')}:</span>{' '}
                  {formatDuration(session.startedAt, session.endedAt)}
                </span>
                <span>
                  <span className="font-semibold">{t('impersonation.history.actions')}:</span>{' '}
                  {session.actionCount}
                </span>
              </div>

              <p className="text-[11px] italic text-gray-500 dark:text-gray-400">
                <span className="font-semibold not-italic">
                  {t('impersonation.history.reason')}:
                </span>{' '}
                {session.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
