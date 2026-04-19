'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { PrintPreviewModal } from '@/components/print/PrintPreviewModal'
import { ReceiptData } from '@/components/print/PrintReceipt'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'
import { PaymentModal } from '@/components/payment'
import { formatCurrency, formatDateTime, generateTransactionId } from '@/lib/utils'

interface CartItem {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  total: number
}

export default function SalesTransactionPage() {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [saleDate] = useState(new Date().toISOString().split('T')[0])

  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{
    discountAmount: number
    promoName: string
    promoId: string
  } | null>(null)

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isPromoExpanded, setIsPromoExpanded] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [pendingTransactionId, setPendingTransactionId] = useState<string>('')
  const [productSearch, setProductSearch] = useState('')
  const [outletSearch, setOutletSearch] = useState('')

  // Refs for keyboard navigation
  const productSelectRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Fetch products and outlets for dropdowns
  const { data: productsResponse, isLoading: productsLoading } = trpc.products.getAll.useQuery()
  const { data: outletsResponse, isLoading: outletsLoading } = trpc.outlets.getAll.useQuery()
  const { data: userProfile } = trpc.auth.getProfile.useQuery()

  const products = productsResponse?.products || []
  const outlets = outletsResponse?.outlets || []

  // Fetch inventory with stock (filtered by selected outlet)
  const { data: inventoryList } = trpc.stock.getInventoryList.useQuery({
    outletId: selectedOutletId || undefined,
  }, {
    enabled: !!selectedOutletId, // Only fetch when outlet is selected
  })

  // Fetch real dashboard data
  const { data: recentTransactions, refetch: refetchTransactions } = trpc.dashboard.getRecentTransactions.useQuery({ limit: 5 })

  const recordSaleMutation = trpc.sales.record.useMutation()
  const createTransactionMutation = trpc.transactions.create.useMutation()
  const validatePromoMutation = trpc.promotions.validate.useMutation()
  const recordPromoUsageMutation = trpc.promotions.recordUsage.useMutation()

  const { data: planUsage, refetch: refetchPlanUsage } = trpc.transactions.getPlanUsage.useQuery(
    { outletId: selectedOutletId },
    { enabled: !!selectedOutletId }
  )

  const selectedProduct = products?.find(p => p.id === selectedProductId)
  const selectedOutlet = outlets?.find(o => o.id === selectedOutletId)

  // Get stock info for selected product
  const selectedProductStock = inventoryList?.find(p => p.id === selectedProductId)
  const availableStock = selectedProductStock?.currentStock || 0

  // Filter outlets by search query
  const filteredOutlets = outlets?.filter(o => {
    const q = outletSearch.toLowerCase()
    return o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q)
  }) || []

  // Filter products by search query
  const filteredProducts = products?.filter(p => {
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q)
      || p.sku.toLowerCase().includes(q)
      || (p.barcode && p.barcode.toLowerCase().includes(q))
  }) || []

  // Add item to cart
  const handleAddToCart = () => {
    if (!selectedProduct) {
      setError('Silakan pilih produk')
      return
    }

    if (quantity <= 0) {
      setError('Jumlah harus lebih dari 0')
      return
    }

    // Check stock availability
    if (selectedOutletId && availableStock < quantity) {
      setError(`Stok tidak cukup! Hanya ${availableStock} unit tersedia`)
      return
    }

    const unitPrice = selectedProduct.price || 0
    const total = quantity * unitPrice

    // Check if product already in cart
    const existingItemIndex = cart.findIndex(item => item.productId === selectedProduct.id)

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += quantity
      updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * unitPrice
      setCart(updatedCart)
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        quantity,
        unitPrice,
        total,
      }
      setCart([...cart, newItem])
    }

    // Reset selection and focus back to product dropdown
    setSelectedProductId('')
    setQuantity(1)
    setError('')

    // Auto-focus back to product select for quick next entry
    setTimeout(() => {
      productSelectRef.current?.focus()
    }, 100)
  }

  // Quick quantity buttons
  const handleQuickQuantity = (qty: number) => {
    setQuantity(qty)
  }

  // Barcode scan handler (for camera scanner)
  const handleBarcodeScan = (barcode: string) => {
    const trimmed = barcode.trim()
    // Search by barcode field first, then fall back to SKU
    const product = products?.find(p => p.barcode && p.barcode === trimmed)
      ?? products?.find(p => p.sku === trimmed.toUpperCase())

    if (product) {
      setSelectedProductId(product.id)
      setQuantity(1)

      // Auto-add to cart
      setTimeout(() => {
        const unitPrice = product.price || 0
        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 1,
          unitPrice,
          total: unitPrice,
        }

        // Check if product already in cart
        const existingIndex = cart.findIndex(item => item.productId === product.id)
        if (existingIndex !== -1) {
          const newCart = [...cart]
          newCart[existingIndex].quantity += 1
          newCart[existingIndex].total = newCart[existingIndex].quantity * unitPrice
          setCart(newCart)
        } else {
          setCart([...cart, newItem])
        }

        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }, 100)
    } else {
      setError(`Produk dengan barcode ${barcode} tidak ditemukan`)
      setTimeout(() => setError(''), 3000)
    }

    setIsScannerOpen(false)
  }

  // Barcode manual input handler (for USB scanner)
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value.toUpperCase())
  }

  const handleBarcodeInputSubmit = () => {
    if (barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim())
      setBarcodeInput('')
    }
  }

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    if (productId) {
      setProductSearch('')
      setTimeout(() => {
        quantityInputRef.current?.focus()
        quantityInputRef.current?.select()
      }, 100)
    }
  }

  // Remove item from cart
  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  // Update cart item quantity
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) return

    const updatedCart = cart.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.unitPrice,
        }
      }
      return item
    })
    setCart(updatedCart)
  }

  // Calculate cart totals
  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = appliedPromo?.discountAmount || 0
  const cartTotal = cartSubtotal - discountAmount // Apply discount

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F2: Focus product dropdown
      if (e.key === 'F2') {
        e.preventDefault()
        productSelectRef.current?.focus()
      }
      // F8: Complete sale (if cart has items and valid payment)
      if (e.key === 'F8') {
        e.preventDefault()
        if (cart.length > 0 && selectedOutletId) {
          handleCompleteSale()
        }
      }
      // Escape: Clear error
      if (e.key === 'Escape') {
        setError('')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cart, selectedOutletId])

  // Handle apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode) {
      setError('Please enter a promo code')
      return
    }

    try {
      const result = await validatePromoMutation.mutateAsync({
        code: promoCode,
        cartTotal: cartSubtotal,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })

      setAppliedPromo(result)
      setError('')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid promo code'
      setError(errorMessage)
      setAppliedPromo(null)
    }
  }

  // Remove promo
  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setPromoCode('')
  }

  // Complete sale - Always use PaymentModal
  const handleCompleteSale = async () => {
    setError('')
    setShowSuccess(false)

    if (cart.length === 0) {
      setError('Keranjang kosong. Silakan tambahkan item ke keranjang.')
      return
    }

    if (!selectedOutletId) {
      setError('Silakan pilih outlet')
      return
    }

    // Generate transaction ID and open PaymentModal
    const transactionId = generateTransactionId()
    setPendingTransactionId(transactionId)
    setIsPaymentModalOpen(true)
  }

  // Handle payment success from PaymentModal
  const handlePaymentSuccess = async (paymentId: string, paymentMethod: string) => {
    try {
      // Close payment modal
      setIsPaymentModalOpen(false)

      // Map payment method to backend expected values
      const mapToBackendPaymentMethod = (method: string): 'cash' | 'card' | 'transfer' | 'ewallet' => {
        const mapping: Record<string, 'cash' | 'card' | 'transfer' | 'ewallet'> = {
          'cash': 'cash',
          'qris': 'transfer',        // QRIS maps to transfer
          'bank_transfer': 'transfer',
          'debit': 'card',
          'credit': 'card',
          'ewallet': 'ewallet'
        }
        return mapping[method] || 'cash'
      }

      // Create transaction with payment ID
      const result = await createTransactionMutation.mutateAsync({
        outletId: selectedOutletId,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod: mapToBackendPaymentMethod(paymentMethod),
        amountPaid: cartTotal,
        discountAmount: discountAmount,
        notes: appliedPromo
          ? `Promo applied: ${appliedPromo.promoName} | Payment ID: ${paymentId}`
          : `Payment ID: ${paymentId}`,
      })

      // Record promotion usage if applied
      if (appliedPromo && result.transaction) {
        await recordPromoUsageMutation.mutateAsync({
          promotionId: appliedPromo.promoId,
          transactionId: result.transaction.id,
          discountApplied: discountAmount,
        })
      }

      // Generate receipt
      const now = new Date()
      const receipt: ReceiptData = {
        transactionId: result.transactionId,
        date: now.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        time: now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        cashier: getUserName(),
        outlet: {
          name: selectedOutlet?.name || 'Laku POS',
          address: selectedOutlet?.address || '',
          phone: userProfile?.whatsappNumber || '',
          email: userProfile?.email || '',
        },
        items: cart.map(item => ({
          name: item.productName,
          sku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: cartSubtotal,
        tax: 0,
        discount: discountAmount,
        total: cartTotal,
        payment: {
          method: paymentMethod,
          amount: cartTotal,
          change: 0,
        },
        notes: appliedPromo
          ? `Promo: ${appliedPromo.promoName} • Terima kasih!`
          : 'Terima kasih telah berbelanja di Laku POS',
      }

      setReceiptData(receipt)
      setIsPrintModalOpen(true)
      setShowSuccess(true)

      // Refetch transactions
      refetchTransactions()

      // Reset form
      setCart([])
      setSelectedOutletId('')
      setPromoCode('')
      setAppliedPromo(null)
      setPendingTransactionId('')
      refetchPlanUsage()

      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mencatat penjualan'
      if (message.includes('PLAN_LIMIT_REACHED')) {
        setShowUpgradeModal(true)
      } else {
        setError(message)
      }
    }
  }

  // Using centralized utility functions for formatting

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Point of Sale</h1>
        <p className="text-gray-600 dark:text-gray-400">Proses transaksi penjualan dengan keranjang multi-item</p>
      </div>

      {/* Plan usage warning banner (free plan approaching limit) */}
      {planUsage && planUsage.limit !== null && !planUsage.isAtLimit && planUsage.count >= 80 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">
              ⚠️ Hampir mencapai batas paket Gratis
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-0.5">
              {planUsage.count} dari {planUsage.limit} transaksi bulan ini terpakai. Upgrade agar tidak terhenti.
            </p>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="shrink-0 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            Upgrade Sekarang
          </button>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-600">
            ✅ Penjualan berhasil dicatat!
          </p>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Batas Transaksi Tercapai
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Paket <span className="font-semibold text-blue-600">Gratis</span> hanya mendukung{' '}
              <span className="font-semibold">100 transaksi per bulan</span>.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upgrade ke paket <span className="font-semibold text-orange-500">Warung (Rp 99rb/bulan)</span> untuk transaksi tidak terbatas.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/6287874415491?text=${encodeURIComponent('Halo, saya ingin upgrade dari paket Gratis ke paket Warung Laku POS (Rp 99rb/bulan). Mohon bantuannya.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-lg transition-colors"
              >
                💬 Upgrade via WhatsApp
              </a>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-600">
            ❌ {error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Selection + Cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Outlet Selection */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Pilih Outlet</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">🔍</span>
                  <input
                    type="text"
                    value={outletSearch}
                    onChange={(e) => setOutletSearch(e.target.value)}
                    placeholder="Cari outlet (nama atau alamat)..."
                    className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                  />
                  {outletSearch && (
                    <button
                      onClick={() => setOutletSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >✕</button>
                  )}
                </div>

                {/* Outlet table */}
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
                    <span className="col-span-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outlet</span>
                    <span className="col-span-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alamat</span>
                    <span className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Pilih</span>
                  </div>

                  {/* Outlet rows */}
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {outletsLoading ? (
                      <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Memuat outlet...</div>
                    ) : filteredOutlets.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                        {outletSearch ? `Outlet "${outletSearch}" tidak ditemukan` : 'Tidak ada outlet'}
                      </div>
                    ) : (
                      filteredOutlets.map(outlet => {
                        const isSelected = selectedOutletId === outlet.id
                        return (
                          <button
                            key={outlet.id}
                            onClick={() => {
                              setSelectedOutletId(isSelected ? '' : outlet.id)
                              setOutletSearch('')
                            }}
                            className={`w-full grid grid-cols-12 gap-2 px-3 py-2.5 text-left transition-all
                              ${isSelected
                                ? 'bg-purple-50 dark:bg-purple-900/40'
                                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer'
                              }`}
                          >
                            <div className="col-span-5 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                {outlet.name}
                              </p>
                            </div>
                            <div className="col-span-5 flex items-center min-w-0">
                              <span className={`text-xs truncate ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {outlet.address || '—'}
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">✓</span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Footer count */}
                  {filteredOutlets.length > 0 && (
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {filteredOutlets.length} outlet {outletSearch && `· hasil pencarian "${outletSearch}"`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected outlet summary */}
                {selectedOutlet && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Outlet Terpilih:</p>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">{selectedOutlet.name}</p>
                      {selectedOutlet.address && <p className="text-xs text-purple-700 dark:text-purple-300">{selectedOutlet.address}</p>}
                    </div>
                    <button onClick={() => setSelectedOutletId('')} className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 text-lg leading-none ml-3">✕</button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Add Product to Cart */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tambah Item ke Keranjang</CardTitle>
                {/* Barcode buttons compact */}
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={handleBarcodeInputChange}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleBarcodeInputSubmit() }
                      }}
                      placeholder="Scan SKU..."
                      disabled={!selectedOutletId}
                      className="w-32 px-3 py-1.5 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-purple-500 focus:outline-none uppercase"
                    />
                    <Button variant="secondary" size="sm" onClick={handleBarcodeInputSubmit} disabled={!selectedOutletId || !barcodeInput.trim()}>✓</Button>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setIsScannerOpen(true)} disabled={!selectedOutletId}>📷</Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">

                {!selectedOutletId && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 font-semibold">
                      ⚠️ Silakan pilih outlet terlebih dahulu untuk melihat stok produk
                    </p>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">🔍</span>
                  <input
                    ref={productSelectRef}
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari produk (nama atau SKU)..."
                    disabled={!selectedOutletId}
                    className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  />
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >✕</button>
                  )}
                </div>

                {/* Product Grid */}
                <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
                    <span className="col-span-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</span>
                    <span className="col-span-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harga</span>
                    <span className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Stok</span>
                    <span className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Pilih</span>
                  </div>

                  {/* Product rows */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {!selectedOutletId ? (
                      <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                        Pilih outlet untuk melihat produk
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                        {productSearch ? `Produk "${productSearch}" tidak ditemukan` : 'Tidak ada produk'}
                      </div>
                    ) : (
                      filteredProducts.map(product => {
                        const stockInfo = inventoryList?.find(p => p.id === product.id)
                        const stock = stockInfo?.currentStock ?? 0
                        const isSelected = selectedProductId === product.id
                        const isOutOfStock = stock === 0

                        return (
                          <button
                            key={product.id}
                            onClick={() => !isOutOfStock && handleProductChange(isSelected ? '' : product.id)}
                            disabled={isOutOfStock}
                            className={`w-full grid grid-cols-12 gap-2 px-3 py-2.5 text-left transition-all
                              ${isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/40'
                                : isOutOfStock
                                  ? 'opacity-40 cursor-not-allowed bg-white dark:bg-gray-800'
                                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer'
                              }`}
                          >
                            {/* Name + SKU */}
                            <div className="col-span-5 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.sku}</p>
                            </div>

                            {/* Price */}
                            <div className="col-span-3 flex items-center">
                              <span className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {formatCurrency(product.price || 0)}
                              </span>
                            </div>

                            {/* Stock badge */}
                            <div className="col-span-2 flex items-center justify-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                stock === 0
                                  ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                                  : stock <= 10
                                    ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                              }`}>
                                {stock === 0 ? 'Habis' : stock}
                              </span>
                            </div>

                            {/* Select indicator */}
                            <div className="col-span-2 flex items-center justify-center">
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">✓</span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                              )}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Footer count */}
                  {selectedOutletId && filteredProducts.length > 0 && (
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {filteredProducts.length} produk {productSearch && `· hasil pencarian "${productSearch}"`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected product summary + qty */}
                {selectedProduct && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-200 truncate">{selectedProduct.name}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          SKU: {selectedProduct.sku} · {formatCurrency(selectedProduct.price || 0)}
                          {selectedOutletId && (
                            <span className={`ml-2 font-bold ${
                              availableStock === 0 ? 'text-red-600 dark:text-red-400' :
                              availableStock <= 10 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              · Stok: {availableStock} unit
                            </span>
                          )}
                        </p>
                      </div>
                      <button onClick={() => setSelectedProductId('')} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-lg leading-none">✕</button>
                    </div>

                    {/* Qty row */}
                    <div className="flex items-center gap-2">
                      {/* Quick qty */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 5, 10].map(qty => (
                          <button
                            key={qty}
                            onClick={() => handleQuickQuantity(qty)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all border-2 ${
                              quantity === qty
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}
                          >
                            {qty}
                          </button>
                        ))}
                      </div>

                      {/* Manual qty input */}
                      <input
                        ref={quantityInputRef}
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddToCart() } }}
                        onFocus={(e) => e.target.select()}
                        className="w-16 px-2 py-1.5 text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none text-sm font-bold"
                      />

                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleAddToCart}
                        disabled={productsLoading || (!!selectedOutletId && availableStock === 0)}
                        className="flex-1"
                      >
                        ➕ Tambah ke Keranjang
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Shopping Cart */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>🛒 Keranjang Belanja</CardTitle>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-full">
                  {cart.length} item
                </span>
              </div>
            </CardHeader>
            <CardBody>
              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="font-semibold">Keranjang kosong</p>
                  <p className="text-sm">Tambahkan produk untuk memulai transaksi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{item.productName}</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">SKU: {item.productSku}</p>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                            className="min-w-[36px] sm:min-w-[40px] px-2"
                          >
                            -
                          </Button>
                          <span className="w-8 sm:w-12 text-center font-bold text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                            className="min-w-[36px] sm:min-w-[40px] px-2"
                          >
                            +
                          </Button>
                        </div>
                        <div className="min-w-[80px] sm:min-w-[120px] text-right">
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="min-w-[36px] sm:min-w-[40px] px-2"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Cart Total */}
                  <div className="p-4 bg-gray-900 rounded-xl border-2 border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Total Keranjang</p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(cartTotal)}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Payment & Summary */}
        <div className="space-y-6">
          {/* Payment Section */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Pembayaran</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Promo Code Section - Collapsible */}
                <div>
                  <button
                    onClick={() => setIsPromoExpanded(!isPromoExpanded)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                      🎫 Kode Promo (Opsional)
                    </label>
                    <span className="text-gray-400 dark:text-gray-500">
                      {isPromoExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {isPromoExpanded && !appliedPromo && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="text"
                        placeholder="Masukkan kode promo"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        fullWidth
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={!promoCode || validatePromoMutation.isPending}
                      >
                        {validatePromoMutation.isPending ? 'Memeriksa...' : 'Terapkan'}
                      </Button>
                    </div>
                  )}

                  {appliedPromo && (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl mt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-green-600 font-semibold mb-1">✓ Promo Diterapkan</p>
                          <p className="text-sm font-bold text-green-900 mb-1">{appliedPromo.promoName}</p>
                          <p className="text-sm text-green-700 font-semibold">
                            Hemat: {formatCurrency(appliedPromo.discountAmount)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemovePromo}
                          className="shrink-0"
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cart Summary */}
                {cart.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Diskon:</span>
                        <span className="font-semibold text-green-600">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                      <span className="text-gray-900 dark:text-gray-100">Total:</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCompleteSale}
                  disabled={recordSaleMutation.isPending || cart.length === 0 || !selectedOutletId}
                >
                  {recordSaleMutation.isPending ? 'Memproses...' : '💳 Lanjut ke Pembayaran'}
                </Button>

                {/* Keyboard Shortcuts Helper */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-300 font-semibold mb-2">⌨️ Shortcut Keyboard:</p>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 dark:text-gray-300">F2</kbd>
                      <span>Fokus ke pilihan produk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 dark:text-gray-300">Enter</kbd>
                      <span>Tambah ke keranjang</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 dark:text-gray-300">F8</kbd>
                      <span>Selesaikan transaksi</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Quick Stats */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle>Statistik Sesi</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Item di Keranjang</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{cart.length}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Unit</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-400">Nilai Keranjang</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-300">{formatCurrency(cartTotal)}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <CardTitle>📊 Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardBody>
          {!recentTransactions || recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Tidak ada transaksi terbaru
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{transaction.productName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {transaction.outletName} • {formatDateTime(transaction.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(transaction.revenue)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.quantity} units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Print Preview Modal */}
      {receiptData && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          receiptData={receiptData}
        />
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Payment Modal for QRIS/Bank Transfer */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setPendingTransactionId('')
        }}
        transactionId={pendingTransactionId}
        amount={cartTotal}
        customerName={selectedOutlet?.name}
        userId={getUserId()}
        onSuccess={handlePaymentSuccess}
        onError={(error) => {
          setError(error)
          setIsPaymentModalOpen(false)
        }}
      />
    </div>
  )
}

/**
 * Get current user name from session/localStorage
 */
function getUserName(): string {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        return userData.name || 'Cashier'
      } catch {
        return 'Cashier'
      }
    }
  }
  return 'Cashier'
}

/**
 * Get current user ID from session/localStorage
 */
function getUserId(): string {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        return userData.id || 'anonymous'
      } catch {
        return 'anonymous'
      }
    }
  }
  return 'anonymous'
}
