'use client'

import { lazy, Suspense, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { FilterBar } from '@/components/ui/FilterBar'
import { trpc } from '@/lib/trpc/client'
import { ChartSkeleton, ExportLoadingSkeleton } from '@/components/ui/Skeletons'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getLimits } from '@/lib/plans'

const RevenueLineChart = lazy(() => import('@/components/charts/RevenueLineChartLazy'))
const ItemsSoldBarChart = lazy(() => import('@/components/charts/ItemsSoldBarChartLazy'))
const RevenuePieChart   = lazy(() => import('@/components/charts/RevenuePieChartLazy'))
const ReportExporter    = lazy(() => import('@/components/reports/ReportExporter'))

const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function ReportsPage() {
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [dateRange, setDateRange]               = useState<1 | 7 | 14 | 30 | 0>(30)
  const [showExporter, setShowExporter]         = useState(false)

  const { data: planData }       = trpc.auth.getPlan.useQuery()
  const canExport                = getLimits(planData?.plan ?? 'free').canExport
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets                  = outletsResponse?.outlets || []

  const { data: stats }        = trpc.dashboard.getStats.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })
  const { data: salesTrend }   = trpc.dashboard.getSalesTrend.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })
  const { data: topProducts }  = trpc.dashboard.getTopProducts.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })

  const avgDailyRevenue  = salesTrend?.length ? salesTrend.reduce((s, d) => s + d.revenue, 0) / salesTrend.length : 0
  const avgItemsPerDay   = salesTrend?.length ? salesTrend.reduce((s, d) => s + d.itemsSold, 0) / salesTrend.length : 0
  const highestRevenue   = salesTrend?.length ? Math.max(...salesTrend.map(d => d.revenue)) : 0
  const lowestRevenue    = salesTrend?.length ? Math.min(...salesTrend.map(d => d.revenue)) : 0

  const pieData = topProducts?.map((p, i) => ({ name: p.productName, value: p.totalRevenue, color: COLORS[i % COLORS.length] }))
  const outletOptions = outlets.map(o => ({ value: o.id, label: o.name }))

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Laporan Keuangan" subtitle="Analitik revenue dan penjualan yang komprehensif" />

      <FilterBar
        outlets={outletOptions}
        outletValue={selectedOutletId}
        onOutletChange={setSelectedOutletId}
        periodValue={dateRange}
        onPeriodChange={v => setDateRange(v as 1 | 7 | 14 | 30 | 0)}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <StatCard icon="💰" label="Total Revenue"   value={formatCurrency(stats?.totalRevenue || 0)}     color="green"  sub={dateRange === 0 ? 'All time' : `${dateRange} hari`} />
        <StatCard icon="📈" label="Rata-rata/Hari"  value={formatCurrency(avgDailyRevenue)}              color="blue"   sub="Per hari" />
        <StatCard icon="🧾" label="Transaksi"       value={stats?.transactionCount || 0}                 color="purple" sub="Selesai" />
        <StatCard icon="📦" label="Avg Item/Hari"   value={Math.round(avgItemsPerDay)}                   color="yellow" sub="Unit" />
      </div>

      {/* Revenue Trend */}
      <SectionCard title="📈 Tren Revenue">
        {salesTrend && salesTrend.length > 0 ? (
          <Suspense fallback={<ChartSkeleton height={200} />}>
            <RevenueLineChart data={salesTrend} formatCurrency={formatCurrency} formatDate={formatDate} className="h-[200px] md:h-[320px]" hideMobileYAxis />
          </Suspense>
        ) : (
          <div className="h-[200px] md:h-80 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">Belum ada data revenue</div>
        )}
      </SectionCard>

      {/* Items Sold */}
      <SectionCard title="📦 Item Terjual">
        {salesTrend && salesTrend.length > 0 ? (
          <Suspense fallback={<ChartSkeleton height={160} />}>
            <ItemsSoldBarChart data={salesTrend} formatDate={formatDate} className="h-[160px] md:h-[320px]" hideMobileYAxis />
          </Suspense>
        ) : (
          <div className="h-[160px] md:h-80 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">Belum ada data penjualan</div>
        )}
      </SectionCard>

      {/* Top Products + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <SectionCard title="🏆 Produk Terlaris berdasarkan Revenue">
          {topProducts && topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const pct = stats?.totalRevenue ? (p.totalRevenue / stats.totalRevenue) * 100 : 0
                return (
                  <div key={p.productId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{p.productName}</p>
                          <p className="text-xs text-gray-400 truncate">{p.totalQuantity}× · {p.productSku}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(p.totalRevenue)}</p>
                        <p className="text-xs text-gray-400">{pct.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">Belum ada data penjualan</div>
          )}
        </SectionCard>

        <SectionCard title="📊 Distribusi Revenue">
          {pieData && pieData.length > 0 ? (
            <Suspense fallback={<ChartSkeleton height={320} />}>
              <RevenuePieChart data={pieData} formatCurrency={formatCurrency} />
            </Suspense>
          ) : (
            <div className="h-[200px] md:h-80 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">Belum ada data distribusi</div>
          )}
        </SectionCard>
      </div>

      {/* Performance Metrics */}
      <SectionCard title="📉 Metrik Performa">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Tertinggi/Hari</p>
            <p className="text-base md:text-xl font-bold text-green-900 dark:text-green-200">{formatCurrency(highestRevenue)}</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-400 font-semibold mb-1">Terendah/Hari</p>
            <p className="text-base md:text-xl font-bold text-red-900 dark:text-red-200">{formatCurrency(lowestRevenue)}</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">Avg Transaksi</p>
            <p className="text-base md:text-xl font-bold text-blue-900 dark:text-blue-200">
              {formatCurrency(stats?.transactionCount ? stats.totalRevenue / stats.transactionCount : 0)}
            </p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-1">Total Item Terjual</p>
            <p className="text-base md:text-xl font-bold text-purple-900 dark:text-purple-200">
              {(stats?.totalItemsSold || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Export */}
      <SectionCard
        title="Export Laporan"
        action={canExport
          ? <Button variant="primary" onClick={() => setShowExporter(!showExporter)}>📥 Export Data</Button>
          : <a href="/settings/subscriptions"><Button variant="secondary">🔒 Upgrade untuk Export</Button></a>
        }
      >
        {!canExport && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              Fitur export tersedia mulai plan <strong>Warung</strong> ke atas.
            </p>
            <a href="/settings/subscriptions" className="text-sm text-amber-700 dark:text-amber-300 underline mt-1 inline-block">
              Lihat pilihan upgrade →
            </a>
          </div>
        )}
        {canExport && showExporter && (
          <Suspense fallback={<ExportLoadingSkeleton />}>
            <ReportExporter outletId={selectedOutletId || undefined} days={dateRange} onClose={() => setShowExporter(false)} />
          </Suspense>
        )}
      </SectionCard>
    </div>
  )
}
