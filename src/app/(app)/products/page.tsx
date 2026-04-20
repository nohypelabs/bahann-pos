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

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductFormModal({ product, onClose, onSuccess }: { product: Product | null; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '', barcode: product?.barcode || '',
    name: product?.name || '', category: product?.category || '',
    price: product?.price || '' as string | number,
  })
  const { showToast } = useToast()
  const createProduct = trpc.products.create.useMutation()
  const updateProduct = trpc.products.update.useMutation()
  const isPending = createProduct.isPending || updateProduct.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        sku: formData.sku, barcode: formData.barcode || undefined, name: formData.name,
        category: formData.category || undefined,
        price: formData.price ? parseFloat(formData.price.toString()) : undefined,
      }
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...data })
        showToast('Produk berhasil diperbarui!', 'success')
      } else {
        await createProduct.mutateAsync(data)
        showToast('Produk berhasil dibuat!', 'success')
      }
      onSuccess()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operasi gagal', 'error')
    }
  }

  const f = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <Modal title={product ? 'Edit Produk' : 'Tambah Produk Baru'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="SKU *" type="text" value={formData.sku} onChange={f('sku')} placeholder="PROD-001" fullWidth required />
        <Input label="Barcode" type="text" value={formData.barcode as string} onChange={f('barcode')} placeholder="8991234567890" fullWidth />
        <Input label="Nama Produk *" type="text" value={formData.name} onChange={f('name')} placeholder="Coca Cola 330ml" fullWidth required />
        <Input label="Kategori" type="text" value={formData.category} onChange={f('category')} placeholder="Minuman" fullWidth />
        <Input label="Harga (Rp)" type="number" step="1" min="0" value={formData.price as number} onChange={f('price')} placeholder="5000" fullWidth />
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
    <Modal title="⚠️ Konfirmasi Hapus Batch" onClose={onClose}>
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
      <PageHeader title="🏷️ Manajemen Produk" subtitle="Kelola katalog produk kamu" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <StatCard icon="📦" label="Total Produk"    value={products.length}                               color="gray" />
        <StatCard icon="🗂️" label="Kategori"        value={categories?.length || 0}                       color="blue" />
        <StatCard icon="✅" label="Ada Harga"        value={products.filter(p => p.price).length}          color="green" />
        <StatCard icon="⚠️" label="Tanpa Harga"     value={products.filter(p => !p.price).length}         color="yellow" />
      </div>

      {/* Batch toolbar */}
      {selectedProducts.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            {selectedProducts.size} produk dipilih
          </p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleBatchCategory}>🏷️ Update Kategori</Button>
            <Button variant="danger" size="sm" onClick={handleBatchDelete}>🗑️ Hapus</Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>✕ Batal</Button>
          </div>
        </div>
      )}

      {/* Filter + actions */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
        <input
          type="text"
          placeholder="🔍 Cari nama atau SKU…"
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
        <Button variant="secondary" size="md" onClick={() => setIsBulkImportOpen(true)}>📥 Import Excel</Button>
        <Button variant="primary" size="md" onClick={handleAddNew}>➕ Tambah</Button>
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
          <EmptyState icon="📦" title="Tidak ada produk"
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
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</span>
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
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)}
                          disabled={deleteProduct.isPending}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40">
                          🗑️ Hapus
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
