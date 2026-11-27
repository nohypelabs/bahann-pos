'use client'

import { lazy, Suspense, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MotionConfig, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Boxes, CheckCircle2, IdCard, ShoppingCart, Wrench } from 'lucide-react'
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

const SERIES = ['#0F5F56', '#E9A23B', '#5FB3A6', '#C9772B', '#8A9188', '#2F6F9F']
const PERIODS = [
  { value: 1, label: 'Hari ini' },
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
  { value: 90, label: '90 hari' },
]

const pct = (share: number) => `${Math.round(share * 100)}%`

/** A glass card with a title row; every dashboard block uses it. */
function Panel({ title, note, action, children, className = '' }: {
  title?: string; note?: ReactNode; action?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`glass-panel rounded-xl p-4 md:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-[#17201D]">{title}</h2>}
            {note && <p className="mt-0.5 text-xs text-[#8A9188]">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </motion.section>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/60 ${className}`} />
}

/** Change against the previous period. Nothing to compare with: the hero says so, small cells stay quiet. */
function Delta({ now, before, label, quiet = false }: { now: number; before: number; label: string; quiet?: boolean }) {
  const ratio = changeRatio(now, before)
  if (ratio === null) return quiet ? null : <span className="text-xs text-[#8A9188]">{label}</span>
  const up = ratio >= 0
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[#8A9188]">
      <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${up ? 'text-[#0F5F56]' : 'text-red-600'}`}>
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {Math.abs(ratio * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
      </span>
      {!quiet && label}
    </span>
  )
}

/** One cell of the figures band: label, number, change, one line of context. */
function Figure({ label, value, delta, footnote }: { label: string; value: string; delta?: ReactNode; footnote?: ReactNode }) {
  return (
    <div className="min-w-0 p-3.5 md:p-5 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-[#17201D]/[0.07]">
      <p className="line-clamp-2 text-xs leading-tight text-[#5F675F] md:truncate md:text-[13px]">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tracking-tight text-[#17201D] tabular-nums md:text-2xl">{value}</p>
      <div className="mt-1 min-h-4">{delta}</div>
      {footnote && <p className="mt-1 hidden text-xs leading-snug text-[#8A9188] md:block">{footnote}</p>}
    </div>
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
  const methodTotal = (o?.paymentMethods ?? []).reduce((s, m) => s + m.revenue, 0)
  const todayTotal = (o?.hourlyToday ?? []).reduce((s, h) => s + h.revenue, 0)
  const shortTime = (iso: string) => new Date(iso).toLocaleString('id-ID', days === 1 ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const scopeName = outletId
    ? outlets.find((x) => x.id === outletId)?.name
    : outlets.length === 1 ? outlets[0].name : t('dashboard.allOutlets')
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

  const quick = [
    { href: '/pos/notes', label: t('dashboard.quick.notes'), icon: <Wrench /> },
    { href: '/pos/sales', label: t('dashboard.quick.sale'), icon: <ShoppingCart /> },
    { href: '/warehouse/stock', label: t('dashboard.quick.stock'), icon: <Boxes />, guarded: true },
    { href: '/members', label: t('dashboard.quick.members'), icon: <IdCard /> },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4 md:space-y-5">
        {/* Header: where and when, then the period; the everyday shortcuts sit right under the title */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#5F675F]">
              <span suppressHydrationWarning className="capitalize">{today}</span>
              {scopeName && <> · {scopeName}</>}
            </p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#17201D] md:text-3xl">{t('dashboard.heading')}</h1>
            <nav aria-label={t('dashboard.quick.title')} className="mt-3 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
              {quick.map((q) => (
                <button
                  key={q.href}
                  onClick={() => (!q.guarded || inventoryAccess.guard()) && router.push(q.href)}
                  className="glass-button inline-flex flex-col items-center gap-1 rounded-lg border border-[#E4E6E7] bg-white px-1 py-2 text-xs font-medium text-[#2F3A35] transition-colors hover:text-[#0F5F56] sm:flex-row sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[13px]"
                >
                  <span className="text-[#0F5F56] [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.75]">{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </nav>
          </div>
          <FilterBar
            outlets={outlets.length > 1 ? outlets.map((x) => ({ value: x.id, label: x.name })) : undefined}
            outletValue={outletId}
            onOutletChange={setOutletId}
            periodValue={days}
            periodOptions={PERIODS}
            onPeriodChange={setDays}
          />
        </header>

        {overview.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t('dashboard.loadFailed')}</p>
        )}

        {/* Figures: revenue leads, the rest read across one band */}
        {loading || !cur || !prev || !o ? (
          <Skeleton className="h-[168px] rounded-xl" />
        ) : (
          <Panel className="!p-0 lg:grid lg:grid-cols-[1.5fr_3fr]">
            <div className="flex flex-col justify-between gap-4 border-b border-[#17201D]/[0.07] p-4 md:p-5 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-[13px] text-[#5F675F]">{t('dashboard.kpi.revenue')}</p>
                <p className="mt-1 text-[32px] font-bold leading-none tracking-tight text-[#17201D] tabular-nums md:text-[40px]">{formatCurrency(cur.revenue)}</p>
                <div className="mt-2"><Delta now={cur.revenue} before={prev.revenue} label={vsLabel} /></div>
              </div>
              {o.daily.length > 1 && (
                <div className="h-10 w-full">
                  <Suspense fallback={null}><Sparkline values={o.daily.map((d) => d.revenue)} /></Suspense>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3">
              <Figure label={t('dashboard.kpi.grossProfit')} value={formatCurrency(cur.grossProfit)}
                delta={<Delta now={cur.grossProfit} before={prev.grossProfit} label={vsLabel} quiet />}
                footnote={o.uncostedLines > 0
                  ? <span className="text-amber-700">{t('dashboard.kpi.uncosted').replace('{n}', String(o.uncostedLines))}</span>
                  : stats ? t('dashboard.kpi.operating').replace('{expenses}', formatCurrency(stats.totalExpenses || 0)).replace('{profit}', formatCurrency(stats.operatingProfit || 0)) : undefined} />
              <Figure label={t('dashboard.kpi.transactions')} value={cur.transactions.toLocaleString('id-ID')}
                delta={<Delta now={cur.transactions} before={prev.transactions} label={vsLabel} quiet />}
                footnote={t('dashboard.kpi.avgTicket').replace('{amount}', formatCurrency(cur.averageTicket))} />
              <Figure label={t('dashboard.kpi.serviceNotes')} value={cur.serviceNotes.toLocaleString('id-ID')}
                delta={<Delta now={cur.serviceNotes} before={prev.serviceNotes} label={vsLabel} quiet />}
                footnote={cur.transactions ? t('dashboard.kpi.serviceShare').replace('{pct}', String(Math.round((cur.serviceNotes / cur.transactions) * 100))) : undefined} />
            </div>
          </Panel>
        )}

        {/* Daily sales, with who pays and how next to it */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3">
          <Panel
            title={t('dashboard.daily.title')}
            className="xl:col-span-2"
            action={
              <div className="flex items-center gap-3 text-xs text-[#5F675F]">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#0F5F56]" />{t('dashboard.daily.goods')}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#E9A23B]" />{t('dashboard.daily.services')}</span>
              </div>
            }
          >
            {loading || !o ? <Skeleton className="h-[260px]" /> : (
              <Suspense fallback={<Skeleton className="h-[260px]" />}>
                <DailySalesChart daily={o.daily} labels={{ goods: t('dashboard.daily.goods'), services: t('dashboard.daily.services') }} />
              </Suspense>
            )}
          </Panel>

          <div className="flex flex-col gap-3 md:gap-4">
            <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              className="glass-panel-dark rounded-xl bg-[#0F5F56] p-4 text-white md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('dashboard.topMember.title')}</h2>
                <Link href="/members" className="text-xs font-medium text-white/75 underline-offset-2 hover:text-white hover:underline">{t('dashboard.viewAll')}</Link>
              </div>
              {loading ? <Skeleton className="h-20 bg-white/10" /> : o && o.topCustomers.length > 0 ? (
                <ol className="space-y-2.5">
                  {o.topCustomers.slice(0, 3).map((c, i) => (
                    <li key={c.customerId} className="flex items-baseline gap-3">
                      <span className={`w-5 shrink-0 font-mono text-xs tabular-nums ${i === 0 ? 'text-[#F6C979]' : 'text-white/50'}`}>{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate ${i === 0 ? 'text-[15px] font-semibold' : 'text-sm'}`}>{c.name}</p>
                        <p className="text-xs text-white/60">{c.memberCode ? `${c.memberCode} · ` : ''}{t('dashboard.topMember.visits').replace('{n}', String(c.visits))}</p>
                      </div>
                      <span className={`shrink-0 tabular-nums ${i === 0 ? 'text-[15px] font-semibold' : 'text-sm text-white/85'}`}>{formatCurrency(c.spent)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-white/70">{t('dashboard.topMember.empty')}</p>
              )}
            </motion.section>

            <Panel title={t('dashboard.methods.title')} className="flex-1">
              {loading || !o ? <Skeleton className="h-[96px]" /> : o.paymentMethods.length === 0 ? (
                <p className="text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
              ) : (
                <>
                  {/* One bar split by method: honest at one method, readable at five */}
                  <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                    {o.paymentMethods.map((m, i) => (
                      <motion.span key={m.method} className="h-full first:rounded-l-full last:rounded-r-full" style={{ background: SERIES[i % SERIES.length] }}
                        initial={{ width: 0 }} animate={{ width: `${methodTotal ? (m.revenue / methodTotal) * 100 : 0}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {o.paymentMethods.map((m, i) => (
                      <li key={m.method} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
                        <span className="flex-1 truncate text-[#17201D]">{methodLabel(m.method)}</span>
                        <span className="text-xs text-[#8A9188] tabular-nums">{m.count}× · {methodTotal ? pct(m.revenue / methodTotal) : '0%'}</span>
                        <span className="w-28 text-right font-medium text-[#17201D] tabular-nums">{formatCurrency(m.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>
        </div>

        {/* Today: hours and the workshop floor */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3">
          <Panel title={t('dashboard.hourly.title')} className="xl:col-span-2"
            action={o && todayTotal > 0 ? <span className="text-sm font-semibold text-[#17201D] tabular-nums">{formatCurrency(todayTotal)}</span> : undefined}>
            {loading || !o ? <Skeleton className="h-[220px]" /> : todayTotal === 0 ? (
              <p className="rounded-lg border border-dashed border-[#17201D]/10 px-4 py-8 text-center text-sm text-[#8A9188]">{t('dashboard.hourly.empty')}</p>
            ) : (
              <Suspense fallback={<Skeleton className="h-[220px]" />}>
                <HourlyChart hours={o.hourlyToday} />
              </Suspense>
            )}
          </Panel>

          <Panel title={t('dashboard.mechanics.title')}>
            {loading || !o ? <Skeleton className="h-[120px]" /> : o.mechanicsToday.length === 0 ? (
              <p className="text-sm text-[#8A9188]">{t('dashboard.mechanics.empty')}</p>
            ) : (
              <ul className="divide-y divide-[#17201D]/[0.06]">
                {o.mechanicsToday.map((m) => (
                  <li key={m.mechanicId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#17201D]">{m.name}</p>
                      <p className="text-xs text-[#8A9188]">{t('dashboard.mechanics.done').replace('{n}', String(m.paidToday))}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.openNotes > 0 ? 'text-amber-700' : 'text-[#5F675F]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.openNotes > 0 ? 'bg-amber-500' : 'bg-[#5FB3A6]'}`} />
                      {m.openNotes > 0 ? t('dashboard.mechanics.busy').replace('{n}', String(m.openNotes)) : t('dashboard.mechanics.idle')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* What sells, by item and by category, and what is running out */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
          <Panel title={t('dashboard.topItems.title')}>
            {loading || !o ? <Skeleton className="h-[200px]" /> : o.topItems.length === 0 ? (
              <p className="text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
            ) : (
              <ol className="space-y-3">
                {o.topItems.map((item, i) => (
                  <li key={`${item.name}-${i}`} className="flex gap-3">
                    <span className="w-5 shrink-0 pt-px font-mono text-xs text-[#8A9188] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate text-[#17201D]">
                          {item.name}
                          {item.isService && <span className="ml-1.5 text-[11px] font-medium text-amber-700">{t('dashboard.daily.services')}</span>}
                        </span>
                        <span className="shrink-0 text-xs text-[#5F675F] tabular-nums">{t('dashboard.topItems.qty').replace('{n}', item.quantity.toLocaleString('id-ID'))}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#17201D]/[0.06]">
                        <motion.div className="h-1 rounded-full" style={{ background: item.isService ? '#E9A23B' : '#0F5F56' }}
                          initial={{ width: 0 }} animate={{ width: `${(item.quantity / maxItemQty) * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title={t('dashboard.categories.title')}>
            {loading || !o ? <Skeleton className="h-[200px]" /> : o.categories.length === 0 ? (
              <p className="text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {o.categories.slice(0, 6).map((c, i) => (
                  <li key={c.category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-[#17201D]">{c.category}</span>
                      <span className="shrink-0 text-xs text-[#5F675F] tabular-nums">{formatCurrency(c.revenue)} · <span className="font-semibold text-[#17201D]">{pct(c.share)}</span></span>
                    </div>
                    <div className="h-1 rounded-full bg-[#17201D]/[0.06]">
                      <motion.div className="h-1 rounded-full" style={{ background: SERIES[i % SERIES.length] }}
                        initial={{ width: 0 }} animate={{ width: `${Math.max(2, c.share * 100)}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('dashboard.lowStock.title')}
            action={lowStock && lowStock.length > 0 ? <span className="text-xs font-semibold text-red-600 tabular-nums">{lowStock.length}</span> : undefined}>
            {!lowStock ? <Skeleton className="h-[120px]" /> : lowStock.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-[#5F675F]"><CheckCircle2 className="h-4 w-4 text-[#0F5F56]" />{t('dashboard.lowStock.none')}</p>
            ) : (
              <>
                <ul className="divide-y divide-[#17201D]/[0.06]">
                  {lowStock.slice(0, 5).map((s) => (
                    <li key={`${s.productId}-${s.outletName}`} className="flex items-center gap-3 py-2 first:pt-0">
                      <span className="min-w-0 flex-1 truncate text-sm text-[#17201D]">{s.productName}</span>
                      <span className="shrink-0 text-sm font-semibold text-red-600 tabular-nums">{t('dashboard.lowStock.left').replace('{n}', String(s.currentStock))}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => inventoryAccess.guard() && router.push('/warehouse/stock')}
                  className="mt-3 text-sm font-semibold text-[#0F5F56] underline-offset-2 hover:underline">
                  {t('dashboard.lowStock.record')} →
                </button>
              </>
            )}
          </Panel>
        </div>

        {/* Latest sales */}
        <Panel title={t('dashboard.recent.title')}
          action={<Link href="/pos/history" className="text-sm font-semibold text-[#0F5F56] underline-offset-2 hover:underline">{t('dashboard.viewAll')}</Link>}>
          {loading || !o ? <Skeleton className="h-[240px]" /> : o.recent.length === 0 ? (
            <p className="text-sm text-[#8A9188]">{t('dashboard.empty')}</p>
          ) : (
            <>
            {/* Phones: one row per sale instead of a table that scrolls sideways */}
            <ul className="-mx-4 divide-y divide-[#17201D]/[0.06] border-t border-[#17201D]/[0.06] md:hidden">
              {o.recent.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#17201D]">
                      {r.customerName ?? t('dashboard.recent.walkIn')}
                      {r.serviceNote && <span className="ml-2 text-[11px] font-medium text-[#0F5F56]">{t('dashboard.recent.serviceNote')}</span>}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[#8A9188]">{r.number || '—'}</p>
                    <p className="mt-0.5 text-xs text-[#5F675F] tabular-nums">{shortTime(r.createdAt)} · {r.items} {t('dashboard.recent.items').toLowerCase()} · {methodLabel(r.paymentMethod)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[#17201D] tabular-nums">{formatCurrency(r.total)}</p>
                </li>
              ))}
            </ul>
            <div className="-mx-4 hidden overflow-x-auto md:-mx-5 md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-[#17201D]/[0.06] text-left text-xs font-medium text-[#8A9188]">
                    <th className="px-4 py-2.5 font-medium md:px-5">{t('dashboard.recent.number')}</th>
                    <th className="px-3 py-2.5 font-medium">{t('dashboard.recent.time')}</th>
                    <th className="px-3 py-2.5 font-medium">{t('dashboard.recent.customer')}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t('dashboard.recent.items')}</th>
                    <th className="px-3 py-2.5 font-medium">{t('dashboard.recent.method')}</th>
                    <th className="px-4 py-2.5 text-right font-medium md:px-5">{t('dashboard.recent.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17201D]/[0.06]">
                  {o.recent.map((r) => (
                    <tr key={r.id} className="hover:bg-white/40">
                      <td className="px-4 py-3 font-mono text-xs text-[#5F675F] md:px-5">{r.number || '—'}</td>
                      <td className="px-3 py-3 text-[#5F675F] tabular-nums">{shortTime(r.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className="text-[#17201D]">{r.customerName ?? t('dashboard.recent.walkIn')}</span>
                        {r.serviceNote && <span className="ml-2 text-[11px] font-medium text-[#0F5F56]">{t('dashboard.recent.serviceNote')}</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-[#5F675F] tabular-nums">{r.items}</td>
                      <td className="px-3 py-3 text-[#5F675F]">{methodLabel(r.paymentMethod)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#17201D] tabular-nums md:px-5">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Panel>

        {inventoryAccess.modal}
      </div>
    </MotionConfig>
  )
}
