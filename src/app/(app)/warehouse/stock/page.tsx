'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'

export default function StockManagementPage() {
  const [formData, setFormData] = useState({
    productId: '',
    outletId: '',
    stockDate: new Date().toISOString().split('T')[0],
    stockAwal: 0,
    stockIn: 0,
    stockOut: 0,
    stockAkhir: 0,
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  // Fetch products and outlets for dropdowns
  const { data: productsResponse, isLoading: productsLoading } = trpc.products.getAll.useQuery()
  const { data: outletsResponse, isLoading: outletsLoading } = trpc.outlets.getAll.useQuery()

  const products = productsResponse?.products || []
  const outlets = outletsResponse?.outlets || []

  // Fetch dashboard stats for summary
  const { data: stats, refetch: refetchStats } = trpc.dashboard.getStats.useQuery({})
  const { data: lowStock } = trpc.dashboard.getLowStock.useQuery({ threshold: 10 })

  const recordStockMutation = trpc.stock.record.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowSuccess(false)

    // Validation
    if (!formData.productId) {
      setError('Please select a product')
      return
    }
    if (!formData.outletId) {
      setError('Please select an outlet')
      return
    }

    try {
      await recordStockMutation.mutateAsync(formData)
      setShowSuccess(true)

      // Refetch stats to update summary
      refetchStats()

      // Reset form (keep product and outlet selected for convenience)
      setFormData({
        ...formData,
        stockAwal: 0,
        stockIn: 0,
        stockOut: 0,
        stockAkhir: 0,
      })

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record stock'
      setError(errorMessage)
    }
  }

  const calculateStockAkhir = () => {
    const akhir = formData.stockAwal + formData.stockIn - formData.stockOut
    setFormData({ ...formData, stockAkhir: akhir })
  }

  const selectedProduct = products?.find(p => p.id === formData.productId)
  const selectedOutlet = outlets?.find(o => o.id === formData.outletId)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Stock Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Record daily stock movements and monitor inventory</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm font-semibold text-green-600">
            ✅ Stock recorded successfully!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm font-semibold text-red-600">
            ❌ {error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Input Form */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Record Stock Movement</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Select Product"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                options={[
                  { value: '', label: 'Choose a product...' },
                  ...(products?.map(product => ({
                    value: product.id,
                    label: `${product.name} (${product.sku})`,
                  })) || []),
                ]}
                fullWidth
                required
              />

              {/* Show selected product details */}
              {selectedProduct && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-xs text-blue-600 font-semibold">Selected Product:</p>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{selectedProduct.name}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    SKU: {selectedProduct.sku} • Category: {selectedProduct.category || 'N/A'}
                  </p>
                </div>
              )}

              <Select
                label="Select Outlet"
                value={formData.outletId}
                onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                options={[
                  { value: '', label: 'Choose an outlet...' },
                  ...(outlets?.map(outlet => ({
                    value: outlet.id,
                    label: outlet.address ? `${outlet.name} (${outlet.address})` : outlet.name,
                  })) || []),
                ]}
                fullWidth
                required
              />

              {/* Show selected outlet details */}
              {selectedOutlet && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl">
                  <p className="text-xs text-purple-600 font-semibold">Selected Outlet:</p>
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">{selectedOutlet.name}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-400">{selectedOutlet.address}</p>
                </div>
              )}

              <Input
                type="date"
                label="Stock Date"
                value={formData.stockDate}
                onChange={(e) => setFormData({ ...formData, stockDate: e.target.value })}
                fullWidth
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Stock Awal (Beginning)"
                  value={formData.stockAwal}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setFormData({ ...formData, stockAwal: value })
                  }}
                  fullWidth
                  required
                  min="0"
                />

                <Input
                  type="number"
                  label="Stock In (Received)"
                  value={formData.stockIn}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setFormData({ ...formData, stockIn: value })
                  }}
                  fullWidth
                  required
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Stock Out (Sold/Used)"
                  value={formData.stockOut}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setFormData({ ...formData, stockOut: value })
                  }}
                  fullWidth
                  required
                  min="0"
                />

                <Input
                  type="number"
                  label="Stock Akhir (Ending)"
                  value={formData.stockAkhir}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setFormData({ ...formData, stockAkhir: value })
                  }}
                  fullWidth
                  required
                  min="0"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={calculateStockAkhir}
                fullWidth
              >
                🧮 Auto Calculate Stock Akhir
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={recordStockMutation.isPending || productsLoading || outletsLoading}
              >
                {recordStockMutation.isPending ? 'Recording...' : '✅ Record Stock Movement'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Stock Summary */}
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Products in System</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats?.totalProducts.toLocaleString() || 0}
                </p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <p className="text-sm text-blue-600">Total Outlets</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {stats?.totalOutlets || 0}
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <p className="text-sm text-green-600">Items Sold (All Time)</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                  {stats?.totalItemsSold.toLocaleString() || 0}
                </p>
              </div>

              {(stats?.lowStockCount || 0) > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border-2 border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">⚠️ Low Stock Alert</p>
                  <p className="text-lg font-bold text-yellow-900 dark:text-yellow-200">
                    {stats?.lowStockCount} items need restocking
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Low Stock Items Detail */}
      {lowStock && lowStock.length > 0 && (
        <Card variant="default" padding="lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>⚠️ Items Requiring Attention</CardTitle>
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 text-sm font-semibold rounded-full">
                {lowStock.length} items
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Product</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Outlet</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr
                      key={`${item.productId}-${item.outletId}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:bg-red-900/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">{item.productName}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-sm">{item.productSku}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{item.outletName}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 font-bold rounded-full">
                          {item.currentStock} units
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">💡 How to use:</p>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Select a product and outlet from the dropdowns</li>
          <li>• Enter stock beginning (Stock Awal), received (Stock In), and sold (Stock Out)</li>
          <li>• Click "Auto Calculate" to automatically compute Stock Akhir</li>
          <li>• Stock Akhir = Stock Awal + Stock In - Stock Out</li>
          <li>• Low stock alert triggers when inventory falls below 10 units</li>
        </ul>
      </div>
    </div>
  )
}
