'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Wrench, User, Clock, Package, CloudOff } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { NewServiceNoteModal } from '@/components/workshop/NewServiceNoteModal'
import { NoteEditor } from '@/components/workshop/station/NoteEditor'
import { SyncStatusBar } from '@/components/workshop/station/SyncStatusBar'
import { useStationCatalog, useStationNotes, useStationStatus } from '@/lib/offline/workshop/useStation'
import { offlineDb } from '@/lib/offline/database'
import { trpc } from '@/lib/trpc/client'

const OUTLET_KEY = 'lakupos-outlet'

function timeAgo(iso: string, language: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  const id = language !== 'en'
  if (minutes < 60) return id ? `${minutes} menit lalu` : `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return id ? `${hours} jam lalu` : `${hours} h ago`
  const days = Math.round(hours / 24)
  return id ? `${days} hari lalu` : `${days} d ago`
}

/**
 * The workshop cashier station: open notes and the note editor on one route, so
 * moving between them needs no server round trip and keeps working offline. The
 * note being edited is in ?note=, changed with history.pushState.
 */
function ServiceNotesStation() {
  const { t, language } = useLanguage()
  const params = useSearchParams()
  const noteId = params.get('note')
  const [chosenOutletId, setChosenOutletId] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem(OUTLET_KEY) ?? '' } catch { return '' }
  })
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [, setTick] = useState(0)

  const status = useStationStatus()
  const online = status.reachable === 'online'
  const catalogAll = useStationCatalog()
  const outlets = catalogAll.outlets
  const outletId = outlets.some((o) => o.id === chosenOutletId) ? chosenOutletId : (outlets[0]?.id ?? '')
  const catalog = useStationCatalog(outletId)
  const station = useStationNotes(catalog.lookups)

  // Keep the open shift on this computer as soon as it exists, so cash can still
  // be taken if the internet drops before the next full refresh.
  const { data: liveShift } = trpc.shifts.getActive.useQuery({ outletId }, { enabled: online && !!outletId, retry: false })
  useEffect(() => {
    if (!liveShift || !outletId) return
    void offlineDb.transaction('rw', offlineDb.wsShifts, async () => {
      await offlineDb.wsShifts.where('outletId').equals(outletId).delete()
      await offlineDb.wsShifts.put({ id: liveShift.id, outletId, deviceId: liveShift.device_id ?? null })
    })
  }, [liveShift, outletId])

  const go = (id: string | null) => {
    window.history.pushState(null, '', id ? `/pos/notes?note=${id}` : '/pos/notes')
    setTick((x) => x + 1)
  }

  const chooseOutlet = (id: string) => {
    setChosenOutletId(id)
    try { localStorage.setItem(OUTLET_KEY, id) } catch {}
  }

  if (noteId) {
    return (
      <div className="space-y-4">
        <SyncStatusBar status={status} notes={station} snapshotAt={catalog.snapshotAt} />
        <NoteEditor key={noteId} noteId={noteId} catalog={catalog} station={station} online={online} onBack={() => go(null)} />
      </div>
    )
  }

  // Open notes, plus notes paid or cancelled here that the server has not confirmed yet.
  const notes = station.notes
    .filter((n) => n.outletId === outletId && (n.status === 'open' || station.unsyncedNoteIds.has(n.id)))
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt))
  const neverSynced = catalog.ready && !catalog.snapshotAt

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('workshop.notes.title')}
        subtitle={t('workshop.notes.subtitle')}
        action={
          <Button onClick={() => setIsNewOpen(true)} disabled={!outletId}>
            <Plus className="w-4 h-4 mr-1" /> {t('workshop.notes.new')}
          </Button>
        }
      />

      <SyncStatusBar status={status} notes={station} snapshotAt={catalog.snapshotAt} />

      {neverSynced && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('workshop.offline.neverSynced')}</p>
      )}

      {outlets.length > 1 && (
        <div className="max-w-xs">
          <Select
            label={t('workshop.notes.outlet')}
            value={outletId}
            onChange={(e) => chooseOutlet(e.target.value)}
            options={outlets.map((o) => ({ value: o.id, label: o.name }))}
          />
        </div>
      )}

      {catalog.ready && !neverSynced && notes.length === 0 && (
        <EmptyState
          icon={<Wrench className="w-10 h-10" />}
          title={t('workshop.notes.emptyTitle')}
          description={t('workshop.notes.emptyBody')}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {notes.map((note) => {
          const unsynced = station.unsyncedNoteIds.has(note.id)
          const label = [note.vehicle.brand, note.vehicle.model].filter(Boolean).join(' ')
          return (
            <button
              key={note.id}
              onClick={() => go(note.id)}
              className="glass-surface text-left rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-[#0F5F56] hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-2xl font-extrabold tracking-wider text-gray-900 dark:text-white">{note.vehicle.plateNumber}</p>
                  {label && <p className="text-sm text-gray-500">{label}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {note.customer?.isMember && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                      {t('workshop.member')}
                    </span>
                  )}
                  {note.status !== 'open' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                      {note.status === 'paid' ? t('workshop.note.statusPaid') : t('workshop.note.statusCancelled')}
                    </span>
                  )}
                  {unsynced && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                      <CloudOff className="w-3 h-3" /> {t('workshop.offline.notSent')}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {note.customer?.name ?? t('workshop.walkIn')}</p>
                <p className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> {note.mechanic?.name ?? t('workshop.noMechanic')}</p>
                <p className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {note.items.length} {t('workshop.notes.items')}</p>
                <p className="flex items-center gap-1.5 text-gray-400"><Clock className="w-3.5 h-3.5" /> {timeAgo(note.openedAt, language)}</p>
              </div>
            </button>
          )
        })}
      </div>

      {outletId && (
        <NewServiceNoteModal
          isOpen={isNewOpen}
          onClose={() => setIsNewOpen(false)}
          outletId={outletId}
          catalog={catalog}
          station={station}
          online={online}
          onOpened={(id) => { setIsNewOpen(false); go(id) }}
        />
      )}
    </div>
  )
}

export default function ServiceNotesPage() {
  return (
    <Suspense fallback={null}>
      <ServiceNotesStation />
    </Suspense>
  )
}
