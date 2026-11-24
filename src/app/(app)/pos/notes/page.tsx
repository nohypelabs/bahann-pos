'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wrench, User, Clock, Package } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import { NewServiceNoteModal } from '@/components/workshop/NewServiceNoteModal'

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

export default function ServiceNotesPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  // Same outlet as the cashier screen, so switching between them keeps context.
  const [chosenOutletId, setChosenOutletId] = useState(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem(OUTLET_KEY) ?? '' } catch { return '' }
  })
  const [isNewOpen, setIsNewOpen] = useState(false)

  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = useMemo(() => outletsResponse?.outlets ?? [], [outletsResponse])
  const outletId = outlets.some((o) => o.id === chosenOutletId) ? chosenOutletId : (outlets[0]?.id ?? '')

  const notes = trpc.workshop.notes.listOpen.useQuery(
    { outletId },
    { enabled: !!outletId, refetchInterval: 15_000 },
  )

  const chooseOutlet = (id: string) => {
    setChosenOutletId(id)
    try { localStorage.setItem(OUTLET_KEY, id) } catch {}
  }

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

      {notes.error && (
        <p className="text-sm text-red-600">{workshopErrorMessage(notes.error, language)}</p>
      )}

      {notes.data && notes.data.length === 0 && (
        <EmptyState
          icon={<Wrench className="w-10 h-10" />}
          title={t('workshop.notes.emptyTitle')}
          description={t('workshop.notes.emptyBody')}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {notes.data?.map((note) => (
          <button
            key={note.id}
            onClick={() => router.push(`/pos/notes/${note.id}`)}
            className="text-left rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-[#0F5F56] hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-extrabold tracking-wider text-gray-900 dark:text-white">{note.plateNumber}</p>
                {note.vehicleLabel && <p className="text-sm text-gray-500">{note.vehicleLabel}</p>}
              </div>
              {note.isMember && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {t('workshop.member')}
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {note.customerName ?? t('workshop.walkIn')}</p>
              <p className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> {note.mechanicName ?? t('workshop.noMechanic')}</p>
              <p className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {note.itemCount} {t('workshop.notes.items')}</p>
              <p className="flex items-center gap-1.5 text-gray-400"><Clock className="w-3.5 h-3.5" /> {timeAgo(note.openedAt, language)}</p>
            </div>
          </button>
        ))}
      </div>

      {outletId && (
        <NewServiceNoteModal
          isOpen={isNewOpen}
          onClose={() => setIsNewOpen(false)}
          outletId={outletId}
          onOpened={(id) => { setIsNewOpen(false); router.push(`/pos/notes/${id}`) }}
        />
      )}
    </div>
  )
}
