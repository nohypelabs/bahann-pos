'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, ArrowDownToLine, ArrowUpFromLine, Settings, RotateCcw, AlertTriangle } from 'lucide-react'

const MOVEMENT_TYPE_CONFIG = {
  IN: { label: 'Masuk', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', icon: ArrowDownToLine },
  OUT: { label: 'Keluar', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: ArrowUpFromLine },
  ADJUSTMENT: { label: 'Adjust', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: Settings },
  RETURN: { label: 'Retur', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: RotateCcw },
  DAMAGED: { label: 'Rusak', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300', icon: AlertTriangle },
} as const

type MovementType = keyof typeof MOVEMENT_TYPE_CONFIG

export default function StockMovementsPage() {
  const [search, setSearch] = useState('')
  const [outletFilter, setOutletFilter] = useState('')

  const { data: outletsData } = trpc.outlets.getAll.useQuery()
  const outlets = outletsData?.outlets || []

  const { data: movementsData, isLoading } = trpc.stock.getMovements.useQuery({
    outletId: outletFilter || undefined,
    limit: 100,
  })

  const movements = movementsData?.movements || []

  const filteredMovements = movements.filter((m: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.product?.name?.toLowerCase().includes(q) ||
      m.product?.sku?.toLowerCase().includes(q) ||
      m.user?.name?.toLowerCase().includes(q)
    )
  })

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Riwayat Pergerakan Stok"
        subtitle="Lacak siapa yang mengubah stok, kapan, dan mengapa"
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk, SKU, atau petugas..."
              className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Semua Outlet</option>
            {outlets.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
            <span className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu</span>
            <span className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</span>
            <span className="col-span-1 text-xs font-bold text-gray-500 uppercase tracking-wider">SKU</span>
            <span className="col-span-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Outlet</span>
            <span className="col-span-1 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Tipe</span>
            <span className="col-span-1 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Jumlah</span>
            <span className="col-span-1 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sebelum</span>
            <span className="col-span-1 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Sesudah</span>
            <span className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Petugas</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="py-12 text-center text-gray-400">Memuat data...</div>
            ) : filteredMovements.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                {search ? `"${search}" tidak ditemukan` : 'Belum ada pergerakan stok'}
              </div>
            ) : (
              filteredMovements.map((m: any) => {
                const config = MOVEMENT_TYPE_CONFIG[(m.movement_type as MovementType)] || MOVEMENT_TYPE_CONFIG.IN
                const Icon = config.icon
                return (
                  <div key={m.id}>
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <span className="col-span-2 text-xs text-gray-500">{formatDateTime(m.created_at)}</span>
                      <span className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.product?.name || '-'}</span>
                      <span className="col-span-1 text-xs text-gray-400 font-mono">{m.product?.sku || '-'}</span>
                      <span className="col-span-1 text-xs text-gray-600 dark:text-gray-400 truncate">{m.outlet?.name || '-'}</span>
                      <div className="col-span-1 flex justify-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color}`}>
                          <Icon size={10} />
                          {config.label}
                        </span>
                      </div>
                      <span className="col-span-1 text-sm font-bold text-center text-gray-900 dark:text-gray-100">{m.quantity}</span>
                      <span className="col-span-1 text-xs text-center text-gray-500">{m.previous_stock}</span>
                      <span className="col-span-1 text-xs text-center font-medium text-gray-700 dark:text-gray-300">{m.new_stock}</span>
                      <span className="col-span-2 text-xs text-gray-600 dark:text-gray-400 truncate">{m.user?.name || '-'}</span>
                    </div>
                    {/* Mobile row */}
                    <div className="md:hidden px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.product?.name || '-'}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color}`}>
                          <Icon size={10} />
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{m.outlet?.name || '-'}</span>
                        <span>{formatDateTime(m.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">oleh {m.user?.name || '-'}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {m.previous_stock} → {m.new_stock}
                          <span className={`ml-1.5 text-xs font-normal ${m.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                            ({m.movement_type === 'IN' ? '+' : '-'}{m.quantity})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {filteredMovements.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400">{filteredMovements.length} pergerakan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
