'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { FilterBar } from '@/components/ui/FilterBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { trpc } from '@/lib/trpc/client'
import { getLimits } from '@/lib/plans'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Receipt, Package, CreditCard, History, BarChart3, FileText, Lock } from 'lucide-react'

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
  voided:    'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
  refunded:  'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
}
const STATUS_LABEL: Record<string, string> = {
  completed: '✓ Completed',
  voided:    '✕ Voided',
  refunded:  '↩ Refunded',
}

export default function SalesHistoryPage() {
  const [dateRange, setDateRange]           = useState<1 | 7 | 14 | 30 | 0>(7)
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [searchQuery, setSearchQuery]       = useState('')

  const { data: planData }       = trpc.auth.getPlan.useQuery()
  const canExport                = getLimits(planData?.plan ?? 'free').canExport
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets                  = outletsResponse?.outlets || []
  const { data: productsResponse } = trpc.products.getAll.useQuery()
  const products                 = productsResponse?.products || []

  const { data: salesTrend }         = trpc.dashboard.getSalesTrend.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })
  const { data: recentTransactions } = trpc.dashboard.getRecentTransactions.useQuery({ outletId: selectedOutletId || undefined, limit: 50, days: dateRange || undefined })
  const { data: stats }              = trpc.dashboard.getStats.useQuery({ outletId: selectedOutletId || undefined, days: dateRange })

  const filteredTransactions = recentTransactions?.filter(tx => {
    if (selectedProductId && !tx.id.includes(selectedProductId)) {
      // Filter by product name since the flat tx has productName
      const prod = products.find(p => p.id === selectedProductId)
      if (prod && tx.productName !== prod.name) return false
    }
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      tx.productName.toLowerCase().includes(q) ||
      tx.outletName.toLowerCase().includes(q) ||
      tx.productSku?.toLowerCase().includes(q) ||
      tx.transactionId?.toLowerCase().includes(q) ||
      tx.cashierName?.toLowerCase().includes(q)
    )
  })

  // Per-product summary — includes ALL products (even zero sales)
  const productSummary = (() => {
    const soldMap = new Map<string, { totalQty: number; totalRevenue: number; transactionCount: number }>()
    if (filteredTransactions?.length) {
      for (const tx of filteredTransactions) {
        const existing = soldMap.get(tx.productName)
        if (existing) {
          existing.totalQty += tx.quantity
          existing.totalRevenue += tx.revenue
          existing.transactionCount += 1
        } else {
          soldMap.set(tx.productName, { totalQty: tx.quantity, totalRevenue: tx.revenue, transactionCount: 1 })
        }
      }
    }

    // Merge with all products list
    const result = products.map(p => {
      const sold = soldMap.get(p.name)
      return {
        name: p.name,
        sku: p.sku || 'N/A',
        totalQty: sold?.totalQty ?? 0,
        totalRevenue: sold?.totalRevenue ?? 0,
        transactionCount: sold?.transactionCount ?? 0,
      }
    })

    // Include any sold products not in the products list (edge case)
    for (const [name, data] of soldMap) {
      if (!result.find(r => r.name === name)) {
        result.push({ name, sku: 'N/A', ...data })
      }
    }

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue)
  })()

  const outletOptions = outlets.map(o => ({ value: o.id, label: o.name }))
  const avgTx = stats?.transactionCount ? stats.totalRevenue / stats.transactionCount : 0

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Riwayat Penjualan" subtitle="Lihat dan analisis semua transaksi penjualan" />

      {/* Filters */}
      <SectionCard title="Filter">
        <div className="space-y-3">
          <FilterBar
            outlets={outletOptions}
            outletValue={selectedOutletId}
            onOutletChange={setSelectedOutletId}
            periodValue={dateRange}
            onPeriodChange={v => setDateRange(v as 1 | 7 | 14 | 30 | 0)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              >
                <option value="">Semua Produk</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
            </div>
            <Input type="text" placeholder="Cari ID transaksi, produk, SKU, outlet, kasir..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} fullWidth />
          </div>
        </div>
      </SectionCard>

      {/* Per-Product Summary — top report */}
      {productSummary.length > 0 && (
        <SectionCard title="Laporan Per Produk">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['Produk', 'SKU', 'Total Qty', 'Total Revenue', 'Jml Transaksi'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {productSummary.map(p => (
                  <tr key={p.name} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${p.totalQty === 0 ? 'opacity-60' : ''}`}>
                    <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {p.name}
                      {p.totalQty === 0 && <span className="ml-2 text-[10px] font-bold text-gray-400 dark:text-gray-500">Tidak Terjual</span>}
                    </td>
                    <td className="px-3 md:px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{p.sku}</td>
                    <td className="px-3 md:px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.totalQty === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}`}>
                        {p.totalQty.toLocaleString()} unit
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(p.totalRevenue)}</td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{p.transactionCount}x</td>
                  </tr>
                ))}
                <tr className="bg-gray-900 dark:bg-gray-700 text-white font-bold">
                  <td className="px-3 md:px-4 py-3 text-sm" colSpan={2}>Total</td>
                  <td className="px-3 md:px-4 py-3 text-sm">{productSummary.reduce((s, p) => s + p.totalQty, 0).toLocaleString()} unit</td>
                  <td className="px-3 md:px-4 py-3 text-sm">{formatCurrency(productSummary.reduce((s, p) => s + p.totalRevenue, 0))}</td>
                  <td className="px-3 md:px-4 py-3 text-sm">{productSummary.reduce((s, p) => s + p.transactionCount, 0)}x</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatCard icon={<DollarSign />} label="Total Revenue"   value={formatCurrency(stats?.totalRevenue || 0)}     color="green"  sub={dateRange === 0 ? 'All time' : `${dateRange} hari`} />
        <StatCard icon={<Receipt />} label="Transaksi"       value={stats?.transactionCount || 0}                  color="blue"   sub="Total penjualan" />
        <StatCard icon={<Package />} label="Item Terjual"    value={(stats?.totalItemsSold || 0).toLocaleString()} color="purple" sub="Unit" />
        <StatCard icon={<CreditCard />} label="Avg Transaksi"   value={formatCurrency(avgTx)}                         color="gray"   sub="Per penjualan" />
      </div>

      {/* Daily breakdown */}
      {salesTrend && salesTrend.length > 0 && (
        <SectionCard title="Rincian Revenue Harian">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['Tanggal', 'Revenue', 'Item Terjual'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {salesTrend.map(day => (
                  <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtDate(day.date)}</td>
                    <td className="px-3 md:px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(day.revenue)}</td>
                    <td className="px-3 md:px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{day.itemsSold.toLocaleString()} unit</td>
                  </tr>
                ))}
                <tr className="bg-gray-900 dark:bg-gray-700 text-white font-bold">
                  <td className="px-3 md:px-4 py-3 text-sm">Total</td>
                  <td className="px-3 md:px-4 py-3 text-sm">{formatCurrency(salesTrend.reduce((s, d) => s + d.revenue, 0))}</td>
                  <td className="px-3 md:px-4 py-3 text-sm">{salesTrend.reduce((s, d) => s + d.itemsSold, 0).toLocaleString()} unit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Transaction List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Semua Transaksi</p>
          <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-full">
            {filteredTransactions?.length || 0}
          </span>
        </div>

        {!filteredTransactions || filteredTransactions.length === 0 ? (
          <EmptyState icon={<History />} title="Tidak ada transaksi"
            description={searchQuery ? 'Coba ubah kata kunci pencarian.' : 'Belum ada penjualan yang dicatat.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['ID Transaksi', 'Tanggal & Waktu', 'Produk', 'Outlet', 'Status', 'Qty', 'Revenue'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 md:px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{tx.transactionId || 'N/A'}</td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{fmtDateTime(tx.date)}</td>
                    <td className="px-3 md:px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tx.productName}</p>
                      {tx.productSku && <p className="text-xs font-mono text-gray-400">SKU: {tx.productSku}</p>}
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{tx.outletName}</p>
                      {tx.cashierName && <p className="text-xs text-gray-400">Kasir: {tx.cashierName}</p>}
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[tx.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                        {STATUS_LABEL[tx.status] || tx.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">
                        {tx.quantity} unit
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(tx.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export */}
      <SectionCard title="Export Data">
        {canExport ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" disabled><BarChart3 className="w-4 h-4 mr-1" /> Export ke CSV</Button>
            <Button variant="secondary" disabled><FileText className="w-4 h-4 mr-1" /> Export ke PDF</Button>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fitur export segera hadir</p>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              <Lock className="w-4 h-4 inline mr-1" /> Fitur export tersedia mulai plan <strong>Warung</strong> ke atas.
            </p>
            <a href="/settings/subscriptions" className="text-sm text-amber-700 dark:text-amber-300 underline mt-1 inline-block">
              Upgrade sekarang →
            </a>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
