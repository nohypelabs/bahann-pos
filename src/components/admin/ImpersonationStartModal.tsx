'use client'

import { useState } from 'react'
import { Crown, ShieldAlert, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { enterImpersonationDisplay } from '@/lib/impersonation/client'

const REASON_PRESETS = [
  'impersonation.start.reason.ticket',
  'impersonation.start.reason.bug',
  'impersonation.start.reason.ownerRequest',
  'impersonation.start.reason.paymentIssue',
] as const

interface ImpersonationStartModalProps {
  tenantId: string
  tenantName: string
  onClose: () => void
}

/**
 * Entry point for superadmin impersonation. A reason is mandatory: the project's
 * multi-tenant audit requires that platform access to tenant data is never silent.
 */
export function ImpersonationStartModal({ tenantId, tenantName, onClose }: ImpersonationStartModalProps) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const startMutation = trpc.impersonation.start.useMutation()

  const handleStart = async () => {
    const trimmed = reason.trim()
    if (trimmed.length < 3) {
      setError(t('impersonation.start.reasonRequired'))
      return
    }

    setError(null)
    try {
      const result = await startMutation.mutateAsync({ tenantId, reason: trimmed })

      // Display-only: authorization comes from the server session projection.
      enterImpersonationDisplay({ name: result.targetName, email: result.targetEmail, role: 'admin' })

      // Full reload so every cached query from the platform view is discarded.
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {t('impersonation.start.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tenantName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label={t('common.cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
          {t('impersonation.start.description')}
        </p>

        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-200">
          {t('impersonation.start.reasonLabel')}
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REASON_PRESETS.map((preset) => {
            const label = t(preset)
            const active = reason === label
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(label)}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t('impersonation.start.reasonPlaceholder')}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />

        {error && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={startMutation.isPending}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
          >
            <Crown className="h-4 w-4" />
            {startMutation.isPending ? t('common.loading') : t('impersonation.start.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
