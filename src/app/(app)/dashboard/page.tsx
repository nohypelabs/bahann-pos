'use client'

import { lazy, Suspense, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ChartSkeleton } from '@/components/ui/Skeletons'

const DashboardRevenueChart = lazy(() => import('@/components/charts/DashboardRevenueChart'))

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subColor = 'gray',
  loading,
  icon,
}: {
  label: string
  value: string | number
  sub: string
  subColor?: 'gray' | 'green' | 'red'
  loading?: boolean
  icon: string
}) {
  const subClass =
    subColor === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : subColor === 'red'
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-400 dark:text-gray-500'

  return (
    <Card variant="default" padding="sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
          {loading ? (
            <div className="h-7 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none truncate">
              {value}
            </p>
          )}
          <p className={`text-xs font-medium truncate ${subClass}`}>{sub}</p>
        </div>
        <span className="text-2xl select-none flex-shrink-0">{icon}</span>
      </div>
    </Card>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [selectedOutletId, setSelectedOutletId] = useState<string>('')
  const [dateRange, setDateRange] = useState<7 | 14 | 30 | 0>(7)

  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets || []

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery({
    outletId: selectedOutletId || undefined,
  })
  const { data: salesTrend, isLoading: trendLoading } = trpc.dashboard.getSalesTrend.useQuery({
    outletId: selectedOutletId || undefined,
    days: dateRange,
  })
  const { data: topProducts, isLoading: topProductsLoading } = trpc.dashboard.getTopProducts.useQuery({
    outletId: selectedOutletId || undefined,
    days: dateRange,
  })
  const { data: lowStock } = trpc.dashboard.getLowStock.useQuery({
    outletId: selectedOutletId || undefined,
    threshold: 10,
  })
  const { data: recentTransactions, isLoading: transactionsLoading } = trpc.dashboard.getRecentTransactions.useQuery({
    outletId: selectedOutletId || undefined,
    limit: 5,
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  const dateLabel =
    dateRange === 0 ? 'All Time' : `${dateRange} Hari Terakhir`

  const RANK_COLORS = ['#f59e0b', '#6b7280', '#92400e', '#10b981', '#3b82f6']

  return (
    <div className="space-y-5 md:space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {t('dashboard.title')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.overview')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            fullWidth
            options={[
              { value: '', label: t('dashboard.allOutlets') },
              ...outlets.map((o) => ({ value: o.id, label: o.name })),
            ]}
          />
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full sm:w-auto">
            {([7, 14, 30, 0] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                  dateRange === d
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {d === 0 ? 'All' : `${d}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t('dashboard.totalRevenue')}
          value={formatCurrency(stats?.totalRevenue || 0)}
          sub={`${stats?.transactionCount || 0} transaksi`}
          subColor="green"
          loading={statsLoading}
          icon="💰"
        />
        <StatCard
          label={t('dashboard.totalProducts')}
          value={(stats?.totalProducts || 0).toLocaleString()}
          sub="In inventory"
          loading={statsLoading}
          icon="📦"
        />
        <StatCard
          label={t('dashboard.lowStock')}
          value={stats?.lowStockCount || 0}
          sub={(stats?.lowStockCount || 0) > 0 ? t('warehouse.stock.lowStockAlert') : t('warehouse.stock.noLowStock')}
          subColor={(stats?.lowStockCount || 0) > 0 ? 'red' : 'green'}
          loading={statsLoading}
          icon="⚠️"
        />
        <StatCard
          label={t('dashboard.totalOutlets')}
          value={stats?.totalOutlets || 0}
          sub="Active locations"
          loading={statsLoading}
          icon="🏪"
        />
      </div>

      {/* ── Revenue Chart (Nivo) ── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tren Penjualan</h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{dateLabel}</p>
          </div>
          {salesTrend && salesTrend.length > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
              {salesTrend.length} hari
            </span>
          )}
        </div>
        <Card variant="elevated" padding="md">
        <CardBody>
          {trendLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <DashboardRevenueChart
                data={salesTrend || []}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                height={280}
              />
            </Suspense>
          )}
        </CardBody>
        </Card>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { label: 'Record Stock', icon: '📦', path: '/warehouse/stock', variant: 'secondary' as const },
            { label: 'New Sale', icon: '🛒', path: '/pos/sales', variant: 'primary' as const },
            { label: 'Products', icon: '📋', path: '/products', variant: 'secondary' as const },
            { label: 'Outlets', icon: '🏪', path: '/outlets', variant: 'secondary' as const },
          ].map((a) => (
            <Button
              key={a.path}
              variant={a.variant}
              size="lg"
              onClick={() => router.push(a.path)}
            >
              {a.icon} {a.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Low Stock Alert (conditional) ── */}
      {lowStock && lowStock.length > 0 && (
        <Card variant="default" padding="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>⚠️ Low Stock Alert</CardTitle>
              <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
                {lowStock.length} items
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {lowStock.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.outletName} · {item.productSku}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-base font-bold text-red-600">{item.currentStock}</p>
                    <p className="text-xs text-gray-400">units left</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Two-column: Top Products + Recent Transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Products */}
        <Card variant="default" padding="sm">
          <CardHeader>
            <CardTitle>🏆 Top Selling Products</CardTitle>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{dateLabel}</p>
          </CardHeader>
          <CardBody>
            {topProductsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topProducts && topProducts.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {topProducts.map((product, i) => (
                  <div key={product.productId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span
                      className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: RANK_COLORS[i] ?? '#6b7280' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {product.productName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{product.productSku}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {product.totalQuantity} unit
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(product.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">Belum ada data penjualan</p>
            )}
          </CardBody>
        </Card>

        {/* Recent Transactions */}
        <Card variant="default" padding="sm">
          <CardHeader>
            <CardTitle>🧾 Recent Transactions</CardTitle>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">5 transaksi terakhir</p>
          </CardHeader>
          <CardBody>
            {transactionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentTransactions && recentTransactions.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm">
                      🛒
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {tx.productName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {tx.outletName} · {formatDateTime(tx.date)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {tx.quantity} unit
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(tx.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">Belum ada transaksi</p>
            )}
          </CardBody>
        </Card>
      </div>

    </div>
  )
}
