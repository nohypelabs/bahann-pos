'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bike, ChevronDown, Plus, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/Toast'
import { StampProgress } from '@/components/workshop/StampProgress'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions'
import type { MemberVoucher, VoucherReward } from '@/domain/entities/Workshop'

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const detail = trpc.workshop.customers.detail.useQuery({ id })
  const { data: profile } = trpc.auth.getProfile.useQuery()
  const isAdmin = hasPermission(profile?.role ?? 'user', PERMISSIONS.SETTINGS_MANAGE)

  const update = trpc.workshop.customers.update.useMutation()
  const enroll = trpc.workshop.customers.enroll.useMutation()
  const saveVehicle = trpc.workshop.vehicles.save.useMutation()
  const issueVoucher = trpc.workshop.loyalty.issueVoucher.useMutation()
  const voidVoucher = trpc.workshop.loyalty.voidVoucher.useMutation()

  const [draft, setDraft] = useState<{ name: string; phone: string; notes: string } | null>(null)
  const [vehicleForm, setVehicleForm] = useState<{ plate: string; brand: string; model: string } | null>(null)
  const [openVehicle, setOpenVehicle] = useState<string | null>(null)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ type: 'free_service' as VoucherReward['type'], value: '', cap: '', days: '30' })
  const [voidTarget, setVoidTarget] = useState<MemberVoucher | null>(null)
  const [voidReason, setVoidReason] = useState('')
  // Read the clock once: render must be pure (React Compiler).
  const [now] = useState(() => Date.now())

  const fail = (err: unknown) => showToast(workshopErrorMessage(err, language), 'error')
  const refresh = () => utils.workshop.customers.detail.invalidate({ id })
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); await refresh(); if (ok) showToast(ok, 'success'); return true } catch (err) { fail(err); return false }
  }

  if (detail.error) {
    return (
      <div className="space-y-3">
        <Link href="/members" className="inline-flex items-center gap-1 text-sm text-[#0F5F56]"><ArrowLeft className="w-4 h-4" /> {t('workshop.members.title')}</Link>
        <p className="text-sm text-red-600">{workshopErrorMessage(detail.error, language)}</p>
      </div>
    )
  }
  if (!detail.data) return <p className="text-center py-16 text-gray-400 text-sm">{t('common.loading')}</p>

  const { customer, vehicles, stampCard, vouchers } = detail.data
  const form = draft ?? { name: customer.name, phone: customer.phone ?? '', notes: customer.notes ?? '' }
  const date = (iso: string) => new Date(iso).toLocaleDateString(language === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const describe = (r: VoucherReward) =>
    r.type === 'free_service' ? t('workshop.voucher.freeService') + (r.maxValue ? ` (maks ${formatCurrency(r.maxValue)})` : '')
    : r.type === 'fixed' ? `-${formatCurrency(r.amount)}` : `-${r.percent}%` + (r.maxValue ? ` (maks ${formatCurrency(r.maxValue)})` : '')
  const voucherState = (v: MemberVoucher) =>
    v.status === 'redeemed' ? t('workshop.voucher.redeemed')
    : v.status === 'void' ? t('workshop.voucher.void')
    : v.expiresAt && new Date(v.expiresAt).getTime() < now ? t('workshop.voucher.expired')
    : t('workshop.voucher.usable')

  const submitIssue = async () => {
    const n = Number(issueForm.value.replace(/\D/g, '') || '0')
    const cap = issueForm.cap.trim() ? Number(issueForm.cap.replace(/\D/g, '')) : null
    const reward: VoucherReward =
      issueForm.type === 'fixed' ? { type: 'fixed', amount: n }
      : issueForm.type === 'percent' ? { type: 'percent', percent: n, maxValue: cap }
      : { type: 'free_service', maxValue: cap }
    const days = issueForm.days.trim() ? Number(issueForm.days.replace(/\D/g, '')) : null
    if (await run(() => issueVoucher.mutateAsync({ customerId: customer.id, reward, validDays: days }), t('workshop.voucher.issued'))) setIssueOpen(false)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Link href="/members" className="inline-flex items-center gap-1 text-sm text-[#0F5F56]">
        <ArrowLeft className="w-4 h-4" /> {t('workshop.members.title')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{customer.name}</p>
          {customer.isMember ? (
            <p className="text-sm font-bold text-teal-700">
              {t('workshop.member')} {customer.memberCode}
              {customer.joinedAt && <span className="ml-2 font-normal text-gray-500">{t('workshop.members.since')} {date(customer.joinedAt)}</span>}
            </p>
          ) : (
            <Button size="sm" className="mt-2" onClick={() => run(() => enroll.mutateAsync({ id: customer.id }), t('workshop.members.enrolled'))} disabled={enroll.isPending}>
              {t('workshop.members.enroll')}
            </Button>
          )}
        </div>
        {stampCard && <StampProgress card={stampCard} />}
      </div>

      <SectionCard title={t('workshop.members.profile')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t('workshop.name')} value={form.name} onChange={(e) => setDraft({ ...form, name: e.target.value })} fullWidth />
          <Input label={t('workshop.phone')} value={form.phone} inputMode="tel" onChange={(e) => setDraft({ ...form, phone: e.target.value })} fullWidth />
        </div>
        <div className="mt-3">
          <Textarea label={t('workshop.members.notes')} value={form.notes} onChange={(e) => setDraft({ ...form, notes: e.target.value })} fullWidth />
        </div>
        {draft && (
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
            <Button size="sm" disabled={!form.name.trim() || update.isPending}
              onClick={async () => { if (await run(() => update.mutateAsync({ id: customer.id, name: form.name, phone: form.phone || null, notes: form.notes || null }), t('workshop.note.saved'))) setDraft(null) }}>
              {t('common.save')}
            </Button>
          </div>
        )}
      </SectionCard>

      {customer.isMember && (
        <SectionCard title={t('workshop.members.vouchers')}>
          {isAdmin && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setIssueOpen(true)}><Plus className="w-4 h-4 mr-1" /> {t('workshop.voucher.issue')}</Button>
            </div>
          )}
          {vouchers.length === 0 && <p className="text-sm text-gray-400">{t('workshop.members.noVouchers')}</p>}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {vouchers.map((v) => (
              <div key={v.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Ticket className="w-4 h-4 text-teal-600" /> {v.code}</p>
                  <p className="text-xs text-gray-500">
                    {describe(v.reward)} · {voucherState(v)}
                    {v.expiresAt && v.status === 'issued' ? ` · ${t('workshop.voucher.until')} ${date(v.expiresAt)}` : ''}
                  </p>
                </div>
                {isAdmin && v.status === 'issued' && (
                  <Button size="sm" variant="outline" onClick={() => { setVoidTarget(v); setVoidReason('') }}>{t('workshop.voucher.voidAction')}</Button>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title={t('workshop.members.vehicles')}>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {vehicles.map((v) => (
            <div key={v.id} className="py-2">
              <button onClick={() => setOpenVehicle(openVehicle === v.id ? null : v.id)} className="w-full flex items-center justify-between gap-2 py-1 text-left">
                <span className="flex items-center gap-2">
                  <Bike className="w-4 h-4" />
                  <span className="font-bold tracking-wider">{v.plateNumber}</span>
                  <span className="text-sm text-gray-500">{[v.brand, v.model].filter(Boolean).join(' ')}</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openVehicle === v.id ? 'rotate-180' : ''}`} />
              </button>
              {openVehicle === v.id && <ServiceHistory vehicleId={v.id} />}
            </div>
          ))}
        </div>
        {vehicles.length === 0 && !vehicleForm && <p className="text-sm text-gray-400">{t('workshop.members.noVehicles')}</p>}
        {vehicleForm ? (
          <form className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await run(() => saveVehicle.mutateAsync({ plate: vehicleForm.plate, brand: vehicleForm.brand || null, model: vehicleForm.model || null, customerId: customer.id }))) setVehicleForm(null)
            }}>
            <Input label={t('workshop.plate')} value={vehicleForm.plate} onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })} placeholder="B 1234 XYZ" fullWidth />
            <Input label={t('workshop.brand')} value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} fullWidth />
            <Input label={t('workshop.model')} value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} fullWidth />
            <Button type="submit" disabled={!vehicleForm.plate.trim() || saveVehicle.isPending}>{t('common.save')}</Button>
          </form>
        ) : (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setVehicleForm({ plate: '', brand: '', model: '' })}>
            <Plus className="w-4 h-4 mr-1" /> {t('workshop.members.addVehicle')}
          </Button>
        )}
      </SectionCard>

      <Modal isOpen={issueOpen} onClose={() => setIssueOpen(false)} title={t('workshop.voucher.issue')} size="sm">
        <div className="space-y-3">
          <Select
            label={t('workshop.loyalty.rewardType')}
            value={issueForm.type}
            onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value as VoucherReward['type'] })}
            options={[
              { value: 'free_service', label: t('workshop.loyalty.rewardFreeService') },
              { value: 'fixed', label: t('workshop.loyalty.rewardFixed') },
              { value: 'percent', label: t('workshop.loyalty.rewardPercent') },
            ]}
            fullWidth
          />
          {issueForm.type !== 'free_service' && (
            <Input label={issueForm.type === 'fixed' ? t('workshop.loyalty.amount') : t('workshop.loyalty.percent')} value={issueForm.value} inputMode="numeric" onChange={(e) => setIssueForm({ ...issueForm, value: e.target.value })} fullWidth />
          )}
          {issueForm.type !== 'fixed' && (
            <Input label={t('workshop.loyalty.maxValue')} value={issueForm.cap} inputMode="numeric" placeholder={t('workshop.loyalty.noCap')} onChange={(e) => setIssueForm({ ...issueForm, cap: e.target.value })} fullWidth />
          )}
          <Input label={t('workshop.loyalty.validDays')} value={issueForm.days} inputMode="numeric" placeholder={t('workshop.loyalty.neverExpires')} onChange={(e) => setIssueForm({ ...issueForm, days: e.target.value })} fullWidth />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIssueOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={submitIssue} disabled={issueVoucher.isPending}>{t('workshop.voucher.issue')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!voidTarget} onClose={() => setVoidTarget(null)} title={t('workshop.voucher.voidTitle')} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">{voidTarget?.code} · {t('workshop.voucher.voidBody')}</p>
          <Textarea label={t('workshop.note.cancelReason')} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} fullWidth />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVoidTarget(null)}>{t('common.back')}</Button>
            <Button variant="danger" disabled={!voidReason.trim() || voidVoucher.isPending}
              onClick={async () => { if (voidTarget && await run(() => voidVoucher.mutateAsync({ id: voidTarget.id, reason: voidReason }), t('workshop.voucher.voided'))) setVoidTarget(null) }}>
              {t('workshop.voucher.voidAction')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Paid notes for one motor, newest first. */
function ServiceHistory({ vehicleId }: { vehicleId: string }) {
  const { t, language } = useLanguage()
  const history = trpc.workshop.vehicles.history.useQuery({ vehicleId })
  if (history.isLoading) return <p className="pl-6 py-2 text-xs text-gray-400">{t('common.loading')}</p>
  if (!history.data?.length) return <p className="pl-6 py-2 text-xs text-gray-400">{t('workshop.members.noHistory')}</p>
  return (
    <div className="pl-6 py-2 space-y-2">
      {history.data.map((s) => {
        // What was actually paid; list prices may have changed since.
        const total = s.paidTotal ?? s.items.reduce((sum, i) => sum + (i.unitPrice ?? i.listPrice) * i.quantity, 0)
        return (
          <div key={s.id} className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs">
            <div className="flex justify-between gap-2 font-semibold">
              <span>{new Date(s.closedAt ?? s.openedAt).toLocaleDateString(language === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="text-gray-500">
              {[s.mechanic?.name, s.odometerKm != null ? `${s.odometerKm.toLocaleString('id-ID')} km` : null].filter(Boolean).join(' · ')}
            </p>
            <p>{s.items.map((i) => `${i.productName}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}</p>
            {s.complaint && <p className="text-gray-500 italic">{s.complaint}</p>}
          </div>
        )
      })}
    </div>
  )
}
