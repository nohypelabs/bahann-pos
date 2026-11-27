'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, IdCard, MessageCircle, Wrench, Ticket } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import { formatCurrency } from '@/lib/utils'

/** 0812… → https://wa.me/62812… (WhatsApp wants the country code without +). */
function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`
}

export default function MembersPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', member: true })

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const customers = trpc.workshop.customers.list.useQuery({ query })
  const list = customers.data?.customers
  const stampsRequired = customers.data?.stampsRequired ?? null
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(language === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const create = trpc.workshop.customers.create.useMutation()

  const submit = async () => {
    try {
      const c = await create.mutateAsync({ name: form.name, phone: form.phone || null, enrollAsMember: form.member })
      setNewOpen(false)
      setForm({ name: '', phone: '', member: true })
      router.push(`/members/${c.id}`)
    } catch (err) {
      showToast(workshopErrorMessage(err, language), 'error')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('workshop.members.title')}
        subtitle={t('workshop.members.subtitle')}
        action={<Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4 mr-1" /> {t('workshop.members.new')}</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('workshop.newNote.searchCustomer')}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      {customers.error && <p className="text-sm text-red-600">{workshopErrorMessage(customers.error, language)}</p>}
      {list?.length === 0 && (
        <EmptyState icon={<IdCard />} title={t('workshop.members.emptyTitle')} description={t('workshop.members.emptyBody')} />
      )}

      {list && list.length > 0 && (
        <div className="glass-surface rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="hidden lg:grid grid-cols-[1.4fr_1.4fr_1fr_1fr_0.8fr] gap-4 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <span>{t('workshop.members.col.customer')} · {t('workshop.members.count').replace('{n}', String(list.length))}</span>
            <span>{t('workshop.members.col.vehicles')}</span>
            <span>{t('workshop.members.col.visits')}</span>
            <span>{t('workshop.members.col.loyalty')}</span>
            <span className="text-right">{t('workshop.members.col.spent')}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {list.map((c) => {
              const s = c.summary
              return (
                <div
                  key={c.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/members/${c.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/members/${c.id}`) }}
                  className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_0.8fr] gap-x-4 gap-y-2 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {/* Customer */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</p>
                      {c.isMember ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">{c.memberCode}</span>
                      ) : (
                        <span className="text-[11px] text-gray-400">{t('workshop.members.notMember')}</span>
                      )}
                    </div>
                    {c.phone ? (
                      <a
                        href={whatsappLink(c.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={t('workshop.members.whatsapp')}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> {c.phone}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-xs text-gray-400">—</p>
                    )}
                  </div>

                  {/* Motorbikes */}
                  <div className="min-w-0 space-y-0.5">
                    {s.vehicles.length === 0 ? (
                      <p className="text-xs text-gray-400">{t('workshop.members.noVehicles')}</p>
                    ) : s.vehicles.map((v) => (
                      <p key={v.plateNumber} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">{v.plateNumber}</span>
                        {(v.brand || v.model) && <span className="text-gray-500"> · {[v.brand, v.model].filter(Boolean).join(' ')}</span>}
                      </p>
                    ))}
                  </div>

                  {/* Services */}
                  <div className="text-xs">
                    {s.visits > 0 ? (
                      <>
                        <p className="font-semibold text-gray-900 dark:text-white">{t('workshop.members.visitCount').replace('{n}', String(s.visits))}</p>
                        {s.lastVisitAt && <p className="text-gray-500">{t('workshop.members.lastVisit').replace('{date}', shortDate(s.lastVisitAt))}</p>}
                      </>
                    ) : (
                      <p className="text-gray-400">{t('workshop.members.noVisit')}</p>
                    )}
                    {s.hasOpenNote && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        <Wrench className="w-3 h-3" /> {t('workshop.members.inService')}
                      </span>
                    )}
                  </div>

                  {/* Stamp card and vouchers */}
                  <div className="text-xs space-y-1">
                    {s.stampBalance !== null && stampsRequired ? (
                      <div>
                        <p className="text-gray-700 dark:text-gray-300">
                          {t('workshop.members.stamps').replace('{n}', String(Math.min(s.stampBalance, stampsRequired))).replace('{total}', String(stampsRequired))}
                        </p>
                        <div className="mt-0.5 h-1.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${Math.min(100, (s.stampBalance / stampsRequired) * 100)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400">—</p>
                    )}
                    {s.activeVouchers > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <Ticket className="w-3 h-3" /> {t('workshop.members.activeVouchers').replace('{n}', String(s.activeVouchers))}
                      </span>
                    )}
                  </div>

                  {/* Total spent */}
                  <p className="text-sm font-semibold text-gray-900 dark:text-white lg:text-right">{formatCurrency(s.totalSpent)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title={t('workshop.members.new')} size="sm">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <Input label={t('workshop.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus fullWidth />
          <Input label={t('workshop.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="08…" fullWidth />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.member} onChange={(e) => setForm({ ...form, member: e.target.checked })} />
            {t('workshop.newNote.makeMember')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={!form.name.trim() || create.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
