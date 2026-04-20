'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { PrintPreviewModal } from '@/components/print/PrintPreviewModal'
import { PrintReceipt, ReceiptData } from '@/components/print/PrintReceipt'
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
  const [isCartOpen, setIsCartOpen] = useState(false)

  const productSelectRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const handleDirectPrint = () => {
    if (!receiptData) return
    const styleSheets = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('\n')
    const receiptHTML = receiptRef.current?.outerHTML ?? ''
    const printWindow = window.open('', '_blank', 'width=400,height=800')
    if (!printWindow) { alert('Aktifkan popup di browser untuk fitur print.'); return }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Struk</title>${styleSheets}<style>@page{size:80mm auto;margin:0}body{margin:0;padding:0;background:white}</style></head><body>${receiptHTML}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }

  const { data: productsResponse, isLoading: productsLoading } = trpc.products.getAll.useQuery()
  const { data: outletsResponse, isLoading: outletsLoading } = trpc.outlets.getAll.useQuery()
  const { data: userProfile } = trpc.auth.getProfile.useQuery()

  const products = productsResponse?.products || []
  const outlets = outletsResponse?.outlets || []

  const { data: inventoryList } = trpc.stock.getInventoryList.useQuery(
    { outletId: selectedOutletId || undefined },
    { enabled: !!selectedOutletId }
  )

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
  const selectedProductStock = inventoryList?.find(p => p.id === selectedProductId)
  const availableStock = selectedProductStock?.currentStock || 0

  const filteredOutlets = outlets?.filter(o => {
    const q = outletSearch.toLowerCase()
    return o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q)
  }) || []

  const filteredProducts = products?.filter(p => {
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q)
      || p.sku.toLowerCase().includes(q)
      || (p.barcode && p.barcode.toLowerCase().includes(q))
  }) || []

  const handleAddToCart = () => {
    if (!selectedProduct) { setError('Silakan pilih produk'); return }
    if (quantity <= 0) { setError('Jumlah harus lebih dari 0'); return }
    if (selectedOutletId && availableStock < quantity) {
      setError(`Stok tidak cukup! Hanya ${availableStock} unit tersedia`)
      return
    }
    const unitPrice = selectedProduct.price || 0
    const existingItemIndex = cart.findIndex(item => item.productId === selectedProduct.id)
    if (existingItemIndex >= 0) {
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += quantity
      updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * unitPrice
      setCart(updatedCart)
    } else {
      setCart([...cart, {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      }])
    }
    setSelectedProductId('')
    setQuantity(1)
    setError('')
    setTimeout(() => productSelectRef.current?.focus(), 100)
  }

  const handleQuickQuantity = (qty: number) => setQuantity(qty)

  const handleBarcodeScan = (barcode: string) => {
    const trimmed = barcode.trim()
    const product = products?.find(p => p.barcode && p.barcode === trimmed)
      ?? products?.find(p => p.sku === trimmed.toUpperCase())
    if (product) {
      setSelectedProductId(product.id)
      setQuantity(1)
      setTimeout(() => {
        const unitPrice = product.price || 0
        const existingIndex = cart.findIndex(item => item.productId === product.id)
        if (existingIndex !== -1) {
          const newCart = [...cart]
          newCart[existingIndex].quantity += 1
          newCart[existingIndex].total = newCart[existingIndex].quantity * unitPrice
          setCart(newCart)
        } else {
          setCart([...cart, { productId: product.id, productName: product.name, productSku: product.sku, quantity: 1, unitPrice, total: unitPrice }])
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

  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value.toUpperCase())

  const handleBarcodeInputSubmit = () => {
    if (barcodeInput.trim()) { handleBarcodeScan(barcodeInput.trim()); setBarcodeInput('') }
  }

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    if (productId) {
      setProductSearch('')
      setTimeout(() => { quantityInputRef.current?.focus(); quantityInputRef.current?.select() }, 100)
    }
  }

  const handleRemoveFromCart = (productId: string) => setCart(cart.filter(item => item.productId !== productId))

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) return
    setCart(cart.map(item => item.productId === productId
      ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
      : item
    ))
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = appliedPromo?.discountAmount || 0
  const cartTotal = cartSubtotal - discountAmount
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); productSelectRef.current?.focus() }
      if (e.key === 'F8') { e.preventDefault(); if (cart.length > 0 && selectedOutletId) handleCompleteSale() }
      if (e.key === 'Escape') setError('')
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cart, selectedOutletId])

  const handleApplyPromo = async () => {
    if (!promoCode) { setError('Please enter a promo code'); return }
    try {
      const result = await validatePromoMutation.mutateAsync({
        code: promoCode,
        cartTotal: cartSubtotal,
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
      })
      setAppliedPromo(result)
      setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid promo code')
      setAppliedPromo(null)
    }
  }

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoCode('') }

  const handleCompleteSale = async () => {
    setError('')
    setShowSuccess(false)
    if (cart.length === 0) { setError('Keranjang kosong. Silakan tambahkan item ke keranjang.'); return }
    if (!selectedOutletId) { setError('Silakan pilih outlet'); return }
    const transactionId = generateTransactionId()
    setPendingTransactionId(transactionId)
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = async (paymentId: string, paymentMethod: string) => {
    try {
      setIsPaymentModalOpen(false)
      const mapToBackendPaymentMethod = (method: string): 'cash' | 'card' | 'transfer' | 'ewallet' => {
        const mapping: Record<string, 'cash' | 'card' | 'transfer' | 'ewallet'> = {
          'cash': 'cash', 'qris': 'transfer', 'bank_transfer': 'transfer',
          'debit': 'card', 'credit': 'card', 'ewallet': 'ewallet'
        }
        return mapping[method] || 'cash'
      }
      const result = await createTransactionMutation.mutateAsync({
        outletId: selectedOutletId,
        items: cart.map(item => ({
          productId: item.productId, productName: item.productName, productSku: item.productSku,
          quantity: item.quantity, unitPrice: item.unitPrice,
        })),
        paymentMethod: mapToBackendPaymentMethod(paymentMethod),
        amountPaid: cartTotal,
        discountAmount,
        notes: appliedPromo ? `Promo applied: ${appliedPromo.promoName} | Payment ID: ${paymentId}` : `Payment ID: ${paymentId}`,
      })
      if (appliedPromo && result.transaction) {
        await recordPromoUsageMutation.mutateAsync({
          promotionId: appliedPromo.promoId, transactionId: result.transaction.id, discountApplied: discountAmount,
        })
      }
      const now = new Date()
      const receipt: ReceiptData = {
        transactionId: result.transactionId,
        date: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cashier: getUserName(),
        outlet: {
          name: selectedOutlet?.name || 'Laku POS',
          address: selectedOutlet?.address || '',
          phone: userProfile?.whatsappNumber || '',
          email: userProfile?.email || '',
        },
        items: cart.map(item => ({ name: item.productName, sku: item.productSku, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total })),
        subtotal: cartSubtotal, tax: 0, discount: discountAmount, total: cartTotal,
        payment: { method: paymentMethod, amount: cartTotal, change: 0 },
        notes: appliedPromo ? `Promo: ${appliedPromo.promoName} • Terima kasih telah berbelanja di ${selectedOutlet?.name || 'Laku POS'}!` : `Terima kasih telah berbelanja di ${selectedOutlet?.name || 'Laku POS'}`,
      }
      setReceiptData(receipt)
      setIsPrintModalOpen(true)
      setShowSuccess(true)
      refetchTransactions()
      setCart([])
      setSelectedOutletId('')
      setPromoCode('')
      setAppliedPromo(null)
      setPendingTransactionId('')
      refetchPlanUsage()
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mencatat penjualan'
      if (message.includes('PLAN_LIMIT_REACHED')) setShowUpgradeModal(true)
      else setError(message)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 gap-2">
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">Point of Sale</h1>
          {selectedOutlet && (
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium truncate">{selectedOutlet.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {planUsage && planUsage.limit !== null && !planUsage.isAtLimit && planUsage.count >= 80 && (
            <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:block text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-1 rounded-lg font-semibold border border-yellow-200">
              ⚠️ {planUsage.count}/{planUsage.limit}
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            🛒
            <span className="hidden sm:inline">Keranjang</span>
            {cartItemCount > 0 && (
              <>
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{cartItemCount}</span>
                <span className="hidden md:inline text-blue-200 text-xs font-normal">{formatCurrency(cartTotal)}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile error/success banner ── */}
      {(error || showSuccess) && (
        <div className={`px-3 py-2 text-xs font-semibold shrink-0 ${error ? 'bg-red-50 dark:bg-red-900/30 text-red-700 border-b border-red-200' : 'bg-green-50 dark:bg-green-900/30 text-green-700 border-b border-green-200'}`}>
          {error ? `❌ ${error}` : '✅ Transaksi berhasil!'}
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden gap-3 p-3">

        {/* Left: Outlet picker + Product picker */}
        <div className="flex flex-col gap-3 flex-1 overflow-hidden min-w-0">

          {/* Outlet — compact pill once selected */}
          {!selectedOutlet ? (
            <div className="shrink-0 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pilih Outlet</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input type="text" value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)} placeholder="Cari outlet..." className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-28 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {outletsLoading ? (
                  <div className="py-4 text-center text-sm text-gray-400">Memuat...</div>
                ) : filteredOutlets.map(outlet => (
                  <button key={outlet.id} onClick={() => { setSelectedOutletId(outlet.id); setOutletSearch('') }} className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-left transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{outlet.name}</p>
                      {outlet.address && <p className="text-xs text-gray-500 dark:text-gray-400">{outlet.address}</p>}
                    </div>
                    <span className="text-gray-300 text-sm ml-2">›</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl shrink-0">
              <span className="text-purple-500">🏪</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-semibold text-purple-900 dark:text-purple-200 truncate">{selectedOutlet.name}</p>
                {selectedOutlet.address && <p className="text-xs text-purple-600 dark:text-purple-400 truncate">{selectedOutlet.address}</p>}
              </div>
              <button onClick={() => setSelectedOutletId('')} className="text-purple-400 hover:text-purple-600 text-xs md:text-lg leading-none shrink-0">✕</button>
            </div>
          )}

          {/* Product Picker — fills remaining height */}
          <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0 gap-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs md:text-sm shrink-0">Produk</p>
              <div className="flex gap-1 items-center">
                <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={handleBarcodeInputChange} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeInputSubmit() } }} placeholder="Scan SKU..." disabled={!selectedOutletId} className="hidden md:block w-28 px-2 py-1.5 text-xs border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none uppercase disabled:opacity-50" />
                <Button variant="secondary" size="sm" onClick={handleBarcodeInputSubmit} disabled={!selectedOutletId || !barcodeInput.trim()} className="hidden md:flex">✓</Button>
                <Button variant="secondary" size="sm" onClick={() => setIsScannerOpen(true)} disabled={!selectedOutletId}>📷 <span className="hidden sm:inline ml-1">Scan</span></Button>
              </div>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden p-3 gap-2">
              {!selectedOutletId && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg shrink-0">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 font-semibold">⚠️ Pilih outlet terlebih dahulu</p>
                </div>
              )}

              {/* Search */}
              <div className="relative shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input ref={productSelectRef} type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Cari produk (nama atau SKU)..." disabled={!selectedOutletId} className="w-full pl-9 pr-8 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none disabled:opacity-50" />
                {productSearch && <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
              </div>

              {/* Product table */}
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600 shrink-0">
                  <span className="col-span-5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</span>
                  <span className="col-span-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harga</span>
                  <span className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Stok</span>
                  <span className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Pilih</span>
                </div>
                {/* Mobile header */}
                <div className="md:hidden grid grid-cols-12 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600 shrink-0">
                  <span className="col-span-7 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produk</span>
                  <span className="col-span-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Harga</span>
                  <span className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Stok</span>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
                  {!selectedOutletId ? (
                    <div className="py-4 md:py-8 text-center text-sm text-gray-400 dark:text-gray-500">Pilih outlet untuk melihat produk</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-4 md:py-8 text-center text-sm text-gray-400 dark:text-gray-500">{productSearch ? `"${productSearch}" tidak ditemukan` : 'Tidak ada produk'}</div>
                  ) : filteredProducts.map(product => {
                    const stock = inventoryList?.find(p => p.id === product.id)?.currentStock ?? 0
                    const isSelected = selectedProductId === product.id
                    const isOutOfStock = stock === 0
                    return (
                      <button key={product.id} onClick={() => !isOutOfStock && handleProductChange(isSelected ? '' : product.id)} disabled={isOutOfStock}
                        className={`w-full text-left transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/40' : isOutOfStock ? 'opacity-40 cursor-not-allowed bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 active:bg-gray-100'}`}>
                        {/* Desktop row */}
                        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2.5">
                          <div className="col-span-5 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>{product.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.sku}</p>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(product.price || 0)}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stock === 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' : stock <= 10 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'}`}>{stock === 0 ? 'Habis' : stock}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            {isSelected ? <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">✓</span> : <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                          </div>
                        </div>
                        {/* Mobile row — bigger touch target, 3 cols */}
                        <div className="md:hidden grid grid-cols-12 px-3 py-3">
                          <div className="col-span-7 min-w-0 flex flex-col justify-center">
                            <p className={`text-sm font-semibold truncate leading-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>{product.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.sku}</p>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(product.price || 0)}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            {isSelected
                              ? <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">✓</span>
                              : <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${stock === 0 ? 'bg-red-100 text-red-700' : stock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{stock === 0 ? '✕' : stock}</span>
                            }
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {selectedOutletId && filteredProducts.length > 0 && (
                  <div className="px-3 py-1 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">{filteredProducts.length} produk{productSearch && ` · "${productSearch}"`}</p>
                  </div>
                )}
              </div>

              {/* Qty + Add */}
              {selectedProduct && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl shrink-0">
                  {/* Product info row */}
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <p className="text-xs md:text-sm font-bold text-blue-900 dark:text-blue-200 truncate flex-1">{selectedProduct.name}</p>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">{formatCurrency(selectedProduct.price || 0)}</span>
                    {selectedOutletId && (
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${availableStock === 0 ? 'bg-red-100 text-red-700' : availableStock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {availableStock === 0 ? 'Habis' : `Stok: ${availableStock}`}
                      </span>
                    )}
                  </div>
                  {/* Quick qty + input row */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex gap-1 flex-wrap">
                      {[1, 2, 3, 5, 10].map(q => (
                        <button key={q} onClick={() => handleQuickQuantity(q)} className={`w-8 h-8 text-xs font-bold rounded-lg border transition-colors ${quantity === q ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-300'}`}>{q}</button>
                      ))}
                    </div>
                    <input ref={quantityInputRef} type="number" min="1" max={availableStock || 999} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddToCart() } }} onFocus={(e) => e.target.select()} className="w-14 px-2 py-1.5 text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none text-sm font-bold shrink-0" />
                  </div>
                  {/* Add button — full width */}
                  <Button variant="primary" size="md" fullWidth onClick={handleAddToCart} disabled={productsLoading || (!!selectedOutletId && availableStock === 0)}>
                    ➕ Tambah ke Keranjang
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Payment + Recent Transactions + Receipt — hidden on mobile (handled by sticky bar + cart drawer) */}
        <div className="hidden md:flex flex-col gap-3 w-72 shrink-0 overflow-hidden">

          {/* Payment card */}
          <div className="shrink-0 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
            {/* Promo */}
            <div>
              <button onClick={() => setIsPromoExpanded(!isPromoExpanded)} className="flex items-center justify-between w-full text-left">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">🎫 Kode Promo</span>
                <span className="text-gray-400 text-xs">{isPromoExpanded ? '▲' : '▼'}</span>
              </button>
              {isPromoExpanded && !appliedPromo && (
                <div className="flex gap-2 mt-2">
                  <Input type="text" placeholder="Kode promo" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} fullWidth />
                  <Button variant="outline" size="sm" onClick={handleApplyPromo} disabled={!promoCode || validatePromoMutation.isPending}>{validatePromoMutation.isPending ? '...' : 'Pakai'}</Button>
                </div>
              )}
              {appliedPromo && (
                <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold">{appliedPromo.promoName}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Hemat {formatCurrency(appliedPromo.discountAmount)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRemovePromo}>✕</Button>
                </div>
              )}
            </div>

            {/* Summary */}
            {cart.length > 0 && (
              <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Diskon</span>
                    <span className="font-semibold text-green-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1.5 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            )}

            <Button variant="primary" size="lg" fullWidth onClick={handleCompleteSale} disabled={recordSaleMutation.isPending || cart.length === 0 || !selectedOutletId}>
              {recordSaleMutation.isPending ? 'Memproses...' : cart.length === 0 ? '🛒 Keranjang kosong' : `💳 Bayar ${formatCurrency(cartTotal)}`}
            </Button>

            <div className="flex gap-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">F2</kbd> produk</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">Enter</kbd> tambah</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">F8</kbd> bayar</span>
            </div>
          </div>

          {/* Bottom: Recent Transactions, then Receipt below */}
          <div className="flex flex-col flex-1 overflow-hidden min-h-0 gap-2">

            {/* Recent Transactions */}
            <div className="flex flex-col flex-1 overflow-hidden min-w-0 min-h-0">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 shrink-0">Transaksi Terbaru</p>
              <div className="overflow-y-auto flex-1 space-y-1.5">
                {!recentTransactions || recentTransactions.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Belum ada transaksi</p>
                ) : recentTransactions.map((t) => (
                  <div key={t.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{t.productName}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 shrink-0">{formatCurrency(t.revenue)}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.outletName} · {t.quantity}x</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt panel — appears below recent transactions after a sale */}
            {receiptData && (
              <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Struk Terakhir</p>
                  <div className="flex gap-1">
                    <button
                      onClick={handleDirectPrint}
                      className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      🖨️ Print
                    </button>
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                      title="Preview struk"
                    >
                      👁
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 space-y-1 text-xs">
                  {receiptData.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{item.name} ×{item.quantity}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-semibold shrink-0">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t border-dashed border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-gray-100">Total</span>
                    <span className="text-blue-600">{formatCurrency(receiptData.total)}</span>
                  </div>
                </div>
                {/* Hidden full receipt for printing */}
                <div className="hidden">
                  <PrintReceipt ref={receiptRef} data={receiptData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Bottom Bar ── */}
      <div className="md:hidden shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 flex items-center gap-3">
        {receiptData && cart.length === 0 ? (
          /* Post-payment: show print/preview actions */
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transaksi berhasil</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400 leading-tight">{formatCurrency(receiptData.total)}</p>
            </div>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-colors shrink-0"
            >
              👁 Preview
            </button>
            <button
              onClick={handleDirectPrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shrink-0"
            >
              🖨️ Print
            </button>
          </>
        ) : cart.length > 0 ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">{cartItemCount} item{discountAmount > 0 && <span className="text-green-600 ml-1">· Diskon -{formatCurrency(discountAmount)}</span>}</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400 leading-tight">{formatCurrency(cartTotal)}</p>
            </div>
            <button
              onClick={handleCompleteSale}
              disabled={recordSaleMutation.isPending || !selectedOutletId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white rounded-xl font-bold text-sm transition-colors shrink-0"
            >
              {!selectedOutletId ? 'Pilih outlet' : recordSaleMutation.isPending ? 'Proses...' : '💳 Bayar'}
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center w-full py-0.5">Pilih produk untuk memulai transaksi</p>
        )}
      </div>

      {/* ── Cart Drawer ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-96 bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">🛒 Keranjang</h2>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50">Kosongkan</button>
                )}
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-gray-400 dark:text-gray-500">
                  <div className="text-base md:text-4xl mb-2">🛒</div>
                  <p className="text-sm font-semibold">Keranjang kosong</p>
                  <p className="text-xs">Pilih produk untuk menambah item</p>
                </div>
              ) : cart.map((item) => (
                <div key={item.productId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.productSku} · {formatCurrency(item.unitPrice)}/unit</p>
                    </div>
                    <button onClick={() => handleRemoveFromCart(item.productId)} className="ml-2 text-gray-400 hover:text-red-500 text-sm shrink-0">🗑️</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 font-bold text-sm">-</button>
                      <span className="w-8 text-center font-bold text-sm text-gray-900 dark:text-gray-100">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 font-bold text-sm">+</button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2 shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{cartItemCount} item</span>
                  {discountAmount > 0 && <span className="text-sm text-green-600 font-semibold">Diskon -{formatCurrency(discountAmount)}</span>}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-sm md:text-xl font-bold text-blue-600">{formatCurrency(cartTotal)}</span>
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={() => { setIsCartOpen(false); handleCompleteSale() }} disabled={recordSaleMutation.isPending || !selectedOutletId}>
                  {!selectedOutletId ? 'Pilih outlet dulu' : recordSaleMutation.isPending ? 'Memproses...' : `💳 Bayar ${formatCurrency(cartTotal)}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 md:p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-xs md:text-lg md:text-3xl">🚫</span></div>
            <h2 className="text-base md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Batas Transaksi Tercapai</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Paket <span className="font-semibold text-blue-600">Gratis</span> hanya mendukung <span className="font-semibold">100 transaksi per bulan</span>.</p>
            <p className="text-gray-600 dark:text-gray-400 mb-3 md:mb-6">Upgrade ke paket <span className="font-semibold text-orange-500">Warung (Rp 99rb/bulan)</span> untuk transaksi tidak terbatas.</p>
            <div className="flex flex-col gap-3">
              <a href={`https://wa.me/6287874415491?text=${encodeURIComponent('Halo, saya ingin upgrade dari paket Gratis ke paket Warung Laku POS (Rp 99rb/bulan). Mohon bantuannya.')}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-xs md:text-lg transition-colors">💬 Upgrade via WhatsApp</a>
              <button onClick={() => setShowUpgradeModal(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {receiptData && <PrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} receiptData={receiptData} />}
      {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setPendingTransactionId('') }}
        transactionId={pendingTransactionId}
        amount={cartTotal}
        customerName={selectedOutlet?.name}
        userId={getUserId()}
        onSuccess={handlePaymentSuccess}
        onError={(error) => { setError(error); setIsPaymentModalOpen(false) }}
      />
    </div>
  )
}

function getUserName(): string {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user')
    if (user) {
      try { return JSON.parse(user).name || 'Cashier' } catch { return 'Cashier' }
    }
  }
  return 'Cashier'
}

function getUserId(): string {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user')
    if (user) {
      try { return JSON.parse(user).id || 'anonymous' } catch { return 'anonymous' }
    }
  }
  return 'anonymous'
}
