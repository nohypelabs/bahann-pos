'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, LogOut } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { exitImpersonationDisplay } from '@/lib/impersonation/client'

/**
 * Persistent reminder that the platform operator is acting as a tenant, with the
 * way out. Rendered above the app chrome so it can never be scrolled away.
 */
export function ImpersonationBanner() {
  const { t } = useLanguage()
  const { data } = trpc.impersonation.current.useQuery(undefined, { staleTime: 15_000 })
  const endMutation = trpc.impersonation.end.useMutation()

  const expiresAtMs = data?.impersonating && data.expiresAt ? new Date(data.expiresAt).getTime() : null

  // Recompute the remaining time on a timer rather than setting state inside the
  // effect body, which React Compiler flags.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAtMs) return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [expiresAtMs])

  if (!data?.impersonating) return null

  const minutesLeft = expiresAtMs ? Math.max(0, Math.floor((expiresAtMs - now) / 60000)) : null

  const handleExit = async () => {
    try {
      await endMutation.mutateAsync()
    } catch {
      // Exiting must always work, even offline: the server session expires on its
      // own and the cookie is cleared on the next request.
    }
    exitImpersonationDisplay()
    // Full reload so cached queries from the impersonated tenant are discarded and
    // the session is re-derived from the JWT.
    window.location.href = '/admin/tenants'
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-3 dark:border-amber-700/50 dark:from-amber-950/40 dark:to-orange-950/40"
    >
      <div className="flex min-w-0 items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 animate-pulse text-amber-600 dark:text-amber-400" />
        <span className="truncate text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
          {t('impersonation.banner.label')}
          {': '}
          <span className="font-extrabold">{data.tenantName}</span>
          <span className="font-normal normal-case tracking-normal opacity-80">
            {' '}
            ({data.targetName})
          </span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-[11px] font-medium text-amber-800 dark:text-amber-300 sm:inline">
          {t('impersonation.banner.note')}
          {minutesLeft !== null && ` · ${minutesLeft} ${t('impersonation.banner.minutesShort')}`}
        </span>
        <button
          type="button"
          onClick={handleExit}
          disabled={endMutation.isPending}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t('impersonation.banner.exit')}
        </button>
      </div>
    </div>
  )
}
