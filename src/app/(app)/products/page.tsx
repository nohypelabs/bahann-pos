'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import type { Product, InputChangeEvent, SelectChangeEvent } from '@/types'
import { useToast } from '@/components/ui/Toast'

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false)
  const { showToast } = useToast()

  const { data: productsResponse, isLoading, refetch } = trpc.products.getAll.useQuery({
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
  })

  const products = productsResponse?.products || []
  const pagination = productsResponse?.pagination

  const { data: categories } = trpc.products.getCategories.useQuery()

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteProduct.mutateAsync({ id })
        showToast('Product deleted successfully!', 'success')
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete product'
        showToast(errorMessage, 'error')
      }
    }
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleToggleSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const handleBatchUpdateCategory = () => {
    if (selectedProducts.size === 0) {
      showToast('Please select at least one product', 'error')
      return
    }
    setIsBatchModalOpen(true)
  }

  const handleClearSelection = () => {
    setSelectedProducts(new Set())
  }

  const handleBatchDelete = () => {
    if (selectedProducts.size === 0) {
      showToast('Please select at least one product', 'error')
      return
    }
    setIsBatchDeleteModalOpen(true)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">🏷️ Products Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your product catalog</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {products?.length || 0}
            </p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Categories</p>
            <p className="text-3xl font-bold text-blue-600">
              {categories?.length || 0}
            </p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">With Price</p>
            <p className="text-3xl font-bold text-green-600">
              {products?.filter((p) => p.price).length || 0}
            </p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Without Price</p>
            <p className="text-3xl font-bold text-yellow-600">
              {products?.filter((p) => !p.price).length || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Batch Action Toolbar */}
      {selectedProducts.size > 0 && (
        <Card variant="elevated" padding="lg" className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleBatchUpdateCategory}>
                🏷️ Update Category
              </Button>
              <Button variant="danger" size="sm" onClick={handleBatchDelete}>
                🗑️ Delete Selected
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                ✕ Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
          </div>

          <div className="w-full md:w-64">
            <Select
              value={categoryFilter}
              onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...(categories || []).map((cat) => ({ value: cat, label: cat })),
              ]}
              fullWidth
            />
          </div>

          <Button variant="primary" size="md" onClick={handleAddNew}>
            ➕ Add Product
          </Button>
        </div>
      </Card>

      {/* Products Table */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>

        <CardBody>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-gray-900"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading products...</p>
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Products Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || categoryFilter
                  ? 'No products match your filters. Try adjusting your search.'
                  : 'Start by adding your first product.'}
              </p>
              {!searchTerm && !categoryFilter && (
                <Button variant="primary" onClick={handleAddNew}>
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-center py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Price</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr
                      key={product.id}
                      className={`
                        border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors
                        ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'}
                        ${selectedProducts.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                      `}
                    >
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleToggleSelect(product.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{product.sku}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        {product.category ? (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 italic">No category</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(product.price)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="px-3 py-1 text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="px-3 py-1 text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-300 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                            disabled={deleteProduct.isPending}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Product Form Modal */}
      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setIsModalOpen(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            refetch()
            setIsModalOpen(false)
            setEditingProduct(null)
          }}
        />
      )}

      {/* Batch Update Category Modal */}
      {isBatchModalOpen && (
        <BatchUpdateCategoryModal
          selectedCount={selectedProducts.size}
          onClose={() => setIsBatchModalOpen(false)}
          onSuccess={() => {
            refetch()
            setIsBatchModalOpen(false)
            setSelectedProducts(new Set())
          }}
          productIds={Array.from(selectedProducts)}
          categories={categories || []}
        />
      )}

      {/* Batch Delete Modal */}
      {isBatchDeleteModalOpen && (
        <BatchDeleteModal
          selectedCount={selectedProducts.size}
          onClose={() => setIsBatchDeleteModalOpen(false)}
          onSuccess={() => {
            refetch()
            setIsBatchDeleteModalOpen(false)
            setSelectedProducts(new Set())
          }}
          productIds={Array.from(selectedProducts)}
          products={products.filter(p => selectedProducts.has(p.id))}
        />
      )}
    </div>
  )
}

/**
 * Product Form Modal Component
 */
interface ProductFormModalProps {
  product: Product | null
  onClose: () => void
  onSuccess: () => void
}

function ProductFormModal({ product, onClose, onSuccess }: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    category: product?.category || '',
    price: product?.price || '',
  })
  const { showToast } = useToast()

  const createProduct = trpc.products.create.useMutation()
  const updateProduct = trpc.products.update.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const data = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category || undefined,
        price: formData.price ? parseFloat(formData.price.toString()) : undefined,
      }

      if (product) {
        // Update existing product
        await updateProduct.mutateAsync({
          id: product.id,
          ...data,
        })
        showToast('Product updated successfully!', 'success')
      } else {
        // Create new product
        await createProduct.mutateAsync(data)
        showToast('Product created successfully!', 'success')
      }

      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      showToast(errorMessage, 'error')
    }
  }

  const isLoading = createProduct.isPending || updateProduct.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
            <button
              onClick={onClose}
              className="text-2xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              ✕
            </button>
          </div>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="SKU *"
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., PROD-001"
              fullWidth
              required
            />

            <Input
              label="Product Name *"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Coca Cola 330ml"
              fullWidth
              required
            />

            <Input
              label="Category"
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Beverages"
              fullWidth
            />

            <Input
              label="Price (Rp)"
              type="number"
              step="1"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g., 5000"
              fullWidth
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                fullWidth
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

/**
 * Batch Update Category Modal
 */
interface BatchUpdateCategoryModalProps {
  selectedCount: number
  onClose: () => void
  onSuccess: () => void
  productIds: string[]
  categories: string[]
}

function BatchUpdateCategoryModal({
  selectedCount,
  onClose,
  onSuccess,
  productIds,
  categories,
}: BatchUpdateCategoryModalProps) {
  const [newCategory, setNewCategory] = useState('')
  const { showToast } = useToast()

  const batchUpdate = trpc.products.batchUpdateCategory.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCategory.trim()) {
      showToast('Please enter a category', 'error')
      return
    }

    try {
      const result = await batchUpdate.mutateAsync({
        productIds,
        category: newCategory.trim(),
      })
      showToast(`✅ ${result.count} products updated successfully!`, 'success')
      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update products'
      showToast(errorMessage, 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Batch Update Category</CardTitle>
            <button
              onClick={onClose}
              className="text-2xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              ✕
            </button>
          </div>
        </CardHeader>

        <CardBody>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold">
              {selectedCount} product{selectedCount > 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              The category will be updated for all selected products
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="New Category *"
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Electronics"
                fullWidth
                required
              />
              {categories.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Existing categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:bg-blue-900/50 text-gray-700 dark:text-gray-300 hover:text-blue-900 dark:text-blue-200 rounded-md transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                fullWidth
                disabled={batchUpdate.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={batchUpdate.isPending}
              >
                {batchUpdate.isPending ? 'Updating...' : 'Update All'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

/**
 * Batch Delete Modal
 */
interface BatchDeleteModalProps {
  selectedCount: number
  onClose: () => void
  onSuccess: () => void
  productIds: string[]
  products: Product[]
}

function BatchDeleteModal({
  selectedCount,
  onClose,
  onSuccess,
  productIds,
  products,
}: BatchDeleteModalProps) {
  const { showToast } = useToast()

  const batchDelete = trpc.products.batchDelete.useMutation()

  const handleConfirm = async () => {
    try {
      const result = await batchDelete.mutateAsync({
        productIds,
      })
      if (result.count === 0) {
        showToast(
          `Cannot delete — all ${result.skippedCount} selected product(s) have transaction history and cannot be removed.`,
          'error'
        )
      } else if (result.skippedCount > 0) {
        showToast(
          `✅ ${result.count} deleted. ⚠️ ${result.skippedCount} skipped (have transaction history): ${result.skippedNames?.join(', ')}`,
          'success'
        )
        onSuccess()
      } else {
        showToast(`✅ ${result.count} product${result.count > 1 ? 's' : ''} deleted successfully!`, 'success')
        onSuccess()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete products'
      showToast(errorMessage, 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-600">⚠️ Confirm Bulk Delete</CardTitle>
            <button
              onClick={onClose}
              className="text-2xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              ✕
            </button>
          </div>
        </CardHeader>

        <CardBody>
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-900 dark:text-red-200 font-semibold mb-2">
              You are about to delete {selectedCount} product{selectedCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mb-3">
              This action cannot be undone!
            </p>

            {/* Show product list */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-2 text-xs text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded">
                  <span className="font-mono">{product.sku}</span>
                  <span>-</span>
                  <span className="font-semibold">{product.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              fullWidth
              disabled={batchDelete.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              fullWidth
              disabled={batchDelete.isPending}
            >
              {batchDelete.isPending ? 'Deleting...' : `Delete ${selectedCount} Product${selectedCount > 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
