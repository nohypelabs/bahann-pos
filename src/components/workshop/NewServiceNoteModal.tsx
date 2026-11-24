'use client'

import { useState } from 'react'
import { Search, Bike, User, Ticket, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import { normalizePlate } from '@/domain/workshop/rules'
import { enqueue, newId } from '@/lib/offline/workshop/station'
import type { StationCatalog, StationNotes } from '@/lib/offline/workshop/useStation'
import { StampProgress } from './StampProgress'

interface Props {
  isOpen: boolean
  onClose: () => void
  outletId: string
  catalog: StationCatalog
  station: StationNotes
  online: boolean
  onOpened: (noteId: string) => void
}

type OwnerChoice =
  | { kind: 'none' }
  | { kind: 'existing'; id: string; name: string }
  | { kind: 'new'; name: string; phone: string; member: boolean }

/**
 * Opens a service note for a plate. Motors, owners and open notes come from the
 * station's cache, so this works offline; online it also shows the stamp card and
 * the last services.
 */
export function NewServiceNoteModal({ isOpen, onClose, outletId, catalog, station, online, onOpened }: Props) {
  const { t, language } = useLanguage()
  const [plateInput, setPlateInput] = useState('')
  const [plate, setPlate] = useState('')
  const [plateError, setPlateError] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [owner, setOwner] = useState<OwnerChoice>({ kind: 'none' })
  const [customerQuery, setCustomerQuery] = useState('')
  const [mechanicId, setMechanicId] = useState('')
  const [complaint, setComplaint] = useState('')
  const [odometer, setOdometer] = useState('')
  const [saving, setSaving] = useState(false)

  const vehicle = plate ? catalog.lookups.vehicles.get(plate) ?? null : null
  const knownOwner = vehicle?.customerId ? catalog.lookups.customers.get(vehicle.customerId) ?? null : null
  const openNote = plate ? station.notes.find((n) => n.status === 'open' && n.vehicle.plateNumber === plate) ?? null : null

  // Online extras for a known motor: stamp card, vouchers, last services.
  const extras = trpc.workshop.vehicles.lookup.useQuery({ plate }, { enabled: online && !!vehicle, retry: false })
  const found = extras.data

  const q = customerQuery.trim().toLowerCase()
  const customerMatches = owner.kind === 'none' && q.length >= 2
    ? catalog.customers.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q) || (c.memberCode ?? '').toLowerCase().includes(q)).slice(0, 5)
    : []

  const reset = () => {
    setPlateInput(''); setPlate(''); setPlateError(''); setBrand(''); setModel(''); setOwner({ kind: 'none' })
    setCustomerQuery(''); setMechanicId(''); setComplaint(''); setOdometer('')
  }
  const close = () => { reset(); onClose() }

  const check = () => {
    try {
      setPlate(normalizePlate(plateInput))
      setPlateError('')
    } catch (err) {
      setPlate('')
      setPlateError(workshopErrorMessage(new Error((err as { code?: string }).code ?? ''), language))
    }
  }

  const submit = async () => {
    if (!plate || openNote) return
    setSaving(true)
    try {
      const at = new Date().toISOString()
      let customerId: string | null = knownOwner?.id ?? null
      if (!knownOwner && owner.kind === 'existing') customerId = owner.id
      if (!knownOwner && owner.kind === 'new') {
        customerId = newId()
        await enqueue({
          kind: 'customer.create', opId: newId(), at,
          customer: { id: customerId, name: owner.name.trim(), phone: owner.phone || null, member: owner.member },
        })
      }
      const id = newId()
      await enqueue({
        kind: 'note.open', opId: newId(), at,
        note: {
          id, outletId, plate,
          brand: vehicle ? null : brand || null,
          model: vehicle ? null : model || null,
          customerId,
          mechanicId: mechanicId || null,
          complaint: complaint || null,
          odometerKm: odometer.trim() ? Number(odometer.replace(/\D/g, '')) : null,
        },
      })
      reset()
      onOpened(id)
    } finally {
      setSaving(false)
    }
  }

  const ownerReady = !!knownOwner || owner.kind !== 'new' || owner.name.trim().length > 0

  return (
    <Modal isOpen={isOpen} onClose={close} title={t('workshop.newNote.title')} size="lg">
      <div className="space-y-4">
        <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); check() }}>
          <div className="flex-1">
            <Input
              label={t('workshop.plate')}
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              placeholder="B 1234 XYZ"
              autoFocus
              fullWidth
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!plateInput.trim()}>
            <Search className="w-4 h-4 mr-1" /> {t('workshop.newNote.check')}
          </Button>
        </form>

        {plateError && <p className="text-sm text-red-600">{plateError}</p>}

        {openNote && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">{t('workshop.newNote.hasOpen')}</p>
              <Button size="sm" className="mt-2" onClick={() => { const id = openNote.id; reset(); onOpened(id) }}>
                {t('workshop.newNote.openExisting')}
              </Button>
            </div>
          </div>
        )}

        {plate && !openNote && (
          <>
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <p className="flex items-center gap-2 font-semibold"><Bike className="w-4 h-4" /> {plate}</p>
              {vehicle ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || t('workshop.newNote.noVehicleDetail')}
                  </p>
                  {found && found.recentServices.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <p className="font-semibold mb-1">{t('workshop.newNote.recent')}</p>
                      {found.recentServices.map((s) => (
                        <p key={s.id}>
                          {new Date(s.closedAt ?? s.openedAt).toLocaleDateString(language === 'en' ? 'en-GB' : 'id-ID')}
                          {' · '}{s.items.map((i) => i.productName).join(', ')}
                          {s.odometerKm ? ` · ${s.odometerKm.toLocaleString('id-ID')} km` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">{t('workshop.newNote.newVehicle')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label={t('workshop.brand')} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Honda" fullWidth />
                    <Input label={t('workshop.model')} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Beat" fullWidth />
                  </div>
                </>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <p className="flex items-center gap-2 font-semibold"><User className="w-4 h-4" /> {t('workshop.customer')}</p>
              {knownOwner ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    {knownOwner.name}
                    {knownOwner.isMember && <span className="ml-2 text-xs font-bold text-teal-700">{knownOwner.memberCode}</span>}
                  </p>
                  {found?.stampCard && <StampProgress card={found.stampCard} />}
                  {found && found.vouchers.length > 0 && (
                    <p className="flex items-center gap-1.5 text-sm text-teal-700">
                      <Ticket className="w-4 h-4" /> {t('workshop.vouchersAvailable').replace('{n}', String(found.vouchers.length))}
                    </p>
                  )}
                </div>
              ) : owner.kind === 'existing' ? (
                <div className="flex items-center justify-between text-sm">
                  <span>{owner.name}</span>
                  <button className="text-[#0F5F56] underline" onClick={() => setOwner({ kind: 'none' })}>{t('workshop.change')}</button>
                </div>
              ) : owner.kind === 'new' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input label={t('workshop.name')} value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} fullWidth />
                    <Input label={t('workshop.phone')} value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} inputMode="tel" placeholder="08…" fullWidth />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={owner.member} onChange={(e) => setOwner({ ...owner, member: e.target.checked })} />
                    {t('workshop.newNote.makeMember')}
                  </label>
                  <button className="text-sm text-gray-500 underline" onClick={() => setOwner({ kind: 'none' })}>{t('common.cancel')}</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder={t('workshop.newNote.searchCustomer')}
                    fullWidth
                  />
                  {customerMatches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setOwner({ kind: 'existing', id: c.id, name: c.name })}
                      className="block w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {c.name}{c.phone ? ` · ${c.phone}` : ''}{c.isMember ? ` · ${c.memberCode}` : ''}
                    </button>
                  ))}
                  <div className="flex gap-3 text-sm">
                    <button className="text-[#0F5F56] underline" onClick={() => setOwner({ kind: 'new', name: customerQuery, phone: '', member: false })}>
                      {t('workshop.newNote.newCustomer')}
                    </button>
                    <span className="text-gray-400">{t('workshop.newNote.orWalkIn')}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                label={t('workshop.mechanic')}
                value={mechanicId}
                onChange={(e) => setMechanicId(e.target.value)}
                options={[{ value: '', label: t('workshop.noMechanic') }, ...catalog.mechanics.map((m) => ({ value: m.id, label: m.name }))]}
                fullWidth
              />
              <Input
                label={t('workshop.odometer')}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                inputMode="numeric"
                placeholder="12345"
                fullWidth
              />
            </section>
            <Textarea label={t('workshop.complaint')} value={complaint} onChange={(e) => setComplaint(e.target.value)} rows={2} fullWidth />
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} disabled={!plate || !!openNote || !ownerReady || saving}>
            {saving ? t('common.loading') : t('workshop.newNote.open')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
