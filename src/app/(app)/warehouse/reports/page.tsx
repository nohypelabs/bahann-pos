'use client'

import { lazy, Suspense, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'
import { ChartSkeleton, ExportLoadingSkeleton } from '@/components/ui/Skeletons'
import { formatCurrency, formatDate } from '@/lib/utils'

// Lazy load heavy chart components - only loaded when data is available
const RevenueLineChart = lazy(() => import('@/components/charts/RevenueLineChartLazy'))
const ItemsSoldBarChart = lazy(() => import('@/components/charts/ItemsSoldBarChartLazy'))
const RevenuePieChart = lazy(() => import('@/components/charts/RevenuePieChartLazy'))

// Lazy load export functionality - only when user clicks export
const ReportExporter = lazy(() => import('@/components/reports/ReportExporter'))

export default function ReportsPage() {
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [dateRange, setDateRange] = useState<7 | 14 | 30 | 0>(30)
  const [showExporter, setShowExporter] = useState(false)

  const { data: planData } = trpc.auth.getPlan.useQuery()
  const canExport = planData?.plan !== 'free'

  // Fetch data
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets || []

  const { data: stats } = trpc.dashboard.getStats.useQuery({
    outletId: selectedOutletId || undefined,
  })
  const { data: salesTrend } = trpc.dashboard.getSalesTrend.useQuery({
    outletId: selectedOutletId || undefined,
    days: dateRange,
  })
  const { data: topProducts } = trpc.dashboard.getTopProducts.useQuery({
    outletId: selectedOutletId || undefined,
    days: dateRange,
  })

  // Using centralized utility functions for formatting
  const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

  // Calculate metrics
  const averageDailyRevenue = salesTrend && salesTrend.length > 0
    ? salesTrend.reduce((sum, day) => sum + day.revenue, 0) / salesTrend.length
    : 0

  const averageItemsPerDay = salesTrend && salesTrend.length > 0
    ? salesTrend.reduce((sum, day) => sum + day.itemsSold, 0) / salesTrend.length
    : 0

  const highestRevenue = salesTrend && salesTrend.length > 0
    ? Math.max(...salesTrend.map(day => day.revenue))
    : 0

  const lowestRevenue = salesTrend && salesTrend.length > 0
    ? Math.min(...salesTrend.map(day => day.revenue))
    : 0

  // Prepare data for pie chart
  const pieData = topProducts?.map((product, index) => ({
    name: product.productName,
    value: product.totalRevenue,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Financial Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Comprehensive revenue and sales analytics</p>
      </div>

      {/* Filters */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Outlet"
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              options={[
                { value: '', label: 'All Outlets' },
                ...(outlets?.map(outlet => ({
                  value: outlet.id,
                  label: outlet.name,
                })) || []),
              ]}
              fullWidth
            />
            <Select
              label="Time Period"
              value={dateRange.toString()}
              onChange={(e) => setDateRange(Number(e.target.value) as 7 | 14 | 30 | 0)}
              options={[
                { value: '7', label: 'Last 7 Days' },
                { value: '14', label: 'Last 14 Days' },
                { value: '30', label: 'Last 30 Days' },
                { value: '0', label: 'All Time' },
              ]}
              fullWidth
            />
          </div>
        </CardBody>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="default" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(stats?.totalRevenue || 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{dateRange === 0 ? 'All Time' : `${dateRange} days`}</p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Avg Daily Revenue</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(averageDailyRevenue)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Per day</p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Transactions</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats?.transactionCount || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed sales</p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Avg Items/Day</p>
            <p className="text-3xl font-bold text-orange-600">
              {Math.round(averageItemsPerDay)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Units sold</p>
          </div>
        </Card>
      </div>

      {/* Revenue Trend Chart - Lazy loaded with Suspense */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>📈 Revenue Trend</CardTitle>
        </CardHeader>
        <CardBody>
          {salesTrend && salesTrend.length > 0 ? (
            <Suspense fallback={<ChartSkeleton height={320} />}>
              <RevenueLineChart
                data={salesTrend}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </Suspense>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No revenue data available for the selected period
            </div>
          )}
        </CardBody>
      </Card>

      {/* Items Sold Trend - Lazy loaded */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>📦 Items Sold Trend</CardTitle>
        </CardHeader>
        <CardBody>
          {salesTrend && salesTrend.length > 0 ? (
            <Suspense fallback={<ChartSkeleton height={320} />}>
              <ItemsSoldBarChart
                data={salesTrend}
                formatDate={formatDate}
              />
            </Suspense>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data available
            </div>
          )}
        </CardBody>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>🏆 Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardBody>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => {
                  const percentage = stats?.totalRevenue
                    ? (product.totalRevenue / stats.totalRevenue) * 100
                    : 0

                  return (
                    <div key={product.productId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm`}
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{product.productName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {product.totalQuantity} units • SKU: {product.productSku}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(product.totalRevenue)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                No sales data available
              </div>
            )}
          </CardBody>
        </Card>

        {/* Revenue Distribution Pie Chart - Lazy loaded */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>📊 Revenue Distribution</CardTitle>
          </CardHeader>
          <CardBody>
            {pieData && pieData.length > 0 ? (
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <RevenuePieChart
                  data={pieData}
                  formatCurrency={formatCurrency}
                />
              </Suspense>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No revenue distribution data
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <CardTitle>📉 Performance Metrics</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border-2 border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400 font-semibold mb-2">Highest Daily Revenue</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                {formatCurrency(highestRevenue)}
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border-2 border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400 font-semibold mb-2">Lowest Daily Revenue</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-200">
                {formatCurrency(lowestRevenue)}
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold mb-2">Avg Transaction Value</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {formatCurrency(
                  stats?.transactionCount && stats.transactionCount > 0
                    ? stats.totalRevenue / stats.transactionCount
                    : 0
                )}
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl border-2 border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold mb-2">Total Items Sold</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                {stats?.totalItemsSold.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Export Section - Lazy loaded only when opened */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Export Report</h3>
          {canExport ? (
            <Button
              variant="primary"
              onClick={() => setShowExporter(!showExporter)}
            >
              📥 Export Data
            </Button>
          ) : (
            <a href="/settings/subscriptions">
              <Button variant="secondary">
                🔒 Upgrade untuk Export
              </Button>
            </a>
          )}
        </div>

        {!canExport && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
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
            <ReportExporter
              data={{
                salesTrend: salesTrend || [],
                topProducts: topProducts || [],
                stats,
              }}
              onClose={() => setShowExporter(false)}
            />
          </Suspense>
        )}
      </Card>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">💡 About Financial Reports:</p>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Track revenue trends and sales performance over time</li>
          <li>• Analyze top-performing products and their contribution to total revenue</li>
          <li>• Monitor daily performance metrics and identify peak sales periods</li>
          <li>• Filter by outlet and time period for detailed location-specific insights</li>
          <li>• Use data to make informed decisions about inventory and pricing</li>
        </ul>
      </div>
    </div>
  )
}
