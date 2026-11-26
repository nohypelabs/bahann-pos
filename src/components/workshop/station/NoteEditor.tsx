'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, BadgePercent, CloudOff, Minus, Pencil, Plus, ScanLine, Search, Trash2, Ticket, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionCard } from '@/components/ui/SectionCard'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'
import { useToast } from '@/components/ui/Toast'
import { StampProgress } from '@/components/workshop/StampProgress'
import { PaymentModal, type LoyaltyOutcome, type PaidTransaction } from '@/components/payment/PaymentModal'
import { PrintPreviewModal } from '@/components/print/PrintPreviewModal'
import type { ReceiptData } from '@/components/print/PrintReceipt'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, generateTransactionId } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import { voucherDiscount } from '@/domain/workshop/rules'
import type { VoucherReward } from '@/domain/entities/Workshop'
import type { WsNote } from '@/lib/offline/database'
import { lineTotal } from '@/lib/offline/workshop/reducer'
import { enqueue, flush, newId, sync } from '@/lib/offline/workshop/station'
import type { StationCatalog, StationNotes } from '@/lib/offline/workshop/useStation'
import { OfflineCashModal } from './OfflineCashModal'
import { OpenShiftModal } from '@/components/shift/OpenShiftModal'
import { PriceOverrideModal, type PriceChange } from '@/components/discount/PriceOverrideModal'
import { ManualDiscountModal } from '@/components/discount/ManualDiscountModal'
import type { DiscountJustification, ManualDiscount } from '@/domain/sales/manualDiscount'

interface Props {
  noteId: string
  catalog: StationCatalog
  station: StationNotes
  online: boolean
  onBack: () => void
}

const now = () => new Date().toISOString()

function cashierName(): string {
  try { return JSON.parse(localStorage.getItem('user') ?? '{}').name || 'Kasir' } catch { return 'Kasir' }
}

export function NoteEditor({ noteId, catalog, station, online, onBack }: Props) {
  const { t, language } = useLanguage()
  const { showToast } = useToast()

  const n: WsNote | undefined = station.notes.find((x) => x.id === noteId)
  const unsynced = station.unsyncedNoteIds.has(noteId)
  const outletId = n?.outletId ?? ''

  // Online extras: the member's stamp card and vouchers, and the live shift.
  const serverNote = trpc.workshop.notes.get.useQuery({ id: noteId }, { enabled: online && !unsynced && n?.status === 'open', retry: false })
  const { data: liveShift } = trpc.shifts.getActive.useQuery({ outletId }, { enabled: online && !!outletId, retry: false })
  const { data: profile } = trpc.auth.getProfile.useQuery(undefined, { enabled: online, retry: false })
  const abandonCheckout = trpc.workshop.notes.abandonCheckout.useMutation()
  const cachedShift = catalog.shifts.find((s) => s.outletId === outletId) ?? null
  const shift = liveShift ? { id: liveShift.id, deviceId: liveShift.device_id ?? null } : cachedShift

  const [payOpen, setPayOpen] = useState(false)
  const [offlinePayOpen, setOfflinePayOpen] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [txRef, setTxRef] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [draft, setDraft] = useState<{ mechanicId: string; complaint: string; odometer: string } | null>(null)
  /** The line whose price is being changed, and the price typed so far. */
  const [priceEdit, setPriceEdit] = useState<{ productId: string; price: number } | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim().toLowerCase()), 150)
    return () => clearTimeout(timer)
  }, [search])

  // A note paid online leaves the open list on the next sync, possibly while its
  // receipt is on screen. The receipt is the fragment's second child in both views
  // below, so React keeps the same dialog instead of remounting it.
  const receiptModal = receipt && (
    <PrintPreviewModal isOpen onClose={() => { setReceipt(null); onBack() }} receiptData={receipt} />
  )

  if (!n) {
    return (
      <>
        <div className="space-y-3">
          <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-[#0F5F56]"><ArrowLeft className="w-4 h-4" /> {t('workshop.notes.title')}</button>
          {!receipt && <p className="text-sm text-gray-500">{t('workshop.offline.noteGone')}</p>}
        </div>
        {receiptModal}
      </>
    )
  }

  const isOpen = n.status === 'open'
  const details = draft ?? {
    mechanicId: n.mechanic?.id ?? '',
    complaint: n.complaint ?? '',
    odometer: n.odometerKm == null ? '' : String(n.odometerKm),
  }
  const priceOf = (i: WsNote['items'][number]) => i.unitPrice ?? i.listPrice
  const subtotal = lineTotal(n)

  // Searched in the cached catalogue, so it works offline and is instant.
  const matches = term.length >= 2
    ? catalog.products.filter((p) =>
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || (p.barcode ?? '').includes(term)).slice(0, 8)
    : []

  // Vouchers are redeemed online only: offline, two stations could spend the same one.
  const vouchers = online && !unsynced ? (serverNote.data?.vouchers ?? []) : []
  const stampCard = online ? serverNote.data?.stampCard ?? null : null
  const voucher = vouchers.find((v) => v.code === voucherCode) ?? null
  let voucherCut = 0
  let voucherProblem = ''
  if (voucher) {
    try {
      voucherCut = voucherDiscount(voucher.reward, n.items.map((i) => ({ itemType: i.itemType, unitPrice: priceOf(i), quantity: i.quantity })))
    } catch (err) {
      voucherProblem = workshopErrorMessage(err instanceof Error ? new Error((err as { code?: string }).code ?? err.message) : err, language)
    }
  }
  // The cashier's amount off the whole note comes after the voucher.
  const manual = n.discount ?? null
  const manualCut = manual?.amount ?? 0
  const discount = voucherCut + manualCut
  const total = subtotal - discount
  const discountProblem = manualCut > 0 && manualCut > subtotal - voucherCut
  const canPay = isOpen && n.items.length > 0 && !!shift && !voucherProblem && !discountProblem

  type Line = WsNote['items'][number]
  const setItem = (productId: string, quantity: number, unitPrice: number | null, why: DiscountJustification | null = null) =>
    enqueue({
      kind: 'note.setItem', opId: newId(), at: now(), noteId, productId, quantity, unitPrice,
      priceReason: why?.reason ?? null, priceNote: why?.note ?? null,
    })
  /** A line's saved reason, sent again when only its quantity changes. */
  const keptReason = (i: Line): DiscountJustification | null => (i.priceReason ? { reason: i.priceReason, note: i.priceNote ?? null } : null)

  const addProduct = async (productId: string) => {
    const existing = n.items.find((i) => i.productId === productId)
    await setItem(productId, (existing?.quantity ?? 0) + 1, existing?.unitPrice ?? null, existing ? keptReason(existing) : null)
    setSearch('')
  }

  const savePrice = async (i: Line, change: PriceChange) => {
    await setItem(i.productId, i.quantity, change.unitPrice === i.listPrice ? null : change.unitPrice, change.justification)
    setPriceEdit(null)
  }

  const saveDiscount = async (d: ManualDiscount | null) => {
    await enqueue({
      kind: 'note.setDiscount', opId: newId(), at: now(), noteId,
      amount: d?.amount ?? 0, reason: d?.reason ?? null, note: d?.note ?? null,
    })
    setDiscountOpen(false)
  }

  /** A scanned or typed barcode/SKU, matched exactly; otherwise the only search result. */
  const findByCode = (code: string) => {
    const c = code.trim()
    if (!c) return undefined
    const exact = catalog.products.find((p) => p.barcode === c) ?? catalog.products.find((p) => p.sku.toUpperCase() === c.toUpperCase())
    return exact ?? (matches.length === 1 ? matches[0] : undefined)
  }

  const submitSearch = async () => {
    const pick = findByCode(search)
    if (pick) await addProduct(pick.id)
    else if (search.trim()) showToast(t('workshop.note.notFound').replace('{code}', search.trim()), 'error')
  }

  const onScan = async (code: string) => {
    setScannerOpen(false)
    const p = findByCode(code)
    if (p) await addProduct(p.id)
    else showToast(t('workshop.note.notFound').replace('{code}', code), 'error')
  }

  const saveDetails = async () => {
    await enqueue({
      kind: 'note.update', opId: newId(), at: now(), noteId,
      mechanicId: details.mechanicId || null,
      complaint: details.complaint || null,
      odometerKm: details.odometer.trim() ? Number(details.odometer.replace(/\D/g, '')) : null,
    })
    setDraft(null)
    showToast(t('workshop.note.saved'), 'success')
  }

  const confirmCancel = async () => {
    await enqueue({ kind: 'note.cancel', opId: newId(), at: now(), noteId, reason: cancelReason.trim() })
    showToast(t('workshop.note.cancelled'), 'success')
    onBack()
  }

  const describeReward = (r: VoucherReward) =>
    r.type === 'free_service'
      ? t('workshop.voucher.freeService') + (r.maxValue ? ` (maks ${formatCurrency(r.maxValue)})` : '')
      : r.type === 'fixed' ? `-${formatCurrency(r.amount)}` : `-${r.percent}%`

  const outlet = catalog.outlets.find((o) => o.id === n.outletId)
  const makeReceipt = (args: { number: string; method: string; amountPaid: number; change: number; loyalty?: LoyaltyOutcome | null; offline?: boolean }): ReceiptData => {
    const at = new Date()
    return {
      transactionId: args.number,
      date: at.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cashier: profile?.name ?? cashierName(),
      outlet: { name: outlet?.name ?? 'Laku POS', address: outlet?.address ?? '', phone: profile?.whatsappNumber ?? '', email: profile?.email ?? '' },
      items: n.items.map((i) => ({
        name: i.productName, sku: i.productSku, quantity: i.quantity, unitPrice: priceOf(i), total: priceOf(i) * i.quantity,
        listPrice: i.listPrice,
      })),
      subtotal, tax: 0, discount, total,
      payment: { method: args.method, amount: args.amountPaid, change: args.change },
      notes: args.offline ? t('workshop.offline.receiptNote') : undefined,
      workshop: {
        plate: n.vehicle.plateNumber,
        vehicle: [n.vehicle.brand, n.vehicle.model].filter(Boolean).join(' ') || undefined,
        mechanic: n.mechanic?.name,
        odometerKm: n.odometerKm,
        member: n.customer?.isMember ? { name: n.customer.name, code: n.customer.memberCode ?? '' } : undefined,
        voucherUsed: voucher ? { code: voucher.code, discount: voucherCut } : undefined,
        stamps: args.loyalty?.required ? { balance: args.loyalty.balance ?? 0, required: args.loyalty.required } : undefined,
        newVouchers: args.loyalty?.vouchers?.length ? args.loyalty.vouchers : undefined,
      },
    }
  }

  /** Online: send this note's changes first, then the normal checkout. Otherwise cash on the station. */
  const startPay = async () => {
    setPreparing(true)
    try {
      const allSent = online && await flush()
      if (allSent) {
        setTxRef(generateTransactionId())
        setPayOpen(true)
      } else {
        setVoucherCode('')
        setOfflinePayOpen(true)
      }
    } finally {
      setPreparing(false)
    }
  }

  const onPaid = async (_paymentId: string, method: string, tx?: PaidTransaction, loyalty?: LoyaltyOutcome | null) => {
    setReceipt(makeReceipt({ number: tx?.number ?? txRef, method, amountPaid: tx?.amountPaid ?? total, change: tx?.change ?? 0, loyalty }))
    setVoucherCode('')
    void sync()
    if (loyalty?.vouchers?.length) showToast(t('workshop.note.voucherEarned').replace('{code}', loyalty.vouchers.join(', ')), 'success')
  }

  const payOffline = async (cashGiven: number) => {
    if (!shift) return
    const number = generateTransactionId()
    const receiptData = makeReceipt({ number, method: 'cash', amountPaid: cashGiven, change: Math.max(0, cashGiven - total), offline: true })
    await enqueue({
      kind: 'note.payCash', opId: newId(), at: now(), noteId,
      outletId: n.outletId, shiftId: shift.id, deviceId: shift.deviceId ?? undefined,
      transactionNumber: number, amountPaid: cashGiven,
      lines: n.items.map((i) => ({
        productId: i.productId, quantity: i.quantity, unitPrice: priceOf(i), priceReason: i.priceReason ?? null, priceNote: i.priceNote ?? null,
      })),
      discount: manual,
      total,
    })
    setOfflinePayOpen(false)
    setReceipt(receiptData)
  }

  return (
    <>
    <div className="space-y-4 md:space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-[#0F5F56]">
        <ArrowLeft className="w-4 h-4" /> {t('workshop.notes.title')}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold tracking-wider text-gray-900 dark:text-white">{n.vehicle.plateNumber}</p>
          <p className="text-sm text-gray-500">{[n.vehicle.brand, n.vehicle.model].filter(Boolean).join(' ')}</p>
          {!isOpen && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
              {n.status === 'paid' ? t('workshop.note.statusPaid') : t('workshop.note.statusCancelled')}
            </span>
          )}
          {unsynced && (
            <span className="inline-flex items-center gap-1 mt-1 ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              <CloudOff className="w-3 h-3" /> {t('workshop.offline.notSent')}
            </span>
          )}
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{n.customer?.name ?? t('workshop.walkIn')}</p>
          {n.customer?.isMember && <p className="text-xs font-bold text-teal-700">{t('workshop.member')} {n.customer.memberCode ?? t('workshop.offline.codePending')}</p>}
          {stampCard && <div className="mt-1 inline-block text-left"><StampProgress card={stampCard} /></div>}
          {vouchers.length > 0 && (
            <p className="mt-1 flex items-center justify-end gap-1 text-teal-700">
              <Ticket className="w-4 h-4" /> {t('workshop.vouchersAvailable').replace('{n}', String(vouchers.length))}
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
            onChange={(e) => setDraft({ ...details, mechanicId: e.target.value })}
            options={[{ value: '', label: t('workshop.noMechanic') }, ...catalog.mechanics.map((m) => ({ value: m.id, label: m.name }))]}
            fullWidth
          />
          <Input
            label={t('workshop.odometer')}
            value={details.odometer}
            disabled={!isOpen}
            inputMode="numeric"
            onChange={(e) => setDraft({ ...details, odometer: e.target.value })}
            fullWidth
          />
        </div>
        <div className="mt-3">
          <Textarea
            label={t('workshop.complaint')}
            value={details.complaint}
            disabled={!isOpen}
            onChange={(e) => setDraft({ ...details, complaint: e.target.value })}
            fullWidth
          />
        </div>
        {isOpen && draft !== null && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveDetails}>{t('common.save')}</Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('workshop.note.items')}>
        {isOpen && (
          <div className="mb-4">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void submitSearch() }}>
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
                  <button key={p.id} onClick={() => void addProduct(p.id)} className="w-full flex justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span className="text-left">
                      {p.itemType === 'SERVICE' && <Wrench className="inline w-3.5 h-3.5 mr-1 text-teal-600" />}
                      {p.name} <span className="text-gray-400">{p.sku}</span>
                      {p.stockBehavior === 'TRACKED' && catalog.stock.has(p.id) && (
                        <span className="ml-2 text-xs text-gray-400">{t('workshop.offline.stock').replace('{n}', String(catalog.stock.get(p.id)))}</span>
                      )}
                    </span>
                    <span className="font-semibold">{formatCurrency(p.price)}</span>
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
              <div key={i.productId} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium text-sm">
                    {i.itemType === 'SERVICE' && <Wrench className="inline w-3.5 h-3.5 mr-1 text-teal-600" />}
                    {i.productName}
                  </p>
                  <p className="text-xs text-gray-400">{i.productSku}</p>
                  {i.priceReason && priceOf(i) < i.listPrice && (
                    <p className="text-xs text-amber-700">
                      {t('discount.line.from').replace('{price}', formatCurrency(i.listPrice))} · {t(`discount.reason.${i.priceReason}`)}
                      {i.priceNote ? ` — ${i.priceNote}` : ''}
                    </p>
                  )}
                </div>
                {i.itemType === 'SERVICE' && isOpen ? (
                  <input
                    key={`${i.productId}-${i.unitPrice}${priceEdit?.productId === i.productId ? '-edit' : ''}`}
                    defaultValue={priceOf(i)}
                    inputMode="numeric"
                    aria-label={t('workshop.note.agreedPrice')}
                    title={t('workshop.note.agreedPrice')}
                    onBlur={(e) => {
                      const v = Number(e.target.value.replace(/\D/g, ''))
                      if (v === priceOf(i)) return
                      // Below the list price needs a reason, asked for in the dialog.
                      if (v < i.listPrice) setPriceEdit({ productId: i.productId, price: v })
                      else void setItem(i.productId, i.quantity, v === i.listPrice ? null : v)
                    }}
                    className="w-28 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-right text-sm"
                  />
                ) : (
                  <span className="w-28 text-right text-sm">{formatCurrency(priceOf(i))}</span>
                )}
                {isOpen && (
                  <button
                    onClick={() => setPriceEdit({ productId: i.productId, price: priceOf(i) })}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-teal-700"
                    aria-label={`${t('discount.line.button')} ${i.productName}`}
                    title={t('discount.line.button')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-1">
                  {isOpen && (
                    <button onClick={() => void setItem(i.productId, i.quantity - 1, i.unitPrice, keptReason(i))} className="p-1.5 rounded-lg border" aria-label="-">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                  {isOpen && (
                    <button onClick={() => void setItem(i.productId, i.quantity + 1, i.unitPrice, keptReason(i))} className="p-1.5 rounded-lg border" aria-label="+">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="w-28 text-right text-sm font-semibold">{formatCurrency(priceOf(i) * i.quantity)}</span>
                {isOpen && (
                  <button onClick={() => void setItem(i.productId, 0, null)} className="p-1.5 text-red-500" aria-label={t('common.delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {n.status === 'paid' && n.paid && (
        <p className="text-sm text-amber-800">{t('workshop.offline.paidWaiting').replace('{number}', n.paid.transactionNumber)}</p>
      )}

      {isOpen && (
        <div className="sticky bottom-0 z-30 -mx-4 md:mx-0 rounded-none md:rounded-2xl border-t md:border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">{discount > 0 ? `${formatCurrency(subtotal)} − ${formatCurrency(discount)}` : t('workshop.note.subtotal')}</p>
              <p className="text-xl font-extrabold">{formatCurrency(total)}</p>
              {manual && (
                <p className={`text-xs ${discountProblem ? 'text-red-600' : 'text-teal-700'}`}>
                  {discountProblem
                    ? t('discount.total.tooLarge')
                    : t('discount.applied').replace('{amount}', formatCurrency(manual.amount)).replace('{reason}', t(`discount.reason.${manual.reason}`))}
                </p>
              )}
            </div>
            {vouchers.length > 0 && (
              <div className="flex-1 max-w-xs">
                <select
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  aria-label={t('workshop.note.useVoucher')}
                  className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-teal-50 dark:bg-teal-900/20 text-sm"
                >
                  <option value="">{t('workshop.note.noVoucher')}</option>
                  {vouchers.map((v) => <option key={v.id} value={v.code}>{v.code} · {describeReward(v.reward)}</option>)}
                </select>
                {voucherProblem && <p className="mt-1 text-xs text-red-600">{voucherProblem}</p>}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDiscountOpen(true)} disabled={n.items.length === 0}>
                <BadgePercent className="w-4 h-4 mr-1" /> {t('discount.total.button')}
              </Button>
              <Button variant="outline" onClick={() => setCancelOpen(true)}>{t('workshop.note.cancel')}</Button>
              <Button onClick={() => void startPay()} disabled={!canPay || preparing} title={!shift ? t('workshop.note.needShift') : undefined}>
                {preparing ? t('common.loading') : t('workshop.note.pay')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOpen && !shift && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="flex-1 text-sm text-amber-800">{online ? t('workshop.note.needShift') : t('workshop.offline.needShift')}</p>
          {online && outletId && <Button size="sm" onClick={() => setShiftOpen(true)}>{t('shift.open.button')}</Button>}
        </div>
      )}
      {shiftOpen && <OpenShiftModal outletId={outletId} outletName={outlet?.name} onClose={() => setShiftOpen(false)} />}

      {payOpen && shift && (
        <PaymentModal
          isOpen={payOpen}
          onClose={() => setPayOpen(false)}
          transactionId={txRef}
          outletId={n.outletId}
          shiftId={shift.id}
          deviceId={shift.deviceId ?? undefined}
          amount={total}
          items={n.items.map((i) => ({ productId: i.productId, productName: i.productName, productSku: i.productSku, quantity: i.quantity, unitPrice: priceOf(i) }))}
          discountAmount={discount}
          serviceOrderId={n.id}
          voucherCode={voucher?.code}
          customerName={n.customer?.name}
          customerPhone={n.customer?.phone ?? undefined}
          onAbandonPending={(paymentId) => abandonCheckout.mutate({ id: n.id, paymentId })}
          onSuccess={onPaid}
          onError={(message) => showToast(workshopErrorMessage(new Error(message), language), 'error')}
        />
      )}

      {offlinePayOpen && (
        <OfflineCashModal amount={total} onConfirm={payOffline} onClose={() => setOfflinePayOpen(false)} />
      )}

      {priceEdit && (() => {
        const line = n.items.find((i) => i.productId === priceEdit.productId)
        if (!line) return null
        return (
          <PriceOverrideModal
            itemName={line.productName}
            listPrice={line.listPrice}
            currentPrice={priceEdit.price}
            current={{ reason: line.priceReason, note: line.priceNote }}
            allowAbove={line.itemType === 'SERVICE'}
            onSave={(change) => void savePrice(line, change)}
            onClose={() => setPriceEdit(null)}
          />
        )
      })()}

      {discountOpen && (
        <ManualDiscountModal
          due={subtotal - voucherCut}
          current={manual}
          onSave={(d) => void saveDiscount(d)}
          onClose={() => setDiscountOpen(false)}
        />
      )}

      {scannerOpen && <BarcodeScanner onScan={(c) => void onScan(c)} onClose={() => setScannerOpen(false)} />}

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title={t('workshop.note.cancelTitle')} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('workshop.note.cancelBody')}</p>
          <Textarea label={t('workshop.note.cancelReason')} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} fullWidth />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('common.back')}</Button>
            <Button variant="danger" onClick={() => void confirmCancel()} disabled={!cancelReason.trim()}>{t('workshop.note.cancelConfirm')}</Button>
          </div>
        </div>
      </Modal>
    </div>
    {receiptModal}
    </>
  )
}
