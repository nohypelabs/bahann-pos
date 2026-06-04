'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { BulkImportModal } from '@/components/products/BulkImportModal'
import { trpc } from '@/lib/trpc/client'
import type { Product, SelectChangeEvent } from '@/types'
import { Package, FolderOpen, CheckCircle, AlertTriangle, Tag, Trash2, Download, Search, Pencil, Plus } from 'lucide-react'

const fmtCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount) : '—'

// ─── Modal shell ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <SectionCard title={title}
          action={<button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition-colors">✕</button>}
        >
          {children}
        </SectionCard>
      </div>
    </div>
  )
}

// ─── Pricing Tier Row ─────────────────────────────────────────────────────────
interface PricingTierData {
  minQuantity: number
  pricePerUnit: number
}

function PricingTierBuilder({ tiers, onChange }: { tiers: PricingTierData[]; onChange: (tiers: PricingTierData[]) => void }) {
  const addTier = () => onChange([...tiers, { minQuantity: tiers.length > 0 ? Math.max(...tiers.map(t => t.minQuantity)) + 10 : 1, pricePerUnit: 0 }])
  const removeTier = (idx: number) => onChange(tiers.filter((_, i) => i !== idx))
  const updateTier = (idx: number, field: keyof PricingTierData, value: number) => {
    const updated = [...tiers]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Tier Harga</label>
      {tiers.map((tier, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 mb-0.5 block">Min. Qty</label>
            <input type="number" min="1" value={tier.minQuantity} onChange={e => updateTier(idx, 'minQuantity', parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 mb-0.5 block">Harga/Unit (Rp)</label>
            <input type="number" min="0" step="1" value={tier.pricePerUnit} onChange={e => updateTier(idx, 'pricePerUnit', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none" />
          </div>
          <button type="button" onClick={() => removeTier(idx)} className="mt-4 text-red-400 hover:text-red-600 text-sm font-bold">✕</button>
        </div>
      ))}
      <button type="button" onClick={addTier}
        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
        + Tambah Tier
      </button>
    </div>
  )
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductFormModal({ product, onClose, onSuccess }: { product: Product | null; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '', barcode: product?.barcode || '',
    name: product?.name || '', category: product?.category || '',
    price: product?.price || '' as string | number,
    itemType: (product as any)?.item_type || 'PRODUCT',
    stockBehavior: (product as any)?.stock_behavior || 'TRACKED',
    pricingModel: (product as any)?.pricing_model || 'FIXED',
    durationMinutes: (product as any)?.duration_minutes || '' as string | number,
  })
  const [pricingTiers, setPricingTiers] = useState<PricingTierData[]>(
    (() => {
      const raw = (product as any)?.pricing_tiers
      if (!raw) return []
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    })()
  )
  const { showToast } = useToast()
  const createProduct = trpc.products.create.useMutation()
  const updateProduct = trpc.products.update.useMutation()
  const isPending = createProduct.isPending || updateProduct.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data: Record<string, unknown> = {
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        name: formData.name,
        category: formData.category || undefined,
        price: formData.price ? parseFloat(formData.price.toString()) : undefined,
        itemType: formData.itemType,
        stockBehavior: formData.stockBehavior,
        pricingModel: formData.pricingModel,
      }

      if (formData.pricingModel === 'TIERED') {
        data.pricingTiers = pricingTiers.length > 0 ? pricingTiers : undefined
      }
      if (formData.pricingModel === 'TIME_BASED' && formData.durationMinutes) {
        data.durationMinutes = parseInt(formData.durationMinutes.toString())
      }

      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...data } as any)
        showToast('Produk berhasil diperbarui!', 'success')
      } else {
        await createProduct.mutateAsync(data as any)
        showToast('Produk berhasil dibuat!', 'success')
      }
      onSuccess()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operasi gagal', 'error')
    }
  }

  const f = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }))

  // Auto-set stock behavior when item type changes
  const handleItemTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value
    setFormData(prev => ({
      ...prev,
      itemType: type,
      // Auto-suggest stock behavior based on item type
      stockBehavior: type === 'SERVICE' ? 'UNTRACKED' : type === 'MENU' ? 'UNTRACKED' : prev.stockBehavior,
      // Auto-suggest pricing model
      pricingModel: type === 'SERVICE' ? 'FIXED' : type === 'MENU' ? 'FIXED' : prev.pricingModel,
    }))
  }

  return (
    <Modal title={product ? 'Edit Produk' : 'Tambah Produk Baru'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Item Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Tipe Item</label>
          <select value={formData.itemType} onChange={handleItemTypeChange}
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors">
            <option value="PRODUCT">📦 Produk Fisik</option>
            <option value="MENU">🍜 Menu / Makanan</option>
            <option value="SERVICE">✂️ Jasa / Layanan</option>
            <option value="PACKAGE">📦 Paket / Bundle</option>
          </select>
        </div>

        <Input label="SKU *" type="text" value={formData.sku} onChange={f('sku')} placeholder="PROD-001" fullWidth required />
        <Input label="Barcode" type="text" value={formData.barcode as string} onChange={f('barcode')} placeholder="8991234567890" fullWidth />
        <Input label="Nama Produk *" type="text" value={formData.name} onChange={f('name')} placeholder="Coca Cola 330ml" fullWidth required />
        <Input label="Kategori" type="text" value={formData.category} onChange={f('category')} placeholder="Minuman" fullWidth />
        <Input label="Harga (Rp)" type="number" step="1" min="0" value={formData.price as number} onChange={f('price')} placeholder="5000" fullWidth />

        {/* Stock Behavior */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Perilaku Stok</label>
          <select value={formData.stockBehavior} onChange={f('stockBehavior')}
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors">
            <option value="TRACKED">📊 Stok Terlacak</option>
            <option value="UNTRACKED">♾️ Tanpa Stok</option>
            <option value="CONSUMED">🍳 Stok Bahan Baku (Resep)</option>
          </select>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {formData.stockBehavior === 'TRACKED' && 'Stok dipotong otomatis setiap transaksi'}
            {formData.stockBehavior === 'UNTRACKED' && 'Stok tidak dilacak — cocok untuk jasa dan menu standar'}
            {formData.stockBehavior === 'CONSUMED' && 'Stok bahan baku dikurangi via resep'}
          </p>
        </div>

        {/* Pricing Model */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Model Harga</label>
          <select value={formData.pricingModel} onChange={f('pricingModel')}
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors">
            <option value="FIXED">💰 Harga Tetap</option>
            <option value="TIERED">📊 Harga Grosir (Tiered)</option>
            <option value="TIME_BASED">⏱️ Harga Per Durasi</option>
          </select>
        </div>

        {/* Tiered Pricing Builder */}
        {formData.pricingModel === 'TIERED' && (
          <PricingTierBuilder tiers={pricingTiers} onChange={setPricingTiers} />
        )}

        {/* Time-Based Duration */}
        {formData.pricingModel === 'TIME_BASED' && (
          <Input label="Durasi (menit) *" type="number" step="1" min="1" value={formData.durationMinutes as number}
            onChange={f('durationMinutes')} placeholder="60" fullWidth />
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth disabled={isPending}>Batal</Button>
          <Button type="submit" variant="primary" fullWidth disabled={isPending}>
            {isPending ? 'Menyimpan…' : product ? 'Update Produk' : 'Buat Produk'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Batch Update Category Modal ─────────────────────────────────────────────
function BatchUpdateCategoryModal({ selectedCount, onClose, onSuccess, productIds, categories }: {
  selectedCount: number; onClose: () => void; onSuccess: () => void
  productIds: string[]; categories: string[]
}) {
  const [newCategory, setNewCategory] = useState('')
  const { showToast } = useToast()
  const batchUpdate = trpc.products.batchUpdateCategory.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) { showToast('Masukkan nama kategori', 'error'); return }
    try {
      const result = await batchUpdate.mutateAsync({ productIds, category: newCategory.trim() })
      showToast(`${result.count} produk berhasil diperbarui!`, 'success')
      onSuccess()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal update produk', 'error')
    }
  }

  return (
    <Modal title="Update Kategori (Batch)" onClose={onClose}>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{selectedCount} produk dipilih</p>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Kategori akan diubah untuk semua produk yang dipilih</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Kategori Baru *" type="text" value={newCategory}
          onChange={e => setNewCategory(e.target.value)} placeholder="Minuman, Makanan…" fullWidth required />
        {categories.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Kategori yang ada:</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => setNewCategory(cat)}
                  className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-700 dark:text-gray-300 hover:text-blue-800 dark:hover:text-blue-200 rounded-lg transition-colors">
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth disabled={batchUpdate.isPending}>Batal</Button>
          <Button type="submit" variant="primary" fullWidth disabled={batchUpdate.isPending}>
            {batchUpdate.isPending ? 'Updating…' : 'Update Semua'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Batch Delete Modal ───────────────────────────────────────────────────────
function BatchDeleteModal({ selectedCount, onClose, onSuccess, productIds, products }: {
  selectedCount: number; onClose: () => void; onSuccess: () => void
  productIds: string[]; products: Product[]
}) {
  const { showToast } = useToast()
  const batchDelete = trpc.products.batchDelete.useMutation()

  const handleConfirm = async () => {
    try {
      const result = await batchDelete.mutateAsync({ productIds })
      if (result.count === 0) {
        showToast(`Tidak bisa dihapus — ${result.skippedCount} produk memiliki riwayat transaksi.`, 'error')
      } else if (result.skippedCount > 0) {
        showToast(`${result.count} dihapus. ${result.skippedCount} dilewati (ada riwayat): ${result.skippedNames?.join(', ')}`, 'success')
        onSuccess()
      } else {
        showToast(`${result.count} produk berhasil dihapus!`, 'success')
        onSuccess()
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus produk', 'error')
    }
  }

  return (
    <Modal title="Konfirmasi Hapus Batch" onClose={onClose}>
      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">Hapus {selectedCount} produk?</p>
        <p className="text-xs text-red-700 dark:text-red-400">Aksi ini tidak bisa dibatalkan!</p>
        <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
          {products.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded-lg">
              <span className="font-mono">{p.sku}</span>
              <span className="text-red-400">·</span>
              <span className="font-semibold truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} fullWidth disabled={batchDelete.isPending}>Batal</Button>
        <Button type="button" variant="danger" onClick={handleConfirm} fullWidth disabled={batchDelete.isPending}>
          {batchDelete.isPending ? 'Menghapus…' : `Hapus ${selectedCount} Produk`}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [isModalOpen,          setIsModalOpen]          = useState(false)
  const [editingProduct,       setEditingProduct]        = useState<Product | null>(null)
  const [searchTerm,           setSearchTerm]            = useState('')
  const [categoryFilter,       setCategoryFilter]        = useState('')
  const [selectedProducts,     setSelectedProducts]      = useState<Set<string>>(new Set())
  const [isBatchModalOpen,     setIsBatchModalOpen]      = useState(false)
  const [isBatchDeleteOpen,    setIsBatchDeleteOpen]     = useState(false)
  const [isBulkImportOpen,     setIsBulkImportOpen]      = useState(false)
  const { showToast } = useToast()

  const { data: productsResponse, isLoading, refetch } = trpc.products.getAll.useQuery({
    search: searchTerm || undefined, category: categoryFilter || undefined,
  })
  const { data: categories } = trpc.products.getCategories.useQuery()

  const products   = productsResponse?.products || []
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: () => refetch() })

  const handleEdit   = (p: Product) => { setEditingProduct(p); setIsModalOpen(true) }
  const handleAddNew = () => { setEditingProduct(null); setIsModalOpen(true) }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}"?`)) return
    try {
      await deleteProduct.mutateAsync({ id })
      showToast('Produk berhasil dihapus!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus produk', 'error')
    }
  }

  const toggleSelect = (id: string) => {
    const s = new Set(selectedProducts)
    if (s.has(id)) { s.delete(id) } else { s.add(id) }
    setSelectedProducts(s)
  }

  const toggleSelectAll = () =>
    setSelectedProducts(selectedProducts.size === products.length ? new Set() : new Set(products.map(p => p.id)))

  const clearSelection = () => setSelectedProducts(new Set())

  const handleBatchCategory = () => {
    if (!selectedProducts.size) { showToast('Pilih minimal satu produk', 'error'); return }
    setIsBatchModalOpen(true)
  }

  const handleBatchDelete = () => {
    if (!selectedProducts.size) { showToast('Pilih minimal satu produk', 'error'); return }
    setIsBatchDeleteOpen(true)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Manajemen Produk" subtitle="Kelola katalog produk kamu" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <StatCard icon={<Package />} label="Total Produk"    value={products.length}                               color="gray" />
        <StatCard icon={<FolderOpen />} label="Kategori"        value={categories?.length || 0}                       color="blue" />
        <StatCard icon={<CheckCircle />} label="Ada Harga"        value={products.filter(p => p.price).length}          color="green" />
        <StatCard icon={<AlertTriangle />} label="Tanpa Harga"     value={products.filter(p => !p.price).length}         color="yellow" />
      </div>

      {/* Batch toolbar */}
      {selectedProducts.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            {selectedProducts.size} produk dipilih
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={handleBatchCategory}><Tag className="w-4 h-4 mr-1" /> Update Kategori</Button>
            <Button variant="danger" size="sm" onClick={handleBatchDelete}><Trash2 className="w-4 h-4 mr-1" /> Hapus</Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>✕ Batal</Button>
          </div>
        </div>
      )}

      {/* Filter + actions */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
        <input
          type="text"
          placeholder="Cari nama atau SKU..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
        />
        <div className="relative md:w-52">
          <select value={categoryFilter} onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          >
            <option value="">Semua Kategori</option>
            {categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
        </div>
        <Button variant="secondary" size="md" onClick={() => setIsBulkImportOpen(true)}><Download className="w-4 h-4 mr-1" /> Import Excel</Button>
        <Button variant="primary" size="md" onClick={handleAddNew}><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Daftar Produk</p>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 animate-spin" />
            <p className="text-sm text-gray-400">Memuat produk…</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState icon={<Package />} title="Tidak ada produk"
            description={searchTerm || categoryFilter ? 'Tidak ada produk yang cocok. Coba ubah filter.' : 'Mulai dengan menambahkan produk pertama kamu.'}
            action={!searchTerm && !categoryFilter ? <Button variant="primary" onClick={handleAddNew}>Tambah Produk Pertama</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  <th className="w-10 px-3 md:px-4 py-2.5">
                    <input type="checkbox" className="w-4 h-4 accent-blue-500 cursor-pointer"
                      checked={selectedProducts.size === products.length && products.length > 0}
                      onChange={toggleSelectAll} />
                  </th>
                  {['SKU', 'Nama', 'Kategori', 'Harga', 'Aksi'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map(product => (
                  <tr key={product.id}
                    className={`transition-colors ${selectedProducts.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                  >
                    <td className="px-3 md:px-4 py-3 text-center">
                      <input type="checkbox" className="w-4 h-4 accent-blue-500 cursor-pointer"
                        checked={selectedProducts.has(product.id)} onChange={() => toggleSelect(product.id)} />
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{product.sku}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</span>
                        {(product as any).item_type && (product as any).item_type !== 'PRODUCT' && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                            {(product as any).item_type === 'SERVICE' ? 'Jasa' : (product as any).item_type === 'MENU' ? 'Menu' : (product as any).item_type === 'PACKAGE' ? 'Paket' : ''}
                          </span>
                        )}
                        {(product as any).stock_behavior && (product as any).stock_behavior !== 'TRACKED' && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {(product as any).stock_behavior === 'UNTRACKED' ? '∞' : '🍳'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      {product.category ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {fmtCurrency(product.price)}
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEdit(product)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5 inline mr-0.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)}
                          disabled={deleteProduct.isPending}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5 inline mr-0.5" /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ProductFormModal product={editingProduct}
          onClose={() => { setIsModalOpen(false); setEditingProduct(null) }}
          onSuccess={() => { refetch(); setIsModalOpen(false); setEditingProduct(null) }} />
      )}
      {isBatchModalOpen && (
        <BatchUpdateCategoryModal selectedCount={selectedProducts.size} productIds={Array.from(selectedProducts)} categories={categories || []}
          onClose={() => setIsBatchModalOpen(false)}
          onSuccess={() => { refetch(); setIsBatchModalOpen(false); setSelectedProducts(new Set()) }} />
      )}
      {isBulkImportOpen && (
        <BulkImportModal onClose={() => setIsBulkImportOpen(false)}
          onSuccess={() => { refetch(); setIsBulkImportOpen(false) }} />
      )}
      {isBatchDeleteOpen && (
        <BatchDeleteModal selectedCount={selectedProducts.size} productIds={Array.from(selectedProducts)} products={products.filter(p => selectedProducts.has(p.id))}
          onClose={() => setIsBatchDeleteOpen(false)}
          onSuccess={() => { refetch(); setIsBatchDeleteOpen(false); setSelectedProducts(new Set()) }} />
      )}
    </div>
  )
}
