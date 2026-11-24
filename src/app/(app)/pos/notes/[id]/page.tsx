'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, ScanLine, Search, Trash2, Ticket, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionCard } from '@/components/ui/SectionCard'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'
import { useToast } from '@/components/ui/Toast'
import { StampProgress } from '@/components/workshop/StampProgress'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'

export default function ServiceNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const note = trpc.workshop.notes.get.useQuery({ id })
  const mechanics = trpc.workshop.mechanics.list.useQuery()

  const setItem = trpc.workshop.notes.setItem.useMutation()
  const update = trpc.workshop.notes.update.useMutation()
  const cancel = trpc.workshop.notes.cancel.useMutation()

  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  // Unsaved edits to the service details; null shows what the server has.
  const [draft, setDraft] = useState<{ mechanicId: string; complaint: string; odometer: string } | null>(null)

  const n = note.data
  const isOpen = n?.status === 'open'
  const details = draft ?? {
    mechanicId: n?.mechanic?.id ?? '',
    complaint: n?.complaint ?? '',
    odometer: n?.odometerKm == null ? '' : String(n.odometerKm),
  }
  const detailsDirty = draft !== null
  const setDetails = (next: typeof details) => setDraft(next)

  // Search on the server: a workshop has hundreds of parts, more than one product page holds.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])
  const results = trpc.products.getAll.useQuery({ search: term, limit: 8 }, { enabled: term.length >= 2 })
  const matches = term.length >= 2 ? (results.data?.products ?? []) : []

  const fail = (err: unknown) => showToast(workshopErrorMessage(err, language), 'error')
  // The open-notes list shows item counts, so it goes stale with the note.
  const refresh = () => Promise.all([
    utils.workshop.notes.get.invalidate({ id }),
    utils.workshop.notes.listOpen.invalidate(),
  ])

  const changeQty = async (productId: string, quantity: number, unitPrice: number | null) => {
    try {
      await setItem.mutateAsync({ id, productId, quantity, unitPrice })
      await refresh()
    } catch (err) { fail(err) }
  }

  const addProduct = async (productId: string) => {
    const existing = n?.items.find((i) => i.productId === productId)
    await changeQty(productId, (existing?.quantity ?? 0) + 1, existing?.unitPrice ?? null)
    setSearch('')
  }

  /** A scanned or typed barcode/SKU, matched exactly; otherwise the only search result. */
  const findByCode = async (code: string) => {
    const c = code.trim()
    if (!c) return undefined
    const { products } = await utils.products.getAll.fetch({ search: c, limit: 8 })
    const exact = products.find((p) => p.barcode === c) ?? products.find((p) => p.sku.toUpperCase() === c.toUpperCase())
    return exact ?? (products.length === 1 ? products[0] : undefined)
  }

  const submitSearch = async () => {
    const pick = await findByCode(search)
    if (pick) await addProduct(pick.id)
    else if (search.trim()) showToast(t('workshop.note.notFound').replace('{code}', search.trim()), 'error')
  }

  const onScan = async (code: string) => {
    setScannerOpen(false)
    const p = await findByCode(code)
    if (p) await addProduct(p.id)
    else showToast(t('workshop.note.notFound').replace('{code}', code), 'error')
  }

  const saveDetails = async () => {
    try {
      await update.mutateAsync({
        id,
        mechanicId: details.mechanicId || null,
        complaint: details.complaint || null,
        odometerKm: details.odometer.trim() ? Number(details.odometer.replace(/\D/g, '')) : null,
      })
      await refresh()
      setDraft(null)
      showToast(t('workshop.note.saved'), 'success')
    } catch (err) { fail(err) }
  }

  const confirmCancel = async () => {
    try {
      await cancel.mutateAsync({ id, reason: cancelReason })
      await utils.workshop.notes.listOpen.invalidate()
      showToast(t('workshop.note.cancelled'), 'success')
      router.push('/pos/notes')
    } catch (err) { fail(err) }
  }

  if (note.error) {
    return (
      <div className="space-y-3">
        <Link href="/pos/notes" className="inline-flex items-center gap-1 text-sm text-[#0F5F56]"><ArrowLeft className="w-4 h-4" /> {t('workshop.notes.title')}</Link>
        <p className="text-sm text-red-600">{workshopErrorMessage(note.error, language)}</p>
      </div>
    )
  }
  if (!n) return <p className="text-center py-16 text-gray-400 text-sm">{t('common.loading')}</p>

  const priceOf = (i: (typeof n.items)[number]) => i.unitPrice ?? i.listPrice
  const subtotal = n.items.reduce((s, i) => s + priceOf(i) * i.quantity, 0)

  return (
    <div className="space-y-4 md:space-y-6">
      <Link href="/pos/notes" className="inline-flex items-center gap-1 text-sm text-[#0F5F56]">
        <ArrowLeft className="w-4 h-4" /> {t('workshop.notes.title')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold tracking-wider text-gray-900 dark:text-white">{n.vehicle.plateNumber}</p>
          <p className="text-sm text-gray-500">{[n.vehicle.brand, n.vehicle.model].filter(Boolean).join(' ')}</p>
          {!isOpen && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
              {n.status === 'paid' ? t('workshop.note.statusPaid') : t('workshop.note.statusCancelled')}
            </span>
          )}
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{n.customer?.name ?? t('workshop.walkIn')}</p>
          {n.customer?.isMember && <p className="text-xs font-bold text-teal-700">{t('workshop.member')} {n.customer.memberCode}</p>}
          {n.stampCard && <div className="mt-1 inline-block text-left"><StampProgress card={n.stampCard} /></div>}
          {n.vouchers.length > 0 && (
            <p className="mt-1 flex items-center justify-end gap-1 text-teal-700">
              <Ticket className="w-4 h-4" /> {t('workshop.vouchersAvailable').replace('{n}', String(n.vouchers.length))}
            </p>
          )}
        </div>
      </div>

      <SectionCard title={t('workshop.note.details')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label={t('workshop.mechanic')}
            value={details.mechanicId}
            disabled={!isOpen}
            onChange={(e) => { setDetails({ ...details, mechanicId: e.target.value }) }}
            options={[{ value: '', label: t('workshop.noMechanic') }, ...(mechanics.data ?? []).map((m) => ({ value: m.id, label: m.name }))]}
            fullWidth
          />
          <Input
            label={t('workshop.odometer')}
            value={details.odometer}
            disabled={!isOpen}
            inputMode="numeric"
            onChange={(e) => { setDetails({ ...details, odometer: e.target.value }) }}
            fullWidth
          />
        </div>
        <div className="mt-3">
          <Textarea
            label={t('workshop.complaint')}
            value={details.complaint}
            disabled={!isOpen}
            onChange={(e) => { setDetails({ ...details, complaint: e.target.value }) }}
            fullWidth
          />
        </div>
        {isOpen && detailsDirty && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveDetails} disabled={update.isPending}>{t('common.save')}</Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('workshop.note.items')}>
        {isOpen && (
          <div className="mb-4">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submitSearch() }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('workshop.note.searchItem')}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => setScannerOpen(true)} aria-label={t('workshop.note.scan')}>
                <ScanLine className="w-4 h-4" />
              </Button>
            </form>
            {matches.length > 0 && (
              <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {matches.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p.id)} className="w-full flex justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span className="text-left">
                      {p.item_type === 'SERVICE' && <Wrench className="inline w-3.5 h-3.5 mr-1 text-teal-600" />}
                      {p.name} <span className="text-gray-400">{p.sku}</span>
                    </span>
                    <span className="font-semibold">{formatCurrency(p.price ?? 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {n.items.length === 0 ? (
          <p className="text-sm text-gray-400">{t('workshop.note.noItems')}</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {n.items.map((i) => (
              <div key={i.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium text-sm">
                    {i.itemType === 'SERVICE' && <Wrench className="inline w-3.5 h-3.5 mr-1 text-teal-600" />}
                    {i.productName}
                  </p>
                  <p className="text-xs text-gray-400">{i.productSku}</p>
                </div>
                {i.itemType === 'SERVICE' && isOpen ? (
                  <input
                    key={`${i.id}-${i.unitPrice}`}
                    defaultValue={priceOf(i)}
                    inputMode="numeric"
                    aria-label={t('workshop.note.agreedPrice')}
                    title={t('workshop.note.agreedPrice')}
                    onBlur={(e) => {
                      const v = Number(e.target.value.replace(/\D/g, ''))
                      if (v !== priceOf(i)) changeQty(i.productId, i.quantity, v === i.listPrice ? null : v)
                    }}
                    className="w-28 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-right text-sm"
                  />
                ) : (
                  <span className="w-28 text-right text-sm">{formatCurrency(priceOf(i))}</span>
                )}
                <div className="flex items-center gap-1">
                  {isOpen && (
                    <button onClick={() => changeQty(i.productId, i.quantity - 1, i.unitPrice)} className="p-1.5 rounded-lg border" aria-label="-">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                  {isOpen && (
                    <button onClick={() => changeQty(i.productId, i.quantity + 1, i.unitPrice)} className="p-1.5 rounded-lg border" aria-label="+">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="w-28 text-right text-sm font-semibold">{formatCurrency(priceOf(i) * i.quantity)}</span>
                {isOpen && (
                  <button onClick={() => changeQty(i.productId, 0, null)} className="p-1.5 text-red-500" aria-label={t('common.delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {isOpen && (
        <div className="sticky bottom-0 z-30 -mx-4 md:mx-0 rounded-none md:rounded-2xl border-t md:border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">{t('workshop.note.subtotal')}</p>
              <p className="text-xl font-extrabold">{formatCurrency(subtotal)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCancelOpen(true)}>{t('workshop.note.cancel')}</Button>
              <Button disabled title={t('workshop.note.payComingSoon')}>{t('workshop.note.pay')}</Button>
            </div>
          </div>
        </div>
      )}

      {scannerOpen && <BarcodeScanner onScan={onScan} onClose={() => setScannerOpen(false)} />}

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title={t('workshop.note.cancelTitle')} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('workshop.note.cancelBody')}</p>
          <Textarea label={t('workshop.note.cancelReason')} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} fullWidth />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('common.back')}</Button>
            <Button variant="danger" onClick={confirmCancel} disabled={!cancelReason.trim() || cancel.isPending}>{t('workshop.note.cancelConfirm')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
