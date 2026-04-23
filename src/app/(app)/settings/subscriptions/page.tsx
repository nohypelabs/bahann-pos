'use client'

import { useState, useEffect, useRef } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { trpc } from '@/lib/trpc/client'
import { Gift, CreditCard, ClipboardList, CheckCircle, Check, Upload, Clock, XCircle, Image, ChevronDown, Copy, Wallet, ExternalLink, PartyPopper } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const PLANS = [
  {
    value: 'free',
    label: 'Gratis',
    price: 0,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    features: ['1 Outlet', '1 Kasir', 'POS Dasar', 'Maks. 100 transaksi/bulan', 'Laporan Harian', 'Tanpa kartu kredit'],
  },
  {
    value: 'warung',
    label: 'Warung',
    price: 99000,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    border: 'border-green-400',
    popular: true,
    features: ['1 Outlet', '2 Kasir', 'Transaksi Tidak Terbatas', 'POS + Inventori', 'Laporan Harian & Mingguan', 'Mode Offline', 'Support WhatsApp'],
  },
  {
    value: 'starter',
    label: 'Starter',
    price: 299000,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    border: 'border-blue-400',
    features: ['1 Outlet', '3 Pengguna', 'Fitur POS Lengkap', 'Inventori Lanjutan', 'Laporan + Ekspor', 'Mode Offline', 'Support Email & WA', 'Backup Cloud'],
  },
  {
    value: 'professional',
    label: 'Professional',
    price: 1200000,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    border: 'border-purple-400',
    features: ['3 Outlet', '10 Pengguna', 'Semua Fitur Starter', 'Multi-outlet Inventori', 'Audit Log', 'Akses API', 'Laporan Kustom', 'Support Prioritas', 'Integrasi QRIS'],
  },
  {
    value: 'business',
    label: 'Business',
    price: 0,
    priceLabel: 'Hubungi Kami',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    border: 'border-orange-400',
    features: ['Outlet Tidak Terbatas', 'Pengguna Tidak Terbatas', 'Semua Fitur Pro', 'API Access', 'Custom Integrasi', 'SLA 99.9%'],
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    price: 0,
    priceLabel: 'Hubungi Kami',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    border: 'border-red-400',
    features: ['Semua Fitur Business', 'White-label', 'On-premise Option', 'Training Tim', 'Custom SLA', 'Account Manager'],
  },
] as const

type Plan = typeof PLANS[number]['value']

function PlanBadge({ plan }: { plan: string }) {
  const p = PLANS.find(p => p.value === plan) || PLANS[0]
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${p.color}`}>{p.label}</span>
}

function fmtRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_STYLE: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, label: 'Menunggu Verifikasi', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  approved: { icon: <CheckCircle className="w-4 h-4" />, label: 'Disetujui', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  rejected: { icon: <XCircle className="w-4 h-4" />, label: 'Ditolak', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
}

// ─── Billing History ───────────────────────────────────────────────────────────
function BillingHistory() {
  const { data: history, isLoading } = trpc.users.getBillingHistory.useQuery()
  if (isLoading || !history || history.length === 0) return null

  return (
    <SectionCard title="Riwayat Langganan">
      <div className="space-y-3">
        {history.map(item => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex-shrink-0 mt-0.5">
              {item.is_trial ? <Gift className="w-5 h-5 text-blue-500" /> : item.amount && item.amount > 0 ? <CreditCard className="w-5 h-5 text-green-500" /> : <ClipboardList className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <PlanBadge plan={item.plan} />
                {item.previous_plan && item.previous_plan !== item.plan && (
                  <span className="text-xs text-gray-400">dari {PLANS.find(p => p.value === item.previous_plan)?.label || item.previous_plan}</span>
                )}
                {item.is_trial && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">Trial</span>
                )}
              </div>
              {item.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.note}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              {item.amount && item.amount > 0
                ? <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtRupiah(item.amount)}</p>
                : <p className="text-sm font-semibold text-green-600 dark:text-green-400">Gratis</p>}
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── User Self-Service View ────────────────────────────────────────────────────
function UserUpgradeView() {
  const { data: planData, isLoading, refetch: refetchPlan } = trpc.auth.getPlan.useQuery()
  const { data: myRequests, refetch: refetchRequests } = trpc.paymentRequests.myRequests.useQuery()
  const { data: paymentConfig } = trpc.paymentRequests.paymentConfig.useQuery()
  const createMutation = trpc.paymentRequests.create.useMutation({ onSuccess: () => refetchRequests() })
  const uploadMutation = trpc.paymentRequests.uploadProof.useMutation({ onSuccess: () => refetchRequests() })
  const checkPaymentMutation = trpc.paymentRequests.checkMyPayment.useMutation()

  const currentPlan = planData?.plan || 'free'
  const currentIndex = PLANS.findIndex(p => p.value === currentPlan)
  const pendingRequest = myRequests?.find(r => r.status === 'pending')

  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'qris' | 'crypto'>('bank_transfer')
  const [cryptoToken, setCryptoToken] = useState<'usdc' | 'usdt' | 'sol'>('usdc')
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [successModal, setSuccessModal] = useState<{ plan: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevPendingRef = useRef<string | null>(null)

  // Auto-poll every 15s when there's a pending crypto request — triggers on-chain check
  useEffect(() => {
    if (!pendingRequest) return
    const isCryptoPending = !!pendingRequest.crypto_token
    const interval = setInterval(async () => {
      if (isCryptoPending) {
        try { await checkPaymentMutation.mutateAsync() } catch { /* ignore */ }
      }
      refetchRequests()
    }, 15000)
    return () => clearInterval(interval)
  }, [pendingRequest, refetchRequests]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect when a pending request gets approved
  useEffect(() => {
    if (pendingRequest) {
      prevPendingRef.current = pendingRequest.id
    } else if (prevPendingRef.current && myRequests) {
      const justApproved = myRequests.find(r => r.id === prevPendingRef.current && r.status === 'approved')
      if (justApproved) {
        setSuccessModal({ plan: justApproved.plan })
        refetchPlan()
      }
      prevPendingRef.current = null
    }
  }, [pendingRequest, myRequests, refetchPlan])

  const bankName = paymentConfig?.bank?.name || ''
  const bankAcct = paymentConfig?.bank?.account || ''
  const bankHolder = paymentConfig?.bank?.holder || ''
  const waNumber = paymentConfig?.supportWa || ''
  const qrisImageUrl = paymentConfig?.qrisImageUrl || ''

  const checkoutPlanData = PLANS.find(p => p.value === checkoutPlan)
  const isCrypto = paymentMethod === 'crypto'
  const cryptoPriceUsd = checkoutPlan ? paymentConfig?.crypto?.prices?.[checkoutPlan] : null
  const actualPaymentMethod = isCrypto ? `crypto_${cryptoToken}` as const : paymentMethod

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleUpgradeClick = (planValue: string) => {
    if (pendingRequest) return
    setCheckoutPlan(planValue)
  }

  const handleSubmitRequest = async () => {
    if (!checkoutPlan || !checkoutPlanData) return
    try {
      await createMutation.mutateAsync({
        plan: checkoutPlan as any,
        amount: checkoutPlanData.price as number,
        paymentMethod: actualPaymentMethod as any,
      })
    } catch { /* error shown via mutation state */ }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, requestId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB'); return }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        await uploadMutation.mutateAsync({
          requestId,
          proofBase64: base64,
          fileName: file.name,
        })
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setUploading(false)
    }
  }

  if (isLoading) return <p className="text-center py-16 text-gray-400 text-sm">Memuat data plan...</p>

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setSuccessModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <PartyPopper className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pembayaran Diterima!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Selamat! Plan Anda telah diupgrade ke
            </p>
            <PlanBadge plan={successModal.plan} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Fitur baru sudah aktif. Selamat menikmati!
            </p>
            <button onClick={() => setSuccessModal(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-sm font-semibold text-white transition-colors">
              Oke, Mantap!
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Langganan"
        subtitle="Kelola dan upgrade paket berlangganan Anda."
        action={
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Plan aktif:</span>
            <PlanBadge plan={currentPlan} />
          </div>
        }
      />

      {/* Pending Request Banner */}
      {pendingRequest && (
        <div className={`p-4 rounded-xl border ${
          pendingRequest.crypto_token
            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-start gap-3">
            {pendingRequest.crypto_token
              ? <Wallet className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              : <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className={`text-sm font-semibold ${pendingRequest.crypto_token ? 'text-purple-800 dark:text-purple-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                Permintaan upgrade ke <PlanBadge plan={pendingRequest.plan} /> {pendingRequest.crypto_token ? 'menunggu pembayaran crypto' : 'sedang menunggu verifikasi'}
              </p>

              {pendingRequest.crypto_token && pendingRequest.crypto_amount && paymentConfig?.crypto?.walletAddress ? (
                <div className="mt-3 space-y-3">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-2.5 rounded-xl border border-purple-200 dark:border-purple-700">
                      <QRCodeSVG
                        value={paymentConfig!.crypto.walletAddress}
                        size={120}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Kirim {pendingRequest.crypto_token.toUpperCase()} ke wallet (Solana):</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white dark:bg-gray-900 px-2 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 text-gray-900 dark:text-gray-100 break-all font-mono flex-1">
                        {paymentConfig!.crypto.walletAddress}
                      </code>
                      <button onClick={() => copyToClipboard(paymentConfig!.crypto.walletAddress, 'pw')}
                        className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex-shrink-0">
                        {copied === 'pw' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <p className="text-xs text-purple-600 dark:text-purple-400">Jumlah persis ({pendingRequest.crypto_token.toUpperCase()}):</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-bold text-purple-800 dark:text-purple-200">{parseFloat(pendingRequest.crypto_amount).toFixed(pendingRequest.crypto_token === 'sol' ? 6 : 4)}</span>
                      <button onClick={() => copyToClipboard(parseFloat(pendingRequest.crypto_amount!).toFixed(pendingRequest.crypto_token === 'sol' ? 6 : 4), 'pa')}
                        className="p-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                        {copied === 'pa' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-purple-500 dark:text-purple-400">
                    Pembayaran diverifikasi otomatis dalam 2-5 menit setelah konfirmasi on-chain.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {fmtRupiah(pendingRequest.amount)} — {new Date(pendingRequest.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {!pendingRequest.proof_url && (
                    <div className="mt-3">
                      <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                        onChange={e => handleFileUpload(e, pendingRequest.id)} />
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50">
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Mengupload...' : 'Upload Bukti Transfer'}
                      </button>
                    </div>
                  )}
                  {pendingRequest.proof_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-700 dark:text-green-400 font-medium">Bukti transfer sudah diupload</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutPlan && checkoutPlanData && !pendingRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setCheckoutPlan(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Upgrade ke {checkoutPlanData.label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {'price' in checkoutPlanData && checkoutPlanData.price > 0
                ? `${fmtRupiah(checkoutPlanData.price as number)}/bulan`
                : 'Hubungi kami untuk harga'}
            </p>

            {/* Payment method */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'bank_transfer' as const, label: 'Transfer Bank' },
                  { key: 'qris' as const, label: 'QRIS' },
                  ...(paymentConfig?.crypto?.enabled && cryptoPriceUsd ? [
                    { key: 'crypto' as const, label: 'Crypto' },
                  ] : []),
                ]).map(m => (
                  <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      paymentMethod === m.key
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment details */}
            {paymentMethod === 'bank_transfer' && bankAcct && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-5">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transfer ke:</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{bankName}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-wider">{bankAcct}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">a.n. {bankHolder}</p>
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                    Nominal: {fmtRupiah(checkoutPlanData.price as number)}
                  </p>
                </div>
              </div>
            )}

            {paymentMethod === 'qris' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-5 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Scan QRIS untuk pembayaran</p>
                {qrisImageUrl ? (
                  <img src={qrisImageUrl} alt="QRIS" className="w-48 h-48 mx-auto bg-white rounded-lg object-contain border p-2" />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center border">
                    <p className="text-xs text-gray-400">QRIS belum dikonfigurasi</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Nominal: {fmtRupiah(checkoutPlanData.price as number)}
                </p>
              </div>
            )}

            {isCrypto && paymentConfig?.crypto?.walletAddress && cryptoPriceUsd && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Crypto Payment (Solana)</span>
                </div>

                {/* Token selector */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Pilih token:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['usdc', 'usdt', 'sol'] as const).map(t => (
                      <button key={t} onClick={() => setCryptoToken(t)}
                        className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                          cryptoToken === t
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-purple-400'
                        }`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code + Wallet Address */}
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                    <QRCodeSVG
                      value={paymentConfig!.crypto.walletAddress}
                      size={160}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  <div className="w-full">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet address:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 break-all font-mono">
                        {paymentConfig!.crypto.walletAddress}
                      </code>
                      <button onClick={() => copyToClipboard(paymentConfig!.crypto.walletAddress, 'wallet')}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                        {copied === 'wallet' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount info */}
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                    Harga ({cryptoToken.toUpperCase()}):
                  </p>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    {cryptoToken === 'sol'
                      ? paymentConfig.crypto.solPriceUsd && paymentConfig.crypto.solPriceUsd > 0
                        ? `≈ ${(cryptoPriceUsd / paymentConfig.crypto.solPriceUsd).toFixed(6)} SOL`
                        : 'Mengambil harga SOL...'
                      : `${cryptoPriceUsd.toFixed(2)} ${cryptoToken.toUpperCase()}`}
                  </p>
                  {cryptoToken === 'sol' && paymentConfig.crypto.solPriceUsd > 0 && (
                    <p className="text-[11px] text-purple-400 mt-0.5">
                      1 SOL ≈ ${paymentConfig.crypto.solPriceUsd.toFixed(2)} USD
                    </p>
                  )}
                  <p className="text-[11px] text-purple-500 dark:text-purple-400 mt-1">
                    Jumlah persis akan diberikan setelah submit. Kirim jumlah persis agar terdeteksi otomatis.
                  </p>
                </div>

                <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <Clock className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-yellow-700 dark:text-yellow-300">
                    Pembayaran diverifikasi otomatis dalam 2-5 menit setelah konfirmasi on-chain. Pastikan kirim di jaringan <strong>Solana</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isCrypto
                  ? 'Setelah submit, Anda akan mendapat jumlah unik untuk dikirim. Plan diaktifkan otomatis setelah terdeteksi on-chain.'
                  : 'Setelah transfer, upload bukti pembayaran. Plan akan diaktifkan setelah admin memverifikasi.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCheckoutPlan(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Batal
              </button>
              <button onClick={handleSubmitRequest} disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-sm font-semibold text-white transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Memproses...' : 'Saya Sudah Transfer'}
              </button>
            </div>

            {createMutation.error && (
              <p className="text-xs text-red-500 mt-3 text-center">{createMutation.error.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.value === currentPlan
          const isDowngrade = idx < currentIndex
          const isEnterprise = plan.value === 'enterprise'
          const hasPending = !!pendingRequest

          return (
            <div key={plan.value}
              className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all ${
                isCurrent ? `${plan.border} bg-white dark:bg-gray-900 shadow-md` :
                isDowngrade ? 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 opacity-60' :
                `border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md`
              }`}
            >
              {'popular' in plan && plan.popular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full shadow">Paling Populer</span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold bg-gray-700 text-white rounded-full shadow">Plan Anda</span>
              )}

              <div className="mb-3"><PlanBadge plan={plan.value} /></div>

              <div className="mb-4">
                {'priceLabel' in plan ? (
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-200">{plan.priceLabel}</span>
                ) : plan.price === 0 ? (
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gratis</span>
                ) : (
                  <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmtRupiah(plan.price)}</span>
                    <span className="text-sm text-gray-400 ml-1">/bulan</span>
                  </div>
                )}
              </div>

              <ul className="space-y-1.5 mb-5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl">Plan Aktif</div>
              ) : isDowngrade ? (
                <div className="py-2 text-center text-xs text-gray-300 dark:text-gray-600 border border-gray-100 dark:border-gray-800 rounded-xl">Downgrade tidak tersedia</div>
              ) : isEnterprise ? (
                <a href={waNumber ? `https://wa.me/${waNumber.replace(/\D/g, '')}` : '#'} target="_blank" rel="noopener noreferrer"
                  className="py-2 text-center text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors block">
                  Hubungi via WhatsApp
                </a>
              ) : (
                <button onClick={() => handleUpgradeClick(plan.value)} disabled={hasPending}
                  className={`py-2 text-center text-xs font-semibold rounded-xl transition-colors w-full ${
                    hasPending
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}>
                  {hasPending ? 'Ada request pending' : `Upgrade ke ${plan.label}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* My Payment Requests */}
      {myRequests && myRequests.length > 0 && (
        <SectionCard title="Riwayat Permintaan Upgrade">
          <div className="space-y-3">
            {myRequests.map(req => {
              const s = STATUS_STYLE[req.status] || STATUS_STYLE.pending
              return (
                <div key={req.id} className={`flex items-start gap-3 p-3 rounded-xl border ${s.color}`}>
                  <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PlanBadge plan={req.plan} />
                      <span className="text-xs font-medium">{s.label}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      {req.crypto_token
                        ? `${parseFloat(req.crypto_amount!).toFixed(req.crypto_token === 'sol' ? 6 : 4)} ${req.crypto_token.toUpperCase()} (Solana)`
                        : `${fmtRupiah(req.amount)} — ${req.payment_method === 'qris' ? 'QRIS' : 'Transfer Bank'}`}
                    </p>
                    {req.crypto_tx_hash && (
                      <a href={`https://solscan.io/tx/${req.crypto_tx_hash}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-1 opacity-80 hover:opacity-100 underline">
                        <ExternalLink className="w-3 h-3" /> TX: {req.crypto_tx_hash.slice(0, 12)}...
                      </a>
                    )}
                    {req.admin_note && <p className="text-xs mt-1 opacity-70">Catatan: {req.admin_note}</p>}
                    {req.status === 'pending' && !req.crypto_token && !req.proof_url && (
                      <div className="mt-2">
                        <input type="file" id={`proof-${req.id}`} accept="image/*" className="hidden"
                          onChange={e => handleFileUpload(e, req.id)} />
                        <label htmlFor={`proof-${req.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-current rounded-lg cursor-pointer hover:opacity-80 transition-opacity">
                          <Upload className="w-3.5 h-3.5" />
                          {uploading ? 'Mengupload...' : 'Upload Bukti'}
                        </label>
                      </div>
                    )}
                    {req.status === 'pending' && req.crypto_token && (
                      <p className="text-xs mt-1.5 opacity-70 italic">Menunggu verifikasi otomatis on-chain...</p>
                    )}
                    {req.proof_url && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5" />
                        <a href={req.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:opacity-80">Lihat bukti</a>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs opacity-70">
                      {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Payment Instructions */}
      <SectionCard title="Cara Berlangganan">
        <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center justify-center">1</span>
            <span>Pilih plan yang sesuai kebutuhan, lalu klik <strong>Upgrade</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center justify-center">2</span>
            <span>Transfer sesuai nominal ke rekening, scan QRIS, atau kirim crypto (USDC/USDT/SOL) ke wallet Solana.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center justify-center">3</span>
            <span>Fiat: upload bukti transfer, plan aktif setelah diverifikasi admin. Crypto: plan aktif otomatis setelah terdeteksi on-chain (2-5 menit).</span>
          </li>
        </ol>
      </SectionCard>

      <BillingHistory />
    </div>
  )
}

// ─── Super Admin View ──────────────────────────────────────────────────────────
function SuperAdminView() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Manajemen Langganan"
        subtitle="Kelola plan tenant. Untuk review pembayaran, buka Admin Panel → Pembayaran."
      />
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
        Halaman ini dipindah ke <a href="/admin/payments" className="font-semibold underline">Admin Panel → Pembayaran</a> untuk pengalaman yang lebih lengkap.
      </div>
      <BillingHistory />
    </div>
  )
}

// ─── Root Page ─────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const { data: profile, isLoading } = trpc.auth.getProfile.useQuery()

  if (isLoading) return <p className="text-center py-16 text-gray-400 text-sm">Memuat...</p>
  if (profile?.role === 'super_admin') return <SuperAdminView />
  return <UserUpgradeView />
}
