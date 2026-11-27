'use client'

// Recharts is heavy, so the dashboard loads this file lazily.
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { DashboardOverview } from '@/domain/dashboard/overview'

export const CHART = {
  brand: '#0F5F56',
  brandLight: '#5FB3A6',
  amber: '#E9A23B',
  grid: '#EEF0F0',
  axis: '#8A9188',
  series: ['#0F5F56', '#E9A23B', '#5FB3A6', '#C9772B', '#8A9188', '#2F6F9F'],
}

/** "Rp 1,2 jt" / "Rp 250 rb" for axes, where full amounts do not fit. */
export function compactRupiah(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000).toLocaleString('id-ID')} rb`
  return n.toLocaleString('id-ID')
}

const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid #E4E6E7', boxShadow: '0 4px 16px rgba(23,32,29,0.08)', fontSize: 12 },
  labelStyle: { color: '#17201D', fontWeight: 600, marginBottom: 4 },
  cursor: { fill: 'rgba(15,95,86,0.06)' },
}

/** Tiny bars for a KPI card: the shape of the period, no axes. */
export function Sparkline({ values, color = CHART.brand }: { values: number[]; color?: string }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
        <Bar dataKey="v" fill={color} radius={[3, 3, 3, 3]} isAnimationActive animationDuration={500} minPointSize={2} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DailySalesChart({ daily, labels }: { daily: DashboardOverview['daily']; labels: { goods: string; services: string } }) {
  const many = daily.length > 14
  const data = daily.map((d) => ({
    ...d,
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString('id-ID', many ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }),
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={many ? '18%' : '28%'}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} interval="preserveStartEnd" minTickGap={12} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} tickFormatter={compactRupiah} width={56} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [formatCurrency(Number(v)), name === 'goods' ? labels.goods : labels.services]} />
        <Bar dataKey="goods" stackId="s" fill={CHART.brand} radius={[0, 0, 4, 4]} animationDuration={600} />
        <Bar dataKey="services" stackId="s" fill={CHART.amber} radius={[4, 4, 0, 0]} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HourlyChart({ hours }: { hours: DashboardOverview['hourlyToday'] }) {
  // Opening hours with a margin: 07:00–21:00, widened to any hour that had a sale.
  const sold = hours.filter((h) => h.transactions > 0).map((h) => h.hour)
  const first = Math.min(7, ...sold), last = Math.max(21, ...sold)
  const data = hours.filter((h) => h.hour >= first && h.hour <= last).map((h) => ({ ...h, label: `${String(h.hour).padStart(2, '0')}:00` }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CHART.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} tickFormatter={compactRupiah} width={56} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: CHART.brandLight, strokeDasharray: '4 4' }}
          formatter={(v, _n, item) => [`${formatCurrency(Number(v))} · ${(item.payload as { transactions: number }).transactions} transaksi`, 'Omzet']} />
        <Area type="monotone" dataKey="revenue" stroke={CHART.brand} strokeWidth={2} fill="url(#hourFill)" animationDuration={700}
          dot={false} activeDot={{ r: 4, fill: CHART.brand, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
