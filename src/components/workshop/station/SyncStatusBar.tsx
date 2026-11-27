'use client'

import { useState } from 'react'
import { AlertTriangle, CloudOff, RefreshCw, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import type { WsOutboxItem } from '@/lib/offline/database'
import { discardFailed, retryFailed, sync } from '@/lib/offline/workshop/station'
import type { StationNotes } from '@/lib/offline/workshop/useStation'

interface Props {
  status: { reachable: 'online' | 'offline'; syncing: boolean; lastSyncError: string | null }
  notes: StationNotes
  snapshotAt: string | null
}

const KIND_LABEL: Record<string, string> = {
  'customer.create': 'workshop.offline.kind.customer',
  'note.open': 'workshop.offline.kind.open',
  'note.update': 'workshop.offline.kind.update',
  'note.setItem': 'workshop.offline.kind.item',
  'note.cancel': 'workshop.offline.kind.cancel',
  'note.payCash': 'workshop.offline.kind.pay',
}

/** Online/offline, what is waiting to be sent, and what the server refused. */
export function SyncStatusBar({ status, notes, snapshotAt }: Props) {
  const { t, language } = useLanguage()
  const [showFailed, setShowFailed] = useState(false)
  const offline = status.reachable === 'offline'
  const waiting = notes.pending.length
  const time = (iso: string | null) => iso
    ? new Date(iso).toLocaleTimeString(language === 'en' ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="space-y-2">
      <div
        role="status"
        className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5 text-sm ${
          offline ? 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200' : 'border-teal-200 bg-teal-50/60 text-teal-900 dark:bg-teal-900/10 dark:text-teal-200'
        }`}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          {offline ? <CloudOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
          {offline ? t('workshop.offline.offline') : t('workshop.offline.online')}
        </span>
        <span>
          {waiting > 0
            ? t('workshop.offline.waiting').replace('{n}', String(waiting))
            : t('workshop.offline.allSent')}
        </span>
        <span className="text-xs opacity-70">{t('workshop.offline.dataAt').replace('{time}', time(snapshotAt))}</span>
        {notes.failed.length > 0 && (
          <button onClick={() => setShowFailed(!showFailed)} className="flex items-center gap-1 font-semibold text-red-700 underline">
            <AlertTriangle className="w-4 h-4" /> {t('workshop.offline.failedCount').replace('{n}', String(notes.failed.length))}
          </button>
        )}
        {notes.foreign > 0 && <span className="text-xs text-red-700">{t('workshop.offline.foreign').replace('{n}', String(notes.foreign))}</span>}
        <span className="ml-auto">
          <Button size="sm" variant="secondary" onClick={() => void sync({ snapshot: true })} disabled={status.syncing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${status.syncing ? 'animate-spin' : ''}`} /> {t('workshop.offline.syncNow')}
          </Button>
        </span>
      </div>
      {offline && <p className="text-xs text-amber-800 dark:text-amber-300">{t('workshop.offline.offlineHelp')}</p>}

      {showFailed && notes.failed.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
          <p className="text-sm font-semibold text-red-800">{t('workshop.offline.failedTitle')}</p>
          {notes.failed.map((item: WsOutboxItem) => (
            <div key={item.seq} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{t(KIND_LABEL[item.kind] ?? item.kind)}</span>
              <span className="text-red-700">{workshopErrorMessage(new Error(item.error ?? ''), language)}</span>
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => void retryFailed(item)}>{t('workshop.offline.retry')}</Button>
                <Button size="sm" variant="outline" onClick={() => void discardFailed(item.seq!)}>{t('workshop.offline.discard')}</Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
