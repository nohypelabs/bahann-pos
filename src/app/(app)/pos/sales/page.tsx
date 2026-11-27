'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { PrintPreviewModal } from '@/components/print/PrintPreviewModal'
import { PrintReceipt, ReceiptData } from '@/components/print/PrintReceipt'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'
import { PaymentModal } from '@/components/payment'
import type { PaidTransaction } from '@/components/payment/PaymentModal'
import { printHtmlDocument } from '@/lib/print/printHtmlDocument'
import { formatCurrency, generateTransactionId } from '@/lib/utils'
import { offlineDb } from '@/lib/offline/database'
import { useOffline } from '@/hooks/useOffline'
import { AlertTriangle, BadgePercent, Ban, Check, CloudOff, CreditCard, Eye, LayoutGrid, List, MessageCircle, Package, Pencil, Printer, RefreshCw, ScanLine, Search, ShoppingCart, Store, Sunrise, Trash2, WalletCards, X } from 'lucide-react'
import { PriceOverrideModal, type PriceChange } from '@/components/discount/PriceOverrideModal'
import { ManualDiscountModal } from '@/components/discount/ManualDiscountModal'
import type { DiscountReason, ManualDiscount } from '@/domain/sales/manualDiscount'
import { ProductListSkeleton, ProductGridSkeleton } from '@/components/ui/Skeletons'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { OpenShiftModal } from '@/components/shift/OpenShiftModal'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'
import { friendlyError } from '@/lib/errors/friendlyError'
import { SUPPORT_WHATSAPP_NUMBER } from '@/lib/contact'

/** Product cards drawn at once; the rest are reached by searching or scanning. */
const MAX_VISIBLE_PRODUCTS = 120

const getCategoryGradient = (category?: string | null) => {
  const gradients = [
    'from-emerald-500/20 to-teal-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200/50',
    'from-amber-500/20 to-orange-500/20 text-amber-800 dark:text-amber-300 border-amber-200/50',
    'from-indigo-500/20 to-blue-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-200/50',
    'from-rose-500/20 to-pink-500/20 text-rose-800 dark:text-rose-300 border-rose-200/50',
    'from-purple-500/20 to-violet-500/20 text-purple-800 dark:text-purple-300 border-purple-200/50',
  ]
  if (!category) return gradients[0]
  let hash = 0
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

interface CartItem {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  total: number
  /** The catalogue price; unitPrice is lower only with a discount reason. */
  listPrice?: number
  discountReason?: DiscountReason
  discountNote?: string | null
}

/** A line sold below its catalogue price, as the server takes it. */
const priceOverrideOf = (item: CartItem) =>
  item.discountReason && item.listPrice !== undefined && item.unitPrice < item.listPrice
    ? { unitPrice: item.unitPrice, reason: item.discountReason, note: item.discountNote ?? null }
    : undefined

type CachedInventoryItem = {
  id: string
  currentStock: number
}

export default function SalesTransactionPage() {
  const { t } = useLanguage()
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lakupos-outlet') || ''
    }
    return ''
  })
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lakupos-cart')
      if (saved) {
        try { return JSON.parse(saved) } catch { /* ignore */ }
      }
    }
    return []
  })
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
  // The line a scan or click just added, highlighted in the cart so the cashier sees what went in.
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isPromoExpanded, setIsPromoExpanded] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [pendingTransactionId, setPendingTransactionId] = useState<string>('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [outletSearch, setOutletSearch] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null)
  const [isDiscountOpen, setIsDiscountOpen] = useState(false)
  const [priceEditId, setPriceEditId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('lakupos-view-mode') as 'list' | 'grid') || 'list'
    }
    return 'list'
  })

  const productSelectRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const cartDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Persist cart to localStorage (debounced 500ms)
  useEffect(() => {
    if (cartDebounceRef.current) clearTimeout(cartDebounceRef.current)
    cartDebounceRef.current = setTimeout(() => {
      if (cart.length > 0) {
        localStorage.setItem('lakupos-cart', JSON.stringify(cart))
      } else {
        localStorage.removeItem('lakupos-cart')
      }
    }, 500)
    return () => { if (cartDebounceRef.current) clearTimeout(cartDebounceRef.current) }
  }, [cart])

  // Persist outlet selection to localStorage
  useEffect(() => {
    if (selectedOutletId) {
      localStorage.setItem('lakupos-outlet', selectedOutletId)
    } else {
      localStorage.removeItem('lakupos-outlet')
    }
  }, [selectedOutletId])

  const handleDirectPrint = async () => {
    if (!receiptData) return
    const receiptHTML = receiptRef.current?.outerHTML ?? ''

    const didPrint = await printHtmlDocument({
      title: 'Struk',
      bodyHtml: receiptHTML,
    })

    if (!didPrint) {
      alert('Gagal menyiapkan print. Coba ulangi beberapa saat lagi.')
    }
  }

  const { data: productsResponse, isLoading: productsLoading } = trpc.products.getAll.useQuery({ all: true })
  const { data: outletsResponse, isLoading: outletsLoading } = trpc.outlets.getAll.useQuery()

  // Cache products and outlets to localStorage for offline use
  useEffect(() => {
    if (productsResponse?.products) {
      try { localStorage.setItem('lakupos-products-cache', JSON.stringify(productsResponse.products)) } catch {}
    }
  }, [productsResponse])
  useEffect(() => {
    if (outletsResponse?.outlets) {
      try { localStorage.setItem('lakupos-outlets-cache', JSON.stringify(outletsResponse.outlets)) } catch {}
    }
  }, [outletsResponse])
  const { data: userProfile } = trpc.auth.getProfile.useQuery()

  const { isOnline, syncStatus, pendingTransactions } = useOffline()
  const isOffline = !isOnline

  // Products: use API data if available, otherwise fallback to cached data
  const products: NonNullable<typeof productsResponse>['products'] = productsResponse?.products || (() => {
    if (isOffline || !productsResponse) {
      try { return JSON.parse(localStorage.getItem('lakupos-products-cache') || '[]') } catch { return [] }
    }
    return []
  })()

  // Outlets: use API data if available, otherwise fallback to cached data
  const outlets: NonNullable<typeof outletsResponse>['outlets'] = outletsResponse?.outlets || (() => {
    if (isOffline || !outletsResponse) {
      try { return JSON.parse(localStorage.getItem('lakupos-outlets-cache') || '[]') } catch { return [] }
    }
    return []
  })()
  const showProductsLoading = productsLoading && products.length === 0 && !isOffline
  const showOutletsLoading = outletsLoading && outlets.length === 0 && !isOffline

  // RBAC: Lock kasir/cashier to their assigned outlet
  const isKasirLocked = userProfile?.role === 'user' || userProfile?.role === 'cashier'

  // Auto-select outlet: kasir locked to assigned outlet, admin picks if only 1
  useEffect(() => {
    if (isKasirLocked && userProfile?.outletId && !selectedOutletId) {
      setSelectedOutletId(userProfile.outletId)
    } else if (outlets.length === 1 && !selectedOutletId) {
      setSelectedOutletId(outlets[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlets, userProfile])

  const { data: inventoryList } = trpc.stock.getInventoryList.useQuery(
    { outletId: selectedOutletId || undefined },
    { enabled: !!selectedOutletId }
  )
  const [cachedInventoryList, setCachedInventoryList] = useState<CachedInventoryItem[]>([])

  useEffect(() => {
    if (!selectedOutletId) {
      setCachedInventoryList([])
      return
    }

    try {
      const cached = localStorage.getItem(`lakupos-inventory-cache:${selectedOutletId}`)
      setCachedInventoryList(cached ? JSON.parse(cached) as CachedInventoryItem[] : [])
    } catch {
      setCachedInventoryList([])
    }
  }, [selectedOutletId])

  useEffect(() => {
    if (!selectedOutletId || !inventoryList) return

    try {
      localStorage.setItem(`lakupos-inventory-cache:${selectedOutletId}`, JSON.stringify(inventoryList))
      setCachedInventoryList(inventoryList as CachedInventoryItem[])
    } catch {
      // Ignore cache write failures; live inventory still works.
    }
  }, [inventoryList, selectedOutletId])

  const { data: recentTransactions, refetch: refetchTransactions } = trpc.dashboard.getRecentTransactions.useQuery({ limit: 5 })

  const validatePromoMutation = trpc.promotions.validate.useMutation()
  const recordPromoUsageMutation = trpc.promotions.recordUsage.useMutation()

  const { data: planUsage, refetch: refetchPlanUsage } = trpc.transactions.getPlanUsage.useQuery(
    { outletId: selectedOutletId },
    { enabled: !!selectedOutletId }
  )
  const { data: activeShift, isFetched: shiftChecked } = trpc.shifts.getActive.useQuery(
    { outletId: selectedOutletId },
    { enabled: !!selectedOutletId && !isOffline }
  )

  const selectedProduct = products?.find(p => p.id === selectedProductId)
  const selectedOutlet = outlets?.find(o => o.id === selectedOutletId)
  const effectiveInventoryList = inventoryList ?? cachedInventoryList
  const selectedProductStock = effectiveInventoryList?.find(p => p.id === selectedProductId)
  const availableStock = selectedProductStock?.currentStock ?? 0

  const filteredOutlets = outlets?.filter(o => {
    const q = outletSearch.toLowerCase()
    return o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q)
  }) || []

  const filteredProducts = products?.filter(p => {
    const q = productSearch.toLowerCase()
    const matchesSearch = p.name.toLowerCase().includes(q)
      || p.sku.toLowerCase().includes(q)
      || (p.barcode && p.barcode.toLowerCase().includes(q))
    const matchesCategory = !selectedCategory || p.category === selectedCategory
    return matchesSearch && matchesCategory
  }) || []

  // A large catalogue (a workshop's ~900 parts) stays searchable and scannable in
  // full; only the cards drawn at once are capped.
  const visibleProducts = filteredProducts.slice(0, MAX_VISIBLE_PRODUCTS)
  const hiddenCount = filteredProducts.length - visibleProducts.length

  // Get unique categories from products
  const categories = [...new Set(products?.map(p => p.category).filter((c): c is string => !!c))].sort()

  const handleAddToCart = () => {
    if (!selectedProduct) { setError('Silakan pilih produk'); return }
    if (quantity <= 0) { setError('Jumlah harus lebih dari 0'); return }
    // Skip stock check for UNTRACKED items (services, standard menu)
    const isUntracked = selectedProduct.stock_behavior === 'UNTRACKED' || selectedProduct.stock_behavior === 'CONSUMED'
    if (!isUntracked && selectedOutletId && availableStock < quantity) {
      setError(`Stok tidak cukup! Hanya ${availableStock} unit tersedia`)
      return
    }
    const unitPrice = selectedProduct.price || 0
    const existingItemIndex = cart.findIndex(item => item.productId === selectedProduct.id)
    if (existingItemIndex >= 0) {
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += quantity
      updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * updatedCart[existingItemIndex].unitPrice
      setCart(updatedCart)
    } else {
      setCart([...cart, {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        listPrice: unitPrice,
      }])
    }
    setLastAddedId(selectedProduct.id)
    setSelectedProductId('')
    setQuantity(1)
    setError('')
    setTimeout(() => productSelectRef.current?.focus(), 100)
  }

  const handleQuickQuantity = (qty: number) => setQuantity(qty)

  const findByCode = (code: string) => {
    const trimmed = code.trim()
    return products?.find(p => p.barcode && p.barcode === trimmed)
      ?? products?.find(p => p.sku === trimmed.toUpperCase())
  }

  const handleBarcodeScan = (barcode: string) => {
    setIsScannerOpen(false)
    const product = findByCode(barcode)
    if (!product) {
      setError(`Produk dengan barcode ${barcode.trim()} tidak ditemukan`)
      setTimeout(() => setError(''), 3000)
      return
    }
    const inCart = cart.find(item => item.productId === product.id)?.quantity ?? 0
    const isUntracked = product.stock_behavior === 'UNTRACKED' || product.stock_behavior === 'CONSUMED'
    const stock = effectiveInventoryList?.find(p => p.id === product.id)?.currentStock
    if (!isUntracked && selectedOutletId && stock !== undefined && stock < inCart + 1) {
      setError(`Stok ${product.name} tidak cukup! Hanya ${stock} unit tersedia`)
      setTimeout(() => setError(''), 3000)
      return
    }
    const unitPrice = product.price || 0
    setCart(current => current.some(item => item.productId === product.id)
      ? current.map(item => item.productId === product.id
        ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
        : item)
      : [...current, { productId: product.id, productName: product.name, productSku: product.sku, quantity: 1, unitPrice, total: unitPrice, listPrice: unitPrice }])
    setLastAddedId(product.id)
    setError('')
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  // A scan with no text field focused (the USB scanner types like a keyboard).
  useBarcodeWedge(handleBarcodeScan, !!selectedOutletId && !isPaymentModalOpen && !isShiftModalOpen)

  /** Enter in the product search: a scanned or typed barcode/SKU goes straight into the cart. */
  const handleSearchEnter = () => {
    const code = productSearch.trim()
    if (!code) return
    if (findByCode(code)) { handleBarcodeScan(code); setProductSearch('') }
    else if (/^\d{8,}$/.test(code)) { handleBarcodeScan(code); setProductSearch('') }
  }

  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value.toUpperCase())

  const handleBarcodeInputSubmit = () => {
    if (barcodeInput.trim()) { handleBarcodeScan(barcodeInput.trim()); setBarcodeInput('') }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const scanParam = params.get('scan')
    if (scanParam && products && products.length > 0) {
      handleBarcodeScan(scanParam)
      window.history.replaceState({}, '', '/pos/sales')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

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

  const handleChangePrice = (productId: string, change: PriceChange) => {
    setCart(cart.map(item => item.productId === productId
      ? {
          ...item,
          unitPrice: change.unitPrice,
          total: item.quantity * change.unitPrice,
          discountReason: change.justification?.reason,
          discountNote: change.justification?.note ?? null,
        }
      : item
    ))
    setPriceEditId(null)
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0)
  // Promo discount; the cashier's manual discount comes on top of it.
  const discountAmount = appliedPromo?.discountAmount || 0
  const manualCut = manualDiscount?.amount ?? 0
  const totalDiscount = discountAmount + manualCut
  const cartTotal = cartSubtotal - totalDiscount
  const discountProblem = manualCut > 0 && manualCut > cartSubtotal - discountAmount
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  // No open shift: the checkout buttons open the shift form instead of staying disabled.
  const needsShift = !!selectedOutletId && !isOffline && shiftChecked && !activeShift
  const checkoutDisabled = !needsShift && (isPaymentModalOpen || cart.length === 0 || !selectedOutletId || (!isOffline && !activeShift) || discountProblem)
  const checkoutLabel = !selectedOutletId
    ? 'Pilih outlet'
    : (!isOffline && !activeShift)
      ? t('shift.open.button')
      : isPaymentModalOpen
        ? 'Memproses...'
        : cart.length === 0
          ? 'Keranjang kosong'
          : `Bayar ${formatCurrency(cartTotal)}`
  const surfaceClass = 'glass-surface rounded-xl border border-neutral-200 bg-white shadow-[0_1px_0_rgba(28,25,23,0.04)]'
  const chipClass = 'inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-600'

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); productSelectRef.current?.focus() }
      if (e.key === 'F8') { e.preventDefault(); if (!checkoutDisabled) handleCompleteSale() }
      if (e.key === 'Escape') setError('')
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutDisabled])

  const handleApplyPromo = async () => {
    if (!promoCode) { setError('Masukkan kode promo'); return }
    try {
      const result = await validatePromoMutation.mutateAsync({
        code: promoCode,
        cartTotal: cartSubtotal,
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
      })
      setAppliedPromo(result)
      setError('')
    } catch (err: unknown) {
      setError(friendlyError(err, 'Kode promo tidak valid'))
      setAppliedPromo(null)
    }
  }

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoCode('') }

  const handleCompleteSale = async () => {
    setError('')
    setShowSuccess(false)
    if (needsShift) { setIsShiftModalOpen(true); return }
    if (cart.length === 0) { setError('Keranjang kosong. Silakan tambahkan item ke keranjang.'); return }
    if (!selectedOutletId) { setError('Silakan pilih outlet'); return }
    if (!isOffline && !activeShift) { setError('Shift kasir belum aktif. Buka shift sebelum checkout.'); return }
    const transactionId = generateTransactionId()
    setPendingTransactionId(transactionId)
    if (isOffline) {
      await handlePaymentSuccess('offline-cash', 'cash', { id: transactionId, number: transactionId, amountPaid: cartTotal, change: 0 })
      return
    }
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = async (
    paymentId: string,
    paymentMethod: string,
    transaction?: PaidTransaction,
  ) => {
    try {
      setIsPaymentModalOpen(false)
      const mapToBackendPaymentMethod = (method: string): 'cash' | 'card' | 'transfer' | 'ewallet' => {
        const mapping: Record<string, 'cash' | 'card' | 'transfer' | 'ewallet'> = {
          'cash': 'cash', 'qris': 'transfer', 'bank_transfer': 'transfer',
          'debit': 'card', 'credit': 'card', 'ewallet': 'ewallet'
        }
        return mapping[method] || 'cash'
      }

      const stableTransactionId = transaction?.number || pendingTransactionId || generateTransactionId()

      const transactionPayload = {
        transactionId: stableTransactionId,
        outletId: selectedOutletId,
        items: cart.map(item => ({
          productId: item.productId, productName: item.productName, productSku: item.productSku,
          quantity: item.quantity, unitPrice: item.unitPrice, priceOverride: priceOverrideOf(item),
        })),
        paymentMethod: mapToBackendPaymentMethod(paymentMethod),
        amountPaid: cartTotal,
        discountAmount,
        notes: appliedPromo ? `Promo applied: ${appliedPromo.promoName} | Payment ID: ${paymentId}` : `Payment ID: ${paymentId}`,
      }

      let result: { transactionId: string; transaction: { id: string } }

      if (isOffline) {
        await offlineDb.transactions.add({
          transactionId: stableTransactionId,
          outletId: selectedOutletId,
          userId: getUserId(),
          shiftId: activeShift?.id,
          items: cart.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            ...(priceOverrideOf(item) ? { listPrice: item.listPrice, discountReason: item.discountReason, discountNote: item.discountNote ?? null } : {}),
          })),
          subtotal: cartSubtotal,
          discount: totalDiscount,
          manualDiscount,
          total: cartTotal,
          paymentMethod: transactionPayload.paymentMethod,
          amountPaid: cartTotal,
          change: 0,
          notes: transactionPayload.notes,
          promotionId: appliedPromo?.promoId,
          promotionName: appliedPromo?.promoName,
          timestamp: Date.now(),
          synced: 0,
          syncAttempts: 0,
        })

        window.dispatchEvent(new CustomEvent('offline-queue-updated'))
        result = { transactionId: stableTransactionId, transaction: { id: stableTransactionId } }
      } else {
        result = {
          transactionId: stableTransactionId,
          transaction: { id: transaction?.id ?? stableTransactionId },
        }
        if (appliedPromo && transaction?.id) {
          await recordPromoUsageMutation.mutateAsync({
            promotionId: appliedPromo.promoId, transactionId: transaction.id, discountApplied: discountAmount,
          })
        }
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
        items: cart.map(item => ({ name: item.productName, sku: item.productSku, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total, listPrice: item.listPrice })),
        subtotal: cartSubtotal, tax: 0, discount: totalDiscount, total: cartTotal,
        payment: { method: paymentMethod, amount: transaction?.amountPaid ?? cartTotal, change: transaction?.change ?? 0 },
        notes: appliedPromo ? `Promo: ${appliedPromo.promoName} • Terima kasih telah berbelanja di ${selectedOutlet?.name || 'Laku POS'}!` : `Terima kasih telah berbelanja di ${selectedOutlet?.name || 'Laku POS'}`,
      }
      setReceiptData(receipt)
      setIsPrintModalOpen(true)
      setShowSuccess(true)
      refetchTransactions()
      setCart([])
      setPromoCode('')
      setAppliedPromo(null)
      setManualDiscount(null)
      setPendingTransactionId('')
      refetchPlanUsage()
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: unknown) {
      const message = friendlyError(err, 'Gagal mencatat penjualan')
      if (message.includes('PLAN_LIMIT_REACHED')) setShowUpgradeModal(true)
      else setError(message)
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/70 bg-white/25 shadow-[0_20px_45px_-35px_rgba(28,25,23,0.45)] md:h-[calc(100vh-4rem)] md:overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="glass-bar shrink-0 rounded-t-xl border-b border-white/70 bg-white px-4 py-3 md:rounded-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Kasir Aktif</p>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="text-base font-semibold leading-tight text-neutral-950 md:text-lg">Point of Sale</h1>
              <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${isOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isOffline ? 'Offline Queue' : 'Online'}
              </span>
            </div>
            <p className="mt-1 hidden text-xs text-neutral-500 md:block">
              Cari barang, scan SKU, lalu checkout dengan alur yang tetap cepat saat toko sedang ramai.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedOutlet ? (
                <span className={`${chipClass} max-md:hidden`}>
                  <Store className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="truncate">{selectedOutlet.name}</span>
                </span>
              ) : (
                <span className={`${chipClass} max-md:hidden`}>Pilih outlet untuk mulai transaksi</span>
              )}
              {pendingTransactions > 0 && (
                <span className={chipClass}>
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                  {pendingTransactions} pending sync
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {planUsage && planUsage.limit !== null && !planUsage.isAtLimit && planUsage.count >= 80 && (
              <button onClick={() => setShowUpgradeModal(true)} className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:block">
                <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />{planUsage.count}/{planUsage.limit}
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={t('pos.sales.cart')}
              className="relative inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Checkout</span>
              {cartItemCount > 0 && (
                <>
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {cartItemCount}
                  </span>
                  <span className="hidden text-xs font-normal text-neutral-300 md:inline">
                    {formatCurrency(cartTotal)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile error/success banner ── */}
      {isOffline && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
          <CloudOff className="h-3.5 w-3.5" />
          Mode offline aktif. Transaksi aman dan akan dikirim saat koneksi kembali.
        </div>
      )}
      {!isOffline && syncStatus === 'syncing' && pendingTransactions > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-800">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Menyinkronkan {pendingTransactions} transaksi offline...
        </div>
      )}
      {(error || showSuccess) && (
        <div className={`shrink-0 px-4 py-2 text-xs font-semibold ${error ? 'border-b border-red-200 bg-red-50 text-red-700' : 'border-b border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ? error : 'Transaksi berhasil dicatat.'}
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col gap-4 p-3 md:flex-row md:overflow-hidden md:p-4">

        {/* Left: Outlet picker + Product picker */}
        <div className="flex flex-col gap-3 flex-1 min-w-0 md:overflow-hidden">

          {needsShift && (
            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 md:px-4 md:py-3">
              <Sunrise className="h-5 w-5 shrink-0 text-amber-700" />
              <p className="flex-1 text-xs font-medium text-amber-900 md:text-sm">{t('shift.banner')}</p>
              <Button size="sm" onClick={() => setIsShiftModalOpen(true)}>{t('shift.open.button')}</Button>
            </div>
          )}

          {/* Outlet — compact pill once selected */}
          {isKasirLocked && selectedOutlet ? (
            // Kasir locked: show outlet as read-only pill (no change button)
            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center justify-center text-emerald-700">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-950 truncate md:text-sm">{selectedOutlet.name}</p>
                {selectedOutlet.address && <p className="text-xs text-emerald-700 truncate">{selectedOutlet.address}</p>}
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-800">Terkunci</span>
            </div>
          ) : !selectedOutlet ? (
            <div className={`${surfaceClass} shrink-0 p-3.5 space-y-3`}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Mulai Transaksi</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">Pilih outlet yang sedang melayani</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input type="text" value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)} placeholder="Cari outlet..." className="w-full rounded-lg border border-neutral-200 bg-[#F8F9F9] py-3 pl-10 pr-4 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="max-h-32 overflow-y-auto divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-[#F8F9F9]">
                {showOutletsLoading ? (
                  <div className="py-4 text-center text-sm text-neutral-400">Memuat...</div>
                ) : filteredOutlets.map(outlet => (
                  <button key={outlet.id} onClick={() => { setSelectedOutletId(outlet.id); setOutletSearch('') }} className="w-full flex items-center justify-between px-3 py-3 hover:bg-emerald-50 text-left transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{outlet.name}</p>
                      {outlet.address && <p className="text-xs text-neutral-500">{outlet.address}</p>}
                    </div>
                    <span className="text-neutral-300 text-sm ml-2">›</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center justify-center text-emerald-700">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-950 truncate md:text-sm">{selectedOutlet.name}</p>
                {selectedOutlet.address && <p className="text-xs text-emerald-700 truncate">{selectedOutlet.address}</p>}
              </div>
              <button onClick={() => setSelectedOutletId('')} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100">Ganti</button>
            </div>
          )}

          {/* Product Picker — fills remaining height */}
          <div className={`${surfaceClass} flex flex-col overflow-hidden md:flex-1 md:min-h-0`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0 gap-2">
              <div>
                <p className="font-semibold text-neutral-900 text-sm shrink-0">Cari & pilih produk</p>
                <p className="mt-1 text-xs text-neutral-500">{selectedOutletId ? `${filteredProducts.length} item siap dijual` : 'Pilih outlet sebelum mencari barang'}</p>
              </div>
              <div className="flex gap-1 items-center">
                <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={handleBarcodeInputChange} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeInputSubmit() } }} placeholder="Scan SKU..." disabled={!selectedOutletId} className="hidden md:block w-32 rounded-lg border border-neutral-200 bg-[#F8F9F9] px-3 py-2 text-xs uppercase text-neutral-900 focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
                <Button variant="secondary" size="sm" onClick={handleBarcodeInputSubmit} disabled={!selectedOutletId || !barcodeInput.trim()} className="hidden md:flex !rounded-lg !border-neutral-200 !bg-[#F8F9F9] !text-neutral-700 hover:!bg-white">OK</Button>
                <Button variant="secondary" size="sm" onClick={() => setIsScannerOpen(true)} disabled={!selectedOutletId} className="!rounded-lg !border-neutral-200 !bg-[#F8F9F9] !text-neutral-700 hover:!bg-white">
                  <ScanLine className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Scan</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden p-3 gap-2">
              {!selectedOutletId && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg shrink-0">
                  <p className="flex items-center gap-1.5 text-xs text-yellow-800 dark:text-yellow-300 font-semibold"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Pilih outlet terlebih dahulu</p>
                </div>
              )}

              {/* Search + View Toggle */}
              <div className="flex gap-2 shrink-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input ref={productSelectRef} type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchEnter() } }} placeholder="Cari produk / scan barcode..." disabled={!selectedOutletId} className="w-full pl-10 pr-8 py-2.5 border border-neutral-200 rounded-lg bg-[#F8F9F9] text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
                  {productSearch && <button onClick={() => setProductSearch('')} aria-label="Hapus pencarian" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded-full w-6 h-6 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>}
                </div>
                {categories.length > 0 && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={!selectedOutletId}
                    className="hidden sm:block px-2 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none disabled:opacity-50 cursor-pointer max-w-[140px]"
                  >
                    <option value="">Semua</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
                <div className="flex border border-neutral-200 rounded-xl overflow-hidden shrink-0 bg-white">
                  <button onClick={() => { setViewMode('list'); localStorage.setItem('lakupos-view-mode', 'list') }}
                    className={`p-1.5 md:p-2 transition-colors ${viewMode === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'}`}>
                    <List size={16} />
                  </button>
                  <button onClick={() => { setViewMode('grid'); localStorage.setItem('lakupos-view-mode', 'grid') }}
                    className={`p-1.5 md:p-2 transition-colors ${viewMode === 'grid' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'}`}>
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>

              {/* Mobile category filter (inline pills) */}
              {categories.length > 0 && (
                <div className="flex sm:hidden gap-1.5 overflow-x-auto shrink-0 pb-0.5 -mx-0.5 px-0.5">
                  <button
                    onClick={() => setSelectedCategory('')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${selectedCategory === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >Semua</button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >{cat}</button>
                  ))}
                </div>
              )}

              {/* Product table/grid */}
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
                {viewMode === 'list' ? (
                  <>
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
                <div className="max-h-[55dvh] overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700 md:max-h-none">
                  {showProductsLoading ? (
                    <ProductListSkeleton rows={6} />
                  ) : !selectedOutletId ? (
                    <div className="py-4 md:py-8 text-center text-sm text-gray-400 dark:text-gray-500">Pilih outlet untuk melihat produk</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex items-center justify-center">
                        <Package className="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        {productSearch ? `"${productSearch}" tidak ditemukan` : 'Tidak ada produk'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {productSearch ? 'Coba kata kunci lain' : 'Tambahkan produk terlebih dahulu'}
                      </p>
                    </div>
                  ) : visibleProducts.map(product => {
                    const stock = effectiveInventoryList?.find(p => p.id === product.id)?.currentStock ?? 0
                    const isSelected = selectedProductId === product.id
                    const isUntrackedItem = product.stock_behavior === 'UNTRACKED' || product.stock_behavior === 'CONSUMED'
                    const isOutOfStock = !isUntrackedItem && stock === 0
                    const itemTypeBadge = product.item_type === 'SERVICE' ? 'Jasa' : product.item_type === 'MENU' ? 'Menu' : product.item_type === 'PACKAGE' ? 'Paket' : null
                    return (
                      <button key={product.id} onClick={() => !isOutOfStock && handleProductChange(isSelected ? '' : product.id)} disabled={isOutOfStock}
                        className={`w-full text-left transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/40' : isOutOfStock ? 'opacity-40 cursor-not-allowed bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 active:bg-gray-100'}`}>
                        {/* Desktop row */}
                        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2.5">
                          <div className="col-span-5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>{product.name}</p>
                              {itemTypeBadge && (
                                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">{itemTypeBadge}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.sku}</p>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(product.price || 0)}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            {isUntrackedItem ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">∞</span>
                            ) : (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stock === 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' : stock <= 10 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'}`}>{stock === 0 ? 'Habis' : stock}</span>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            {isSelected ? <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs"><Check className="w-3 h-3" /></span> : <span className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                          </div>
                        </div>
                        {/* Mobile row — bigger touch target, 3 cols */}
                        <div className="md:hidden grid grid-cols-12 px-3 py-3">
                          <div className="col-span-7 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-semibold truncate leading-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>{product.name}</p>
                              {itemTypeBadge && (
                                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">{itemTypeBadge}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.sku}</p>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatCurrency(product.price || 0)}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-end">
                            {isSelected
                              ? <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0"><Check className="w-3.5 h-3.5" /></span>
                              : isUntrackedItem
                                ? <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">∞</span>
                                : <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${stock === 0 ? 'bg-red-100 text-red-700' : stock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{stock === 0 ? <X className="inline w-3 h-3" /> : stock}</span>
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
                    {hiddenCount > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pos.moreProducts').replace('{shown}', String(visibleProducts.length)).replace('{n}', String(hiddenCount))}</p>}
                  </div>
                )}
                  </>
                ) : (
                  /* Grid view */
                  <div className="max-h-[55dvh] overflow-y-auto flex-1 p-3 md:max-h-none">
                    {showProductsLoading ? (
                      <ProductGridSkeleton count={8} />
                    ) : !selectedOutletId ? (
                      <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Pilih outlet untuk melihat produk</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="mx-auto mb-3 flex items-center justify-center">
                          <Package className="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          {productSearch ? `"${productSearch}" tidak ditemukan` : 'Tidak ada produk'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {productSearch ? 'Coba kata kunci lain' : 'Tambahkan produk terlebih dahulu'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {visibleProducts.map(product => {
                          const stock = effectiveInventoryList?.find(p => p.id === product.id)?.currentStock ?? 0
                          const isSelected = selectedProductId === product.id
                          const isUntrackedItem = product.stock_behavior === 'UNTRACKED' || product.stock_behavior === 'CONSUMED'
                          const isOutOfStock = !isUntrackedItem && stock === 0
                          const itemTypeBadge = product.item_type === 'SERVICE' ? 'Jasa' : product.item_type === 'MENU' ? 'Menu' : product.item_type === 'PACKAGE' ? 'Paket' : null
                          const imageUrl = product.image_url || (product as any).imageUrl

                          return (
                            <button key={product.id} onClick={() => !isOutOfStock && handleProductChange(isSelected ? '' : product.id)} disabled={isOutOfStock}
                              className={`group text-left rounded-lg border-2 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${
                                isSelected ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-400/30 scale-[1.01]'
                                : isOutOfStock ? 'border-neutral-200 dark:border-neutral-800 opacity-40 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900'
                                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md active:scale-[0.99]'
                              }`}>
                              {/* Product Image / Avatar Container */}
                              <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getCategoryGradient(product.category)} border-b font-extrabold text-base md:text-lg tracking-wider`}>
                                    {getInitials(product.name)}
                                  </div>
                                )}

                                {/* Selection Checkmark Badge */}
                                {isSelected && (
                                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  </div>
                                )}

                                {/* Stock Badge Overlay */}
                                <div className="absolute bottom-1.5 left-1.5">
                                  {isUntrackedItem ? (
                                    <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">∞</span>
                                  ) : (
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md ${
                                      stock === 0
                                        ? 'bg-red-600/90 text-white'
                                        : stock <= 10
                                        ? 'bg-amber-500/90 text-white'
                                        : 'bg-emerald-600/90 text-white'
                                    }`}>
                                      {stock === 0 ? 'Habis' : stock}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Info Content */}
                              <div className="p-2.5 flex flex-col flex-1 justify-between gap-1">
                                <div>
                                  <p className={`text-xs md:text-sm font-semibold truncate ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                    {product.name}
                                  </p>
                                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">{product.sku}</p>
                                </div>

                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                  <span className={`text-xs md:text-sm font-extrabold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                    {formatCurrency(product.price || 0)}
                                  </span>
                                  {itemTypeBadge && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                                      {itemTypeBadge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {selectedOutletId && filteredProducts.length > 0 && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3 text-center">{filteredProducts.length} produk</p>
                    )}
                    {selectedOutletId && hiddenCount > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 text-center">{t('pos.moreProducts').replace('{shown}', String(visibleProducts.length)).replace('{n}', String(hiddenCount))}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Qty + Add */}
              {selectedProduct && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
                  {/* Product info row */}
                  <div className="flex items-center gap-2 mb-2.5 min-w-0">
                    <p className="text-xs md:text-sm font-bold text-emerald-950 truncate flex-1">{selectedProduct.name}</p>
                    <span className="text-xs font-bold text-emerald-800 shrink-0">{formatCurrency(selectedProduct.price || 0)}</span>
                    {selectedOutletId && (
                      selectedProduct.stock_behavior === 'UNTRACKED' || selectedProduct.stock_behavior === 'CONSUMED' ? (
                        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Tanpa Stok
                        </span>
                      ) : (
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${availableStock === 0 ? 'bg-red-100 text-red-700' : availableStock <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {availableStock === 0 ? 'Habis' : `Stok: ${availableStock}`}
                        </span>
                      )
                    )}
                  </div>
                  {/* Quick qty + input row */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex gap-1 flex-wrap">
                      {[1, 2, 3, 5, 10].map(q => (
                        <button key={q} onClick={() => handleQuickQuantity(q)} className={`min-w-11 min-h-11 text-xs font-bold rounded-lg border transition-colors ${quantity === q ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-300'}`}>{q}</button>
                      ))}
                    </div>
                    <input ref={quantityInputRef} type="number" min="1" max={availableStock || 999} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddToCart() } }} onFocus={(e) => e.target.select()} className="w-14 px-2 py-1.5 text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none text-sm font-bold shrink-0" />
                  </div>
                  {/* Add button — full width */}
                  <Button variant="primary" size="md" fullWidth onClick={handleAddToCart} disabled={productsLoading || (!!selectedOutletId && availableStock === 0 && selectedProduct.stock_behavior === 'TRACKED')} className="!rounded-lg !border-emerald-700 !bg-emerald-600 !text-white hover:!bg-emerald-700 active:scale-95 transition-transform duration-100">
                    Tambah ke Keranjang
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Payment + Recent Transactions + Receipt — hidden on mobile (handled by sticky bar + cart drawer) */}
        <div className="hidden md:flex flex-col gap-4 w-[22rem] shrink-0 overflow-hidden">

          {/* Payment card */}
          <div className="glass-panel-dark shrink-0 rounded-xl bg-[#0F5F56] p-4 text-white shadow-[0_20px_45px_-25px_rgba(28,25,23,0.75)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Checkout</p>
                <p className="mt-1 text-sm font-semibold text-white">Ringkasan pembayaran</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2 text-white">
                <WalletCards className="h-4 w-4" />
              </div>
            </div>

            {/* Cart, one line per item, so every scan shows up next to the total */}
            {cart.length > 0 && (
              <div className="mt-3 max-h-[38vh] overflow-y-auto rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    ref={item.productId === lastAddedId ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs ${item.productId === lastAddedId ? 'bg-emerald-400/20' : ''}`}
                  >
                    <button
                      onClick={() => setPriceEditId(item.productId)}
                      title={`${item.productSku} · ${formatCurrency(item.unitPrice)} — ${t('discount.line.button')}`}
                      className="min-w-0 flex-1 truncate text-left text-neutral-100 hover:text-white"
                    >
                      {item.productName}
                      {priceOverrideOf(item) && <span className="ml-1 text-amber-300">*</span>}
                    </button>
                    <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} aria-label={`Kurangi ${item.productName}`} className="h-5 w-5 shrink-0 rounded border border-white/20 leading-none text-white/80 hover:border-emerald-400">−</button>
                    <span className="w-5 shrink-0 text-center font-semibold text-white">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} aria-label={`Tambah ${item.productName}`} className="h-5 w-5 shrink-0 rounded border border-white/20 leading-none text-white/80 hover:border-emerald-400">+</button>
                    <span className="w-[4.75rem] shrink-0 text-right font-semibold text-white">{formatCurrency(item.total)}</span>
                    <button onClick={() => handleRemoveFromCart(item.productId)} aria-label={`Hapus ${item.productName}`} className="shrink-0 px-0.5 text-white/60 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Total on one line with its label; subtotal and discount share the next line */}
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-end justify-between gap-3">
                <div className="shrink-0 pb-1">
                  <p className="text-xs text-white/80">Total tagihan</p>
                  <p className="text-xs text-white/70">{cartItemCount} item</p>
                </div>
                <p className="truncate text-3xl font-semibold tracking-tight text-white">
                  {cart.length > 0 ? formatCurrency(cartTotal) : 'Rp 0'}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-sm text-white/80">
                <span>Subtotal <span className="text-white">{formatCurrency(cartSubtotal)}</span></span>
                <span>
                  Diskon{' '}
                  <span className={totalDiscount > 0 ? 'text-emerald-300' : 'text-white'}>
                    {totalDiscount > 0 ? `- ${formatCurrency(totalDiscount)}` : formatCurrency(0)}
                  </span>
                </span>
              </div>
            </div>
            {/* Promo */}
            <div className="mt-4">
              <button onClick={() => setIsPromoExpanded(!isPromoExpanded)} className="flex items-center justify-between w-full text-left rounded-lg px-2 -mx-2 py-1 hover:bg-white/5 transition-colors">
                <span className="text-xs font-semibold text-neutral-200">Kode Promo</span>
                <span className="text-white/60 text-xs">{isPromoExpanded ? '▲' : '▼'}</span>
              </button>
              {isPromoExpanded && !appliedPromo && (
                <div className="flex gap-2 mt-2">
                  <Input type="text" placeholder="Kode promo" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} fullWidth className="!rounded-lg !border-white/15 !bg-white/10 !text-white !placeholder:text-white/50" />
                  <Button variant="outline" size="sm" onClick={handleApplyPromo} disabled={!promoCode || validatePromoMutation.isPending} className="!rounded-lg !border-white/15 !bg-white/10 !text-white hover:!bg-white/15">{validatePromoMutation.isPending ? '...' : 'Pakai'}</Button>
                </div>
              )}
              {appliedPromo && (
                <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold">{appliedPromo.promoName}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Hemat {formatCurrency(appliedPromo.discountAmount)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRemovePromo} aria-label="Hapus promo"><X className="w-4 h-4" /></Button>
                </div>
              )}
            </div>

            {/* Manual discount */}
            <div className="mt-3">
              <button
                onClick={() => setIsDiscountOpen(true)}
                disabled={cart.length === 0}
                className="flex w-full items-center justify-between rounded-lg px-2 -mx-2 py-1 text-left text-xs font-semibold text-neutral-200 hover:bg-white/5 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5"><BadgePercent className="h-3.5 w-3.5" /> {t('discount.total.button')}</span>
                {manualDiscount && <span className="text-emerald-300">-{formatCurrency(manualDiscount.amount)}</span>}
              </button>
              {manualDiscount && (
                <p className={`mt-1 text-xs ${discountProblem ? 'text-red-300' : 'text-white/70'}`}>
                  {discountProblem ? t('discount.total.tooLarge') : t(`discount.reason.${manualDiscount.reason}`)}
                </p>
              )}
            </div>

            {/* Summary */}
            {cart.length > 0 && (
              <div className="p-2.5 bg-white/90 dark:bg-gray-700/50 rounded-xl border border-white/40 dark:border-gray-600 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(cartSubtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Diskon</span>
                    <span className="font-semibold text-green-600">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1.5 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            )}

            <Button variant="primary" size="lg" fullWidth onClick={handleCompleteSale} disabled={checkoutDisabled} className="mt-4 !rounded-lg !border-white !bg-white !text-[#0F5F56] hover:!bg-white/90">
              {checkoutLabel}
            </Button>

            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Shortcut</p>
              <div className="flex gap-2 text-xs text-white/80 flex-wrap">
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-neutral-200 font-mono">F2</kbd> Cari produk</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-neutral-200 font-mono">Enter</kbd> Tambah</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-neutral-200 font-mono">F8</kbd> Bayar</span>
                <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-neutral-200 font-mono">Esc</kbd> Batal</span>
              </div>
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
                  <div key={t.id} className="glass-tint p-2 bg-white/55 dark:bg-gray-700/50 rounded-lg border border-white/70 dark:border-gray-700">
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                      title="Preview struk"
                      aria-label="Preview struk"
                    >
                      <Eye className="w-3.5 h-3.5" />
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
      <div className="glass-bar sticky bottom-0 z-20 md:hidden shrink-0 rounded-b-xl border-t border-white/70 bg-white dark:bg-gray-900 px-3 py-2.5 flex items-center gap-3">
        {receiptData && cart.length === 0 ? (
          /* Post-payment: show print/preview actions */
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transaksi berhasil</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400 leading-tight">{formatCurrency(receiptData.total)}</p>
            </div>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              onClick={handleDirectPrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shrink-0"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </>
        ) : cart.length > 0 ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">{cartItemCount} item{totalDiscount > 0 && <span className="text-green-600 ml-1">· Diskon -{formatCurrency(totalDiscount)}</span>}</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400 leading-tight">{formatCurrency(cartTotal)}</p>
            </div>
            <button
              onClick={handleCompleteSale}
              disabled={checkoutDisabled}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white rounded-lg font-bold text-sm transition-colors shrink-0"
            >
              {!selectedOutletId ? 'Pilih outlet' : checkoutDisabled || needsShift ? checkoutLabel : <span className="inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Bayar</span>}
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center w-full py-0.5">Pilih produk untuk memulai transaksi</p>
        )}
      </div>

      {/* ── Cart Drawer ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-96 bg-white dark:bg-gray-900 shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100"><ShoppingCart className="w-4 h-4" /> Keranjang</h2>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50">Kosongkan</button>
                )}
                <button onClick={() => setIsCartOpen(false)} aria-label={t('common.close')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <ShoppingCart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Keranjang kosong</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pilih produk untuk menambah item</p>
                </div>
              ) : cart.map((item) => (
                <div key={item.productId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.productSku} · {formatCurrency(item.unitPrice)}/unit</p>
                      {priceOverrideOf(item) && (
                        <p className="text-xs text-amber-700">
                          {t('discount.line.from').replace('{price}', formatCurrency(item.listPrice!))} · {t(`discount.reason.${item.discountReason}`)}
                          {item.discountNote ? ` — ${item.discountNote}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setPriceEditId(item.productId)}
                      aria-label={`${t('discount.line.button')} ${item.productName}`}
                      title={t('discount.line.button')}
                      className="ml-2 p-1 text-gray-400 hover:text-teal-700 shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleRemoveFromCart(item.productId)} aria-label={`Hapus ${item.productName}`} className="ml-2 text-gray-400 hover:text-red-500 text-sm shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} className="min-w-10 min-h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 font-bold text-sm">-</button>
                      <span className="w-8 text-center font-bold text-sm text-gray-900 dark:text-gray-100">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} className="min-w-10 min-h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 font-bold text-sm">+</button>
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
                  {totalDiscount > 0 && <span className="text-sm text-green-600 font-semibold">Diskon -{formatCurrency(totalDiscount)}</span>}
                </div>
                {/* Promo code: on phones the checkout card with this field is hidden, so it lives here too */}
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-green-700">{appliedPromo.promoName}</p>
                      <p className="text-xs text-green-700">{t('pos.sales.promo.saved').replace('{amount}', formatCurrency(appliedPromo.discountAmount))}</p>
                    </div>
                    <button onClick={handleRemovePromo} aria-label={t('pos.sales.promo.remove')} className="p-1.5 text-green-700 hover:text-red-600"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder={t('pos.sales.promo.label')}
                      aria-label={t('pos.sales.promo.label')}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm focus:border-[#0F5F56] focus:outline-none"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={!promoCode || validatePromoMutation.isPending}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm font-semibold text-[#0F5F56] disabled:opacity-50"
                    >
                      {validatePromoMutation.isPending ? '...' : t('pos.sales.promo.apply')}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setIsDiscountOpen(true)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold"><BadgePercent className="h-4 w-4" /> {t('discount.total.button')}</span>
                  <span className={discountProblem ? 'text-red-600 text-xs' : 'text-teal-700 text-xs'}>
                    {manualDiscount
                      ? (discountProblem ? t('discount.total.tooLarge') : `-${formatCurrency(manualDiscount.amount)} · ${t(`discount.reason.${manualDiscount.reason}`)}`)
                      : ''}
                  </span>
                </button>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-sm md:text-xl font-bold text-blue-600">{formatCurrency(cartTotal)}</span>
                </div>
                <Button variant="primary" size="lg" fullWidth onClick={() => { setIsCartOpen(false); handleCompleteSale() }} disabled={checkoutDisabled}>
                  {!selectedOutletId ? 'Pilih outlet dulu' : checkoutLabel}
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
            <div className="flex items-center justify-center mx-auto mb-4"><Ban className="w-8 h-8 text-red-600 dark:text-red-400" /></div>
            <h2 className="text-base md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Batas Transaksi Tercapai</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">Paket <span className="font-semibold text-blue-600">Gratis</span> hanya mendukung <span className="font-semibold">100 transaksi per bulan</span>.</p>
            <p className="text-gray-600 dark:text-gray-400 mb-3 md:mb-6">Upgrade ke paket <span className="font-semibold text-orange-500">Warung (Rp 99rb/bulan)</span> untuk transaksi tidak terbatas.</p>
            <div className="flex flex-col gap-3">
              <a href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent('Halo, saya ingin upgrade dari paket Gratis ke paket Warung Laku POS (Rp 99rb/bulan). Mohon bantuannya.')}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold text-xs md:text-lg transition-colors"><MessageCircle className="w-4 h-4 md:w-5 md:h-5" /> Upgrade via WhatsApp</a>
              <button onClick={() => setShowUpgradeModal(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {isShiftModalOpen && selectedOutletId && (
        <OpenShiftModal outletId={selectedOutletId} outletName={selectedOutlet?.name} onClose={() => setIsShiftModalOpen(false)} />
      )}

      {receiptData && <PrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} receiptData={receiptData} />}

      {priceEditId && (() => {
        const item = cart.find(i => i.productId === priceEditId)
        if (!item) return null
        return (
          <PriceOverrideModal
            itemName={item.productName}
            listPrice={item.listPrice ?? item.unitPrice}
            currentPrice={item.unitPrice}
            current={{ reason: item.discountReason, note: item.discountNote }}
            onSave={(change) => handleChangePrice(item.productId, change)}
            onClose={() => setPriceEditId(null)}
          />
        )
      })()}

      {isDiscountOpen && (
        <ManualDiscountModal
          due={cartSubtotal - discountAmount}
          current={manualDiscount}
          onSave={(d) => { setManualDiscount(d); setIsDiscountOpen(false) }}
          onClose={() => setIsDiscountOpen(false)}
        />
      )}
      {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setPendingTransactionId('') }}
        transactionId={pendingTransactionId}
        outletId={selectedOutletId}
        shiftId={activeShift?.id ?? ''}
        deviceId={activeShift?.device_id ?? undefined}
        amount={cartTotal}
        items={cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          priceOverride: priceOverrideOf(item),
        }))}
        discountAmount={discountAmount}
        manualDiscount={manualDiscount}
        notes={appliedPromo ? `Promo applied: ${appliedPromo.promoName}` : undefined}
        customerName={selectedOutlet?.name}
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
