'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'

function StyledSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
    </div>
  )
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  warning:  'bg-yellow-600 text-white',
  low:      'bg-orange-600 text-white',
}
const SEVERITY_LABEL: Record<string, string> = {
  critical: '🚨 CRITICAL',
  warning:  '⚠️ WARNING',
  low:      '⚡ LOW',
}

export default function InventoryMonitorPage() {
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [stockThreshold,   setStockThreshold]   = useState<10 | 20 | 50>(10)

  const { data: outletsResponse }   = trpc.outlets.getAll.useQuery()
  const outlets                     = outletsResponse?.outlets || []
  const { data: inventoryList, isLoading: inventoryLoading } = trpc.stock.getInventoryList.useQuery({ outletId: selectedOutletId || undefined })
  const { data: stats }             = trpc.dashboard.getStats.useQuery({ outletId: selectedOutletId || undefined })
  const { data: lowStock }          = trpc.dashboard.getLowStock.useQuery({ outletId: selectedOutletId || undefined, threshold: stockThreshold })

  const products         = inventoryList || []
  const selectedOutlet   = outlets.find(o => o.id === selectedOutletId)
  const healthyCount     = (products?.length || 0) - (lowStock?.length || 0)

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Monitor Inventori" subtitle="Level stok real-time di semua lokasi" />

      {/* Filters */}
      <SectionCard title="Filter">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StyledSelect
            label="Outlet"
            value={selectedOutletId}
            onChange={setSelectedOutletId}
            options={[{ value: '', label: 'Semua Outlet' }, ...outlets.map(o => ({ value: o.id, label: o.name }))]}
          />
          <StyledSelect
            label="Threshold Stok Rendah"
            value={stockThreshold.toString()}
            onChange={v => setStockThreshold(Number(v) as 10 | 20 | 50)}
            options={[
              { value: '10', label: '10 unit atau kurang' },
              { value: '20', label: '20 unit atau kurang' },
              { value: '50', label: '50 unit atau kurang' },
            ]}
          />
        </div>
        {selectedOutlet && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl">
            <span className="text-purple-500">🏪</span>
            <div>
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">{selectedOutlet.name}</p>
              {selectedOutlet.address && <p className="text-xs text-purple-600 dark:text-purple-400">{selectedOutlet.address}</p>}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatCard icon="📦" label="Total Produk"     value={stats?.totalProducts || products.length || 0} color="blue"   sub="Di sistem" />
        <StatCard icon="🏪" label="Total Outlet"     value={selectedOutletId ? 1 : stats?.totalOutlets || outlets.length || 0} color="gray"   sub="Lokasi" />
        <StatCard icon="⚠️" label="Stok Rendah"      value={lowStock?.length || 0}  color="red"    sub={`Di bawah ${stockThreshold} unit`} />
        <StatCard icon="✅" label="Stok Normal"       value={healthyCount}           color="green"  sub="Produk cukup" />
      </div>

      {/* Low Stock Alert */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">⚠️ Butuh Perhatian Segera</p>
            <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[11px] font-bold rounded-full">
              {lowStock.length} item
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['Produk', 'SKU', 'Kategori', 'Outlet', 'Stok Saat Ini', 'Status'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lowStock.map(item => {
                  const sev = item.currentStock <= 5 ? 'critical' : item.currentStock <= 10 ? 'warning' : 'low'
                  return (
                    <tr key={`${item.productId}-${item.outletId}`}
                      className={`hover:opacity-80 transition-opacity ${sev === 'critical' ? 'bg-red-50 dark:bg-red-900/20' : sev === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                      <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{item.productName}</td>
                      <td className="px-3 md:px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.productSku}</td>
                      <td className="px-3 md:px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{item.productCategory || '—'}</td>
                      <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{item.outletName}</td>
                      <td className="px-3 md:px-4 py-3 text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.currentStock}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">unit</p>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${SEVERITY_BADGE[sev]}`}>
                          {SEVERITY_LABEL[sev]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Products */}
      <SectionCard title="📋 Semua Inventori Produk">
        {inventoryLoading ? (
          <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">⏳ Memuat inventori...</div>
        ) : !products || products.length === 0 ? (
          <EmptyState icon="📦" title="Tidak ada produk" description="Tambahkan produk untuk mulai memantau inventori." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['Nama Produk', 'SKU', 'Kategori', 'Stok', 'Harga'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map(product => {
                  const status = product.currentStock === 0 ? 'out' : product.currentStock <= 10 ? 'low' : 'ok'
                  const stockColor = status === 'out' ? 'text-red-600' : status === 'low' ? 'text-yellow-600' : 'text-green-600'
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{product.name}</td>
                      <td className="px-3 md:px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{product.sku}</td>
                      <td className="px-3 md:px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-semibold">
                          {product.category || 'Umum'}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3">
                        <p className={`text-base font-bold ${stockColor}`}>{product.currentStock.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {status === 'out' ? '❌ Habis' : status === 'low' ? '⚠️ Rendah' : '✅ Tersedia'}
                        </p>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(product.price || 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
