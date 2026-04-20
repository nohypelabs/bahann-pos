'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'

// ─── Stepper ────────────────────────────────────────────────────────────────
function Stepper({
  label, sub, value, onChange, min = 0, accent = 'blue',
}: {
  label: string; sub?: string; value: number
  onChange: (v: number) => void; min?: number; accent?: 'blue' | 'red'
}) {
  const ring = accent === 'red'
    ? 'border-red-300 dark:border-red-700'
    : 'border-blue-300 dark:border-blue-700'
  const btn = accent === 'red'
    ? 'hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400'
    : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 dark:text-blue-400'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tracking-wide uppercase">{label}</span>
      <div className={`flex items-center border-2 ${ring} rounded-xl overflow-hidden bg-white dark:bg-gray-800`}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className={`w-9 h-11 flex items-center justify-center font-bold text-xl transition-colors ${btn}`}
        >−</button>
        <input
          type="number"
          value={value}
          onChange={e => {
            const n = parseInt(e.target.value)
            onChange(isNaN(n) ? 0 : Math.max(min, n))
          }}
          min={min}
          className="w-14 h-11 text-center font-bold text-gray-900 dark:text-white bg-transparent border-0 outline-none text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={`w-9 h-11 flex items-center justify-center font-bold text-xl transition-colors ${btn}`}
        >+</button>
      </div>
      {sub && <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: 'gray' | 'blue' | 'green' | 'yellow' }) {
  const map = {
    gray:   'bg-gray-50  dark:bg-gray-800   border-gray-200  dark:border-gray-700  text-gray-800  dark:text-gray-100',
    blue:   'bg-blue-50  dark:bg-blue-900/30 border-blue-200  dark:border-blue-800  text-blue-900  dark:text-blue-100',
    green:  'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  }
  const sub = {
    gray: 'text-gray-500 dark:text-gray-400',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-700 dark:text-yellow-400',
  }
  return (
    <div className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border ${map[color]}`}>
      <span className="text-xl md:text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className={`text-[11px] md:text-xs font-medium ${sub[color]}`}>{label}</p>
        <p className="text-base md:text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function StockManagementPage() {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    productId: '',
    outletId: '',
    stockDate: today,
    stockAwal: 0,
    stockIn: 0,
    stockOut: 0,
    stockAkhir: 0,
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  const { data: productsResponse, isLoading: productsLoading } = trpc.products.getAll.useQuery()
  const { data: outletsResponse, isLoading: outletsLoading } = trpc.outlets.getAll.useQuery()

  const products = productsResponse?.products || []
  const outlets = outletsResponse?.outlets || []

  const canFetchLatest = !!(formData.productId && formData.outletId)
  const { data: latestStock, isLoading: latestStockLoading, refetch: refetchLatest } = trpc.stock.getLatest.useQuery(
    { productId: formData.productId, outletId: formData.outletId },
    { enabled: canFetchLatest }
  )

  useEffect(() => {
    if (!canFetchLatest) return
    const current = latestStock?.stockAkhir ?? 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(prev => ({
      ...prev,
      stockAwal: current,
      stockAkhir: current + prev.stockIn - prev.stockOut,
    }))
  }, [latestStock, canFetchLatest])

  const { data: stats, refetch: refetchStats } = trpc.dashboard.getStats.useQuery({})
  const { data: lowStock } = trpc.dashboard.getLowStock.useQuery({ threshold: 10 })

  const recordStockMutation = trpc.stock.record.useMutation()

  const setStockIn = (stockIn: number) =>
    setFormData(prev => ({ ...prev, stockIn, stockAkhir: prev.stockAwal + stockIn - prev.stockOut }))

  const setStockOut = (stockOut: number) =>
    setFormData(prev => ({ ...prev, stockOut, stockAkhir: prev.stockAwal + prev.stockIn - stockOut }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowSuccess(false)
    if (!formData.productId) { setError('Pilih produk terlebih dahulu'); return }
    if (!formData.outletId) { setError('Pilih outlet terlebih dahulu'); return }
    try {
      await recordStockMutation.mutateAsync(formData)
      setShowSuccess(true)
      refetchStats()
      refetchLatest()
      setFormData(prev => ({ ...prev, stockIn: 0, stockOut: 0, stockAkhir: prev.stockAwal }))
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan stok')
    }
  }

  const selectedProduct = products.find(p => p.id === formData.productId)
  const selectedOutlet  = outlets.find(o => o.id === formData.outletId)
  const akhirNegative   = formData.stockAkhir < 0

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-base md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-0.5 md:mb-1">
          Manajemen Stok
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
          Catat pergerakan stok harian dan pantau inventori
        </p>
      </div>

      {/* ── Alerts ── */}
      {showSuccess && (
        <div className="flex items-center gap-3 p-3.5 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl">
          <span className="text-lg">✅</span>
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">Stok berhasil dicatat!</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl">
          <span className="text-lg">❌</span>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 items-start">

        {/* ────── Form Card ────── */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">

          {/* Section: Produk & Outlet */}
          <div className="px-4 md:px-6 pt-4 md:pt-5 pb-4 md:pb-5 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              1 · Pilih Produk &amp; Outlet
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Product */}
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={formData.productId}
                    onChange={e => setFormData({ ...formData, productId: e.target.value })}
                    required
                    disabled={productsLoading}
                    className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors disabled:opacity-50"
                  >
                    <option value="">📦 Pilih produk…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                </div>

                {selectedProduct && (
                  <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-sm shrink-0">📦</div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">{selectedProduct.name}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400">
                        {selectedProduct.sku}{selectedProduct.category ? ` · ${selectedProduct.category}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Outlet */}
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={formData.outletId}
                    onChange={e => setFormData({ ...formData, outletId: e.target.value })}
                    required
                    disabled={outletsLoading}
                    className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-colors disabled:opacity-50"
                  >
                    <option value="">🏪 Pilih outlet…</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                </div>

                {selectedOutlet && (
                  <div className="flex items-start gap-2.5 p-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-sm shrink-0">🏪</div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-purple-900 dark:text-purple-200 truncate">{selectedOutlet.name}</p>
                      {selectedOutlet.address && (
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 truncate">{selectedOutlet.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Tanggal */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              2 · Tanggal Pencatatan
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={formData.stockDate}
                onChange={e => setFormData({ ...formData, stockDate: e.target.value })}
                required
                className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              />
              {formData.stockDate !== today && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, stockDate: today }))}
                  className="px-3 py-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                >
                  Hari ini
                </button>
              )}
              {formData.stockDate === today && (
                <span className="px-3 py-2.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl whitespace-nowrap">
                  ✓ Hari ini
                </span>
              )}
            </div>
          </div>

          {/* Section: Pergerakan Stok */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
              3 · Pergerakan Stok
            </p>

            {/* Calculator Strip */}
            <div className="flex items-end justify-center gap-2 md:gap-3 flex-wrap">

              {/* Stok Awal */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Awal</span>
                <div className="w-16 h-11 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800">
                  {canFetchLatest && latestStockLoading
                    ? <span className="text-gray-400 text-sm animate-pulse">…</span>
                    : <span className="font-bold text-lg text-gray-900 dark:text-white">{formData.stockAwal}</span>
                  }
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {canFetchLatest ? 'otomatis' : 'pilih dulu'}
                </span>
              </div>

              <span className="text-gray-300 dark:text-gray-600 font-bold text-xl pb-5">+</span>

              {/* Stock In */}
              <Stepper label="Masuk" sub="diterima" value={formData.stockIn} onChange={setStockIn} accent="blue" />

              <span className="text-gray-300 dark:text-gray-600 font-bold text-xl pb-5">−</span>

              {/* Stock Out */}
              <Stepper label="Keluar" sub="terjual" value={formData.stockOut} onChange={setStockOut} accent="red" />

              <span className="text-gray-300 dark:text-gray-600 font-bold text-xl pb-5">=</span>

              {/* Stok Akhir */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Akhir</span>
                <div className={`w-16 h-11 flex items-center justify-center border-2 rounded-xl font-bold text-lg ${
                  akhirNegative
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  {formData.stockAkhir}
                </div>
                <span className={`text-[10px] font-medium ${akhirNegative ? 'text-red-500' : 'text-green-500'}`}>
                  {akhirNegative ? 'negatif!' : 'unit'}
                </span>
              </div>
            </div>

            {/* Result banner */}
            <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
              akhirNegative
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            }`}>
              <span>{akhirNegative ? '⚠️' : '📦'}</span>
              <span>
                Stok akhir: <strong>{formData.stockAkhir} unit</strong>
                {akhirNegative && ' — stok tidak boleh negatif'}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="px-4 md:px-6 py-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={recordStockMutation.isPending || productsLoading || outletsLoading || akhirNegative}
            >
              {recordStockMutation.isPending ? 'Menyimpan…' : '✅ Simpan Pergerakan Stok'}
            </Button>
          </div>
        </form>

        {/* ────── Right Panel ────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Summary Stats */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 md:px-5 pt-4 pb-2">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ringkasan Inventori</p>
            </div>
            <div className="px-4 md:px-5 pb-4 space-y-2">
              <StatCard icon="📦" label="Total Produk" value={(stats?.totalProducts ?? 0).toLocaleString()} color="gray" />
              <StatCard icon="🏪" label="Total Outlet" value={stats?.totalOutlets ?? 0} color="blue" />
              <StatCard icon="🛒" label="Total Item Terjual" value={(stats?.totalItemsSold ?? 0).toLocaleString()} color="green" />
              {(stats?.lowStockCount ?? 0) > 0 && (
                <StatCard icon="⚠️" label="Stok Hampir Habis" value={`${stats!.lowStockCount} produk`} color="yellow" />
              )}
            </div>
          </div>

          {/* How to use */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">💡 Cara pakai</p>
            <ul className="text-[11px] text-blue-700 dark:text-blue-400 space-y-1 leading-relaxed">
              <li>• Pilih produk dan outlet</li>
              <li>• Stok Awal otomatis dari catatan terakhir</li>
              <li>• Isi Masuk (barang datang) &amp; Keluar (barang terjual)</li>
              <li>• Stok Akhir = Awal + Masuk − Keluar</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Low Stock Table ── */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-white">⚠️ Stok Hampir Habis</p>
            <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
              {lowStock.length} produk
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 md:px-6 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</th>
                  <th className="hidden md:table-cell text-left px-4 md:px-6 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 md:px-6 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outlet</th>
                  <th className="text-right px-4 md:px-6 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sisa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lowStock.map(item => (
                  <tr key={`${item.productId}-${item.outletId}`} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                    <td className="px-4 md:px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{item.productName}</td>
                    <td className="hidden md:table-cell px-4 md:px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{item.productSku}</td>
                    <td className="px-4 md:px-6 py-3 text-xs text-gray-600 dark:text-gray-400">{item.outletName}</td>
                    <td className="px-4 md:px-6 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
                        {item.currentStock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
