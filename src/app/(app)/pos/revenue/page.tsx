'use client'

import { lazy, Suspense, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { FilterBar } from '@/components/ui/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { ChartSkeleton } from '@/components/ui/Skeletons'

const RevenueAreaChart    = lazy(() => import('@/components/charts/RevenueAreaChartLazy'))
const DailyRevenueBarChart = lazy(() => import('@/components/charts/DailyRevenueBarChartLazy'))

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function RevenueTrackingPage() {
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [dateRange, setDateRange] = useState<1 | 7 | 14 | 30 | 0>(7)

  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets || []
  const { data: stats }            = trpc.dashboard.getStats.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })
  const { data: salesTrend }       = trpc.dashboard.getSalesTrend.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })
  const { data: recentTransactions } = trpc.dashboard.getRecentTransactions.useQuery({ outletId: selectedOutletId || undefined, limit: 10 })

  const totalRevenue  = salesTrend?.reduce((s, d) => s + d.revenue, 0) || 0
  const averageDaily  = salesTrend && salesTrend.length > 0 ? totalRevenue / salesTrend.length : 0

  const growthRate = (() => {
    if (!salesTrend || salesTrend.length < 2) return 0
    const half = Math.floor(salesTrend.length / 2)
    const first  = salesTrend.slice(0, half).reduce((s, d) => s + d.revenue, 0)
    const second = salesTrend.slice(half).reduce((s, d) => s + d.revenue, 0)
    return first === 0 ? 0 : ((second - first) / first) * 100
  })()

  const outletOptions = outlets.map(o => ({ value: o.id, label: o.name }))

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Revenue Tracking" subtitle="Monitor pendapatan dan performa toko" />

      <FilterBar
        outlets={outletOptions}
        outletValue={selectedOutletId}
        onOutletChange={setSelectedOutletId}
        periodValue={dateRange}
        onPeriodChange={v => setDateRange(v as 1 | 7 | 14 | 30 | 0)}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <StatCard icon="💰" label="Total Revenue"   value={formatCurrency(totalRevenue)} color="green" sub={dateRange === 0 ? 'All time' : `${dateRange} hari`} />
        <StatCard icon="📈" label="Rata-rata/Hari"  value={formatCurrency(averageDaily)} color="blue"  sub="Per hari" />
        <StatCard icon="📊" label="Pertumbuhan"     value={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`} color={growthRate >= 0 ? 'green' : 'red'} sub="vs. periode sebelumnya" />
        <StatCard icon="🧾" label="Transaksi"       value={stats?.transactionCount || 0} color="purple" sub="Selesai" />
      </div>

      {/* Revenue Trend */}
      <SectionCard title="💰 Revenue Trend">
        {salesTrend && salesTrend.length > 0 ? (
          <Suspense fallback={<ChartSkeleton height={220} />}>
            <RevenueAreaChart
              data={salesTrend}
              formatCurrency={formatCurrency}
              formatDate={fmtDate}
              className="h-[220px] md:h-[384px]"
              hideMobileYAxis
            />
          </Suspense>
        ) : (
          <EmptyState icon="💰" title="Belum ada data revenue" description="Mulai proses penjualan untuk melihat tren pendapatan." />
        )}
      </SectionCard>

      {/* Daily Comparison */}
      <SectionCard title="📊 Perbandingan Harian">
        {salesTrend && salesTrend.length > 0 ? (
          <Suspense fallback={<ChartSkeleton height={180} />}>
            <DailyRevenueBarChart
              data={salesTrend}
              formatCurrency={formatCurrency}
              formatDate={fmtDate}
              className="h-[180px] md:h-[320px]"
              hideMobileYAxis
            />
          </Suspense>
        ) : (
          <EmptyState icon="📊" title="Belum ada data" description="Data perbandingan harian akan tampil setelah ada transaksi." />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Performance Metrics */}
        <SectionCard title="📈 Metrik Performa">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
              <div>
                <p className="text-xs text-green-700 dark:text-green-400 font-semibold">Total Revenue</p>
                <p className="text-lg font-bold text-green-900 dark:text-green-200">{formatCurrency(totalRevenue)}</p>
              </div>
              <span className="text-2xl">💰</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">Avg Nilai Transaksi</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  {formatCurrency(stats?.transactionCount ? stats.totalRevenue / stats.transactionCount : 0)}
                </p>
              </div>
              <span className="text-2xl">💳</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <div>
                <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold">Item Terjual</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-200">
                  {(stats?.totalItemsSold || 0).toLocaleString()}
                </p>
              </div>
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </SectionCard>

        {/* Revenue Goals */}
        <SectionCard title="🎯 Target Revenue">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Target Harian</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(5000000)}</p>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{ width: `${Math.min((averageDaily / 5000000) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{((averageDaily / 5000000) * 100).toFixed(1)}% tercapai</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Target Bulanan</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(150000000)}</p>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${Math.min((totalRevenue / 150000000) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{((totalRevenue / 150000000) * 100).toFixed(1)}% tercapai</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">💡 Pertahankan konsistensi harian untuk mencapai target bulanan</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Recent Transactions */}
      <SectionCard title="💎 Transaksi Terbaru">
        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{tx.productName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.outletName} · {fmtDateTime(tx.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(tx.revenue)}</p>
                  <p className="text-xs text-gray-400">{tx.quantity}×</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="💎" title="Belum ada transaksi" description="Mulai proses penjualan untuk melihat transaksi terbaru." />
        )}
      </SectionCard>
    </div>
  )
}
