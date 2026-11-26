'use client'

import { lazy, Suspense, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MotionConfig, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, ChevronRight, Coins, IdCard, Receipt,
  ShoppingCart, Wallet, Wrench,
} from 'lucide-react'
import { FilterBar } from '@/components/ui/FilterBar'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { useInventoryAccess } from '@/components/layout/useInventoryAccess'
import { changeRatio, type DashboardOverview, type PeriodKpis } from '@/domain/dashboard/overview'

const charts = () => import('@/components/dashboard/DashboardCharts')
const Sparkline = lazy(() => charts().then((m) => ({ default: m.Sparkline })))
const DailySalesChart = lazy(() => charts().then((m) => ({ default: m.DailySalesChart })))
const HourlyChart = lazy(() => charts().then((m) => ({ default: m.HourlyChart })))
const PaymentDonut = lazy(() => charts().then((m) => ({ default: m.PaymentDonut })))

const SERIES = ['#0F5F56', '#E9A23B', '#5FB3A6', '#C9772B', '#8A9188', '#2F6F9F']
const PERIODS = [
  { value: 1, label: 'Hari ini' },
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
  { value: 90, label: '90 hari' },
]

const initials = (name: string) => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/** A white card with a title row; every dashboard block uses it. */
function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`rounded-[14px] border border-[#E4E6E7] bg-white p-4 md:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold text-[#17201D]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#F3F4F4] ${className}`} />
}

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  const ratio = changeRatio(now, before)
  if (ratio === null) return <span className="text-xs text-[#8A9188]">{label}</span>
  const up = ratio >= 0
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-[#8A9188]">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${up ? 'bg-[#E3F1EE] text-[#0F5F56]' : 'bg-red-50 text-red-600'}`}>
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(ratio * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
      </span>
      {label}
    </span>
  )
}

function KpiCard({ label, value, icon, tone, delta, spark, footnote }: {
  label: string; value: string; icon: ReactNode; tone: 'brand' | 'amber' | 'teal' | 'slate'
  delta: ReactNode; spark?: number[]; footnote?: ReactNode
}) {
  const tones = {
    brand: { fg: 'text-[#0F5F56]', bar: '#0F5F56' },
    amber: { fg: 'text-amber-600', bar: '#E9A23B' },
    teal: { fg: 'text-teal-600', bar: '#5FB3A6' },
    slate: { fg: 'text-[#5F675F]', bar: '#8A9188' },
  }[tone]
  return (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#5F675F]">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight text-[#17201D] tabular-nums md:text-[26px]">{value}</p>
        </div>
        <span className={`shrink-0 ${tones.fg} [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.75]`}>{icon}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {delta}
          {footnote && <p className="text-xs text-[#8A9188]">{footnote}</p>}
        </div>
        {spark && spark.length > 1 && (
          <div className="h-9 w-20 shrink-0">
            <Suspense fallback={null}><Sparkline values={spark} color={tones.bar} /></Suspense>
          </div>
        )}
      </div>
    </Panel>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const inventoryAccess = useInventoryAccess()
  const { t } = useLanguage()
  const [outletId, setOutletId] = useState('')
  const [days, setDays] = useState(7)

  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets ?? []
  const scope = { outletId: outletId || undefined }
  const overview = trpc.dashboard.getOverview.useQuery({ ...scope, days })
  const { data: stats } = trpc.dashboard.getStats.useQuery({ ...scope, days })
  const { data: lowStock } = trpc.dashboard.getLowStock.useQuery({ ...scope, threshold: 10 })

  const o: DashboardOverview | undefined = overview.data
  const cur: PeriodKpis | undefined = o?.current
  const prev = o?.previous
  const vsLabel = days === 1 ? t('dashboard.kpi.vsYesterday') : t('dashboard.kpi.vsPrevious').replace('{n}', String(days))
  const methodLabel = (m: string) => t(`dashboard.methods.${m}`) === `dashboard.methods.${m}` ? m : t(`dashboard.methods.${m}`)
  const loading = overview.isLoading
  const maxItemQty = Math.max(1, ...(o?.topItems ?? []).map((i) => i.quantity))
  const shortTime = (iso: string) => new Date(iso).toLocaleString('id-ID', days === 1 ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const quick = [
    { href: '/pos/notes', label: t('dashboard.quick.notes'), icon: <Wrench /> },
    { href: '/pos/sales', label: t('dashboard.quick.sale'), icon: <ShoppingCart /> },
    { href: '/warehouse/stock', label: t('dashboard.quick.stock'), icon: <Boxes />, guarded: true },
    { href: '/members', label: t('dashboard.quick.members'), icon: <IdCard /> },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#17201D]">{t('dashboard.title')}</h1>
          <FilterBar
            outlets={outlets.length > 1 ? outlets.map((x) => ({ value: x.id, label: x.name })) : undefined}
            outletValue={outletId}
            onOutletChange={setOutletId}
            periodValue={days}
            periodOptions={PERIODS}
            onPeriodChange={setDays}
          />
        </div>

        {overview.error && (
          <p className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t('dashboard.loadFailed')}</p>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 md:gap-4">
          {loading || !cur || !prev || !o ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[136px] rounded-[14px]" />)
          ) : (
            <>
              <KpiCard label={t('dashboard.kpi.revenue')} value={formatCurrency(cur.revenue)} icon={<Wallet />} tone="brand"
                delta={<Delta now={cur.revenue} before={prev.revenue} label={vsLabel} />} spark={o.daily.map((d) => d.revenue)} />
              <KpiCard label={t('dashboard.kpi.grossProfit')} value={formatCurrency(cur.grossProfit)} icon={<Coins />} tone="amber"
                delta={<Delta now={cur.grossProfit} before={prev.grossProfit} label={vsLabel} />}
                footnote={o.uncostedLines > 0
                  ? <span className="text-amber-700">{t('dashboard.kpi.uncosted').replace('{n}', String(o.uncostedLines))}</span>
                  : stats ? t('dashboard.kpi.operating').replace('{expenses}', formatCurrency(stats.totalExpenses || 0)).replace('{profit}', formatCurrency(stats.operatingProfit || 0)) : undefined} />
              <KpiCard label={t('dashboard.kpi.transactions')} value={cur.transactions.toLocaleString('id-ID')} icon={<Receipt />} tone="teal"
                delta={<Delta now={cur.transactions} before={prev.transactions} label={vsLabel} />}
                footnote={t('dashboard.kpi.avgTicket').replace('{amount}', formatCurrency(cur.averageTicket))} spark={o.daily.map((d) => d.transactions)} />
              <KpiCard label={t('dashboard.kpi.serviceNotes')} value={cur.serviceNotes.toLocaleString('id-ID')} icon={<Wrench />} tone="slate"
                delta={<Delta now={cur.serviceNotes} before={prev.serviceNotes} label={vsLabel} />}
                footnote={cur.transactions ? t('dashboard.kpi.serviceShare').replace('{pct}', String(Math.round((cur.serviceNotes / cur.transactions) * 100))) : undefined} />
            </>
          )}
        </div>

        {/* Quick actions + top members */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3">
          <Panel title={t('dashboard.quick.title')} className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {quick.map((q) => (
                <button
                  key={q.href}
                  onClick={() => (!q.guarded || inventoryAccess.guard()) && router.push(q.href)}
                  className="group flex items-center gap-3 rounded-[10px] border border-[#E4E6E7] bg-[#F8F9F9] px-3 py-3 text-left transition-colors hover:border-[#0F5F56]/40 hover:bg-[#E3F1EE]/50"
                >
                  <span className="shrink-0 text-[#0F5F56] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.75]">{q.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#17201D]">{q.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8A9188] transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </Panel>

          <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="rounded-[14px] bg-[#0F5F56] p-4 text-white md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">{t('dashboard.topMember.title')}</h2>
              <Link href="/members" className="text-xs font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline">{t('dashboard.viewAll')}</Link>
            </div>
            {loading ? <Skeleton className="h-24 bg-white/10" /> : o && o.topCustomers.length > 0 ? (
              <>
                <div className="flex -space-x-2">
                  {o.topCustomers.map((c, i) => (
                    <span key={c.customerId} title={c.name}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0F5F56] text-xs font-bold ${i === 0 ? 'bg-[#E9A23B] text-[#17201D]' : 'bg-white/15'}`}>
                      {initials(c.name)}
                    </span>
                  ))}
                </div>
                <div className="mt-3 rounded-[10px] bg-white/10 p-3">
                  <p className="truncate text-sm font-semibold">{o.topCustomers[0].name}{o.topCustomers[0].memberCode ? ` · ${o.topCustomers[0].memberCode}` : ''}</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">{formatCurrency(o.topCustomers[0].spent)}</p>
                  <p className="text-xs text-white/75">{t('dashboard.topMember.visits').replace('{n}', String(o.topCustomers[0].visits))}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/75">{t('dashboard.topMember.empty')}</p>
            )}
          </motion.section>
        </div>

        {/* Daily sales + payment methods */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3">
          <Panel
            title={t('dashboard.daily.title')}
            className="xl:col-span-2"
            action={
              <div className="flex items-center gap-3 text-xs text-[#5F675F]">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0F5F56]" />{t('dashboard.daily.goods')}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E9A23B]" />{t('dashboard.daily.services')}</span>
              </div>
            }
          >
            {loading || !o ? <Skeleton className="h-[260px]" /> : (
              <Suspense fallback={<Skeleton className="h-[260px]" />}>
                <DailySalesChart daily={o.daily} labels={{ goods: t('dashboard.daily.goods'), services: t('dashboard.daily.services') }} />
              </Suspense>
            )}
          </Panel>

          <Panel title={t('dashboard.methods.title')}>
            {loading || !o ? <Skeleton className="h-[260px]" /> : o.paymentMethods.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
            ) : (
              <>
                <Suspense fallback={<Skeleton className="h-[180px]" />}>
                  <PaymentDonut methods={o.paymentMethods} labelOf={methodLabel} />
                </Suspense>
                <ul className="mt-3 space-y-2">
                  {o.paymentMethods.map((m, i) => (
                    <li key={m.method} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                      <span className="flex-1 text-[#17201D]">{methodLabel(m.method)}</span>
                      <span className="text-xs text-[#8A9188] tabular-nums">{m.count}×</span>
                      <span className="w-28 text-right font-semibold text-[#17201D] tabular-nums">{formatCurrency(m.revenue)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>

        {/* Today by hour + mechanics */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3">
          <Panel title={t('dashboard.hourly.title')} className="xl:col-span-2"
            action={o ? <span className="text-sm font-semibold text-[#17201D] tabular-nums">{formatCurrency(o.hourlyToday.reduce((s, h) => s + h.revenue, 0))}</span> : undefined}>
            {loading || !o ? <Skeleton className="h-[220px]" /> : (
              <Suspense fallback={<Skeleton className="h-[220px]" />}>
                <HourlyChart hours={o.hourlyToday} />
              </Suspense>
            )}
          </Panel>

          <Panel title={t('dashboard.mechanics.title')}>
            {loading || !o ? <Skeleton className="h-[200px]" /> : o.mechanicsToday.length === 0 ? (
              <p className="py-6 text-sm text-[#8A9188]">{t('dashboard.mechanics.empty')}</p>
            ) : (
              <ul className="divide-y divide-[#EEF0F0]">
                {o.mechanicsToday.map((m) => (
                  <li key={m.mechanicId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F4F4] text-xs font-bold text-[#5F675F]">{initials(m.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#17201D]">{m.name}</p>
                      <p className="text-xs text-[#8A9188]">{t('dashboard.mechanics.done').replace('{n}', String(m.paidToday))}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${m.openNotes > 0 ? 'bg-amber-50 text-amber-700' : 'bg-[#E3F1EE] text-[#0F5F56]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.openNotes > 0 ? 'bg-amber-500' : 'bg-[#0F5F56]'}`} />
                      {m.openNotes > 0 ? t('dashboard.mechanics.busy').replace('{n}', String(m.openNotes)) : t('dashboard.mechanics.idle')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Best sellers + categories + low stock */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
          <Panel title={t('dashboard.topItems.title')}>
            {loading || !o ? <Skeleton className="h-[220px]" /> : o.topItems.length === 0 ? (
              <p className="py-6 text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {o.topItems.map((item, i) => (
                  <li key={`${item.name}-${i}`}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-[#17201D]">
                        {item.name}
                        {item.isService && <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">{t('dashboard.daily.services')}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-[#5F675F] tabular-nums">{t('dashboard.topItems.qty').replace('{n}', item.quantity.toLocaleString('id-ID'))}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F3F4F4]">
                      <motion.div className="h-2 rounded-full" style={{ background: item.isService ? '#E9A23B' : '#0F5F56' }}
                        initial={{ width: 0 }} animate={{ width: `${(item.quantity / maxItemQty) * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('dashboard.categories.title')}>
            {loading || !o ? <Skeleton className="h-[220px]" /> : o.categories.length === 0 ? (
              <p className="py-6 text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
            ) : (
              <div className="flex h-[220px] items-end gap-3">
                {o.categories.slice(0, 5).map((c, i) => (
                  <div key={c.category} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="relative w-full flex-1 overflow-hidden rounded-[10px] bg-[#F3F4F4]">
                      <motion.div className="absolute inset-x-0 bottom-0 rounded-[10px]" style={{ background: SERIES[i % SERIES.length] }}
                        initial={{ height: 0 }} animate={{ height: `${Math.max(4, c.share * 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                    </div>
                    <span className="w-full truncate text-center text-xs text-[#5F675F]" title={c.category}>{c.category}</span>
                    <span className="rounded-md border border-[#E4E6E7] px-1.5 py-0.5 text-xs font-semibold text-[#17201D] tabular-nums">{Math.round(c.share * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t('dashboard.lowStock.title')}
            action={lowStock && lowStock.length > 0 ? <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{lowStock.length}</span> : undefined}>
            {!lowStock ? <Skeleton className="h-[220px]" /> : lowStock.length === 0 ? (
              <p className="py-6 text-sm text-[#8A9188]">{t('dashboard.lowStock.none')}</p>
            ) : (
              <>
                <ul className="divide-y divide-[#EEF0F0]">
                  {lowStock.slice(0, 5).map((s) => (
                    <li key={`${s.productId}-${s.outletName}`} className="flex items-center gap-3 py-2 first:pt-0">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate text-sm text-[#17201D]">{s.productName}</span>
                      <span className="shrink-0 text-sm font-semibold text-red-600 tabular-nums">{t('dashboard.lowStock.left').replace('{n}', String(s.currentStock))}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => inventoryAccess.guard() && router.push('/warehouse/stock')}
                  className="mt-3 w-full rounded-[10px] border border-[#E4E6E7] py-2 text-sm font-semibold text-[#0F5F56] hover:bg-[#E3F1EE]/50">
                  {t('dashboard.lowStock.record')}
                </button>
              </>
            )}
          </Panel>
        </div>

        {/* Latest sales */}
        <Panel title={t('dashboard.recent.title')}
          action={<Link href="/pos/history" className="text-sm font-semibold text-[#0F5F56] underline-offset-2 hover:underline">{t('dashboard.viewAll')}</Link>}>
          {loading || !o ? <Skeleton className="h-[240px]" /> : o.recent.length === 0 ? (
            <p className="py-6 text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
          ) : (
            <div className="-mx-4 overflow-x-auto md:-mx-5">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-[#EEF0F0] bg-[#F8F9F9] text-left text-xs font-semibold text-[#5F675F]">
                    <th className="px-4 py-2.5 md:px-5">{t('dashboard.recent.number')}</th>
                    <th className="px-3 py-2.5">{t('dashboard.recent.time')}</th>
                    <th className="px-3 py-2.5">{t('dashboard.recent.customer')}</th>
                    <th className="px-3 py-2.5 text-right">{t('dashboard.recent.items')}</th>
                    <th className="px-3 py-2.5">{t('dashboard.recent.method')}</th>
                    <th className="px-4 py-2.5 text-right md:px-5">{t('dashboard.recent.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0F0]">
                  {o.recent.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8F9F9]">
                      <td className="px-4 py-3 font-mono text-xs text-[#17201D] md:px-5">{r.number || '—'}</td>
                      <td className="px-3 py-3 text-[#5F675F] tabular-nums">{shortTime(r.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className="text-[#17201D]">{r.customerName ?? t('dashboard.recent.walkIn')}</span>
                        {r.serviceNote && <span className="ml-2 rounded bg-[#E3F1EE] px-1.5 py-0.5 text-[11px] font-semibold text-[#0F5F56]">{t('dashboard.recent.serviceNote')}</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-[#5F675F] tabular-nums">{r.items}</td>
                      <td className="px-3 py-3 text-[#5F675F]">{methodLabel(r.paymentMethod)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#17201D] tabular-nums md:px-5">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {inventoryAccess.modal}
      </div>
    </MotionConfig>
  )
}
