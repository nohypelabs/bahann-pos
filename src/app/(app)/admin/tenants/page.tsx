'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { ArrowLeft, Search, Store, Users, ShoppingCart, Package, Ban, CheckCircle, ChevronDown, ArrowUpRight, Crown, Clock } from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  warung: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  starter: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  professional: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  business: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  enterprise: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

const PLAN_BORDER_ACCENT: Record<string, string> = {
  free: 'border-l-gray-300 dark:border-l-gray-600',
  warung: 'border-l-green-400 dark:border-l-green-500',
  starter: 'border-l-blue-400 dark:border-l-blue-500',
  professional: 'border-l-purple-400 dark:border-l-purple-500',
  business: 'border-l-orange-400 dark:border-l-orange-500',
  enterprise: 'border-l-red-400 dark:border-l-red-500',
}

const PLAN_CHIP_ACTIVE: Record<string, string> = {
  free: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100',
  warung: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700',
  starter: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700',
  professional: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-1 ring-purple-300 dark:ring-purple-700',
  business: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 ring-1 ring-orange-300 dark:ring-orange-700',
  enterprise: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-700',
}

const PLANS = ['free', 'warung', 'starter', 'professional', 'business', 'enterprise'] as const
const PAID_PLANS = ['warung', 'starter', 'professional', 'business', 'enterprise'] as const

const PLAN_META: Record<string, { label: string; price: number; color: string; bg: string; border: string; features: string[] }> = {
  free:         { label: 'Free',         price: 0,       color: 'text-gray-600',    bg: 'bg-gray-50 dark:bg-gray-800',       border: 'border-gray-200 dark:border-gray-700',    features: ['1 Outlet', '1 Kasir', '100 tx/bulan'] },
  warung:       { label: 'Warung',       price: 99000,   color: 'text-green-600',   bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-300 dark:border-green-700',   features: ['1 Outlet', '2 Kasir', 'Unlimited tx'] },
  starter:      { label: 'Starter',      price: 299000,  color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-300 dark:border-blue-700',     features: ['1 Outlet', '3 User', 'Inventori'] },
  professional: { label: 'Professional', price: 1200000, color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', features: ['3 Outlet', '10 User', 'API Access'] },
  business:     { label: 'Business',     price: 0,       color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', features: ['Unlimited', 'Custom'] },
  enterprise:   { label: 'Enterprise',   price: 0,       color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-300 dark:border-red-700',       features: ['White-label', 'On-premise'] },
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="h-32 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <TenantsContent />
    </Suspense>
  )
}

function TenantsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')

  const [userRole, setUserRole] = useState('')
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterSuspended, setFilterSuspended] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const u = JSON.parse(user)
        if (u.role !== 'super_admin') { router.push('/dashboard'); return }
        setUserRole(u.role)
      } catch { router.push('/dashboard') }
    }
  }, [router])

  const utils = trpc.useUtils()

  const { data: tenantsData, isLoading } = trpc.superAdmin.listTenants.useQuery(
    { search: search || undefined, plan: filterPlan || undefined, suspended: filterSuspended, limit: 50 },
    { enabled: userRole === 'super_admin' }
  )

  const { data: globalStats } = trpc.superAdmin.globalStats.useQuery(
    undefined,
    { enabled: userRole === 'super_admin' }
  )

  const { data: detail, isLoading: detailLoading } = trpc.superAdmin.getTenantDetail.useQuery(
    { tenantId: selectedId! },
    { enabled: userRole === 'super_admin' && !!selectedId }
  )

  const suspendMutation = trpc.superAdmin.suspendTenant.useMutation({
    onSuccess: () => {
      utils.superAdmin.listTenants.invalidate()
      utils.superAdmin.getTenantDetail.invalidate()
      utils.superAdmin.globalStats.invalidate()
    },
  })

  const updatePlanMutation = trpc.users.updatePlan.useMutation({
    onSuccess: () => {
      utils.superAdmin.listTenants.invalidate()
      utils.superAdmin.getTenantDetail.invalidate()
      utils.superAdmin.globalStats.invalidate()
    },
  })

  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newPlan, setNewPlan] = useState('')
  const [planNote, setPlanNote] = useState('')
  const [planAmount, setPlanAmount] = useState('')
  const [planExpiry, setPlanExpiry] = useState('')

  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  if (userRole !== 'super_admin') return null

  const fmtCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  const isFreeOrTrial = (plan: string | null, is_trial: boolean) => !plan || plan === 'free' || is_trial

  // Detail view
  if (selectedId && detail) {
    const detailIsFree = isFreeOrTrial(detail.plan, detail.is_trial)
    return (
      <div className="space-y-4 pt-2 md:pt-0">
        <button onClick={() => router.push('/admin/tenants')} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        {/* Tenant Header */}
        <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 shadow-sm ${detailIsFree ? 'border-l-4 border-l-gray-300 dark:border-l-gray-600' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{detail.name}</h1>
                {detail.is_suspended && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600">Suspended</span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{detail.email}</p>
              {detail.whatsapp_number && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">WA: {detail.whatsapp_number}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Bergabung: {fmtDate(detail.created_at)}</p>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              {/* Plan badge — prominent */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${PLAN_COLORS[detail.plan || 'free']}`}>
                  {(detail.plan || 'free').charAt(0).toUpperCase() + (detail.plan || 'free').slice(1)}
                </span>
                {detail.is_trial && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Trial
                  </span>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {detailIsFree && (
                  <button onClick={() => { setNewPlan('starter'); setPlanNote(''); setPlanAmount('299000'); setShowPlanModal(true) }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Upgrade
                  </button>
                )}
                <button onClick={() => { setNewPlan(detail.plan || 'free'); setPlanNote(''); setPlanAmount(''); setShowPlanModal(true) }}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Ubah Plan
                </button>
                <button onClick={() => { setSuspendReason(''); setShowSuspendModal(true) }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    detail.is_suspended
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100'
                  }`}>
                  {detail.is_suspended ? 'Aktifkan' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Outlet', value: detail.stats.outletCount, icon: <Store className="w-4 h-4" /> },
            { label: 'User', value: detail.stats.userCount, icon: <Users className="w-4 h-4" /> },
            { label: 'Produk', value: detail.stats.productCount, icon: <Package className="w-4 h-4" /> },
            { label: 'Transaksi', value: detail.stats.transactionCount.toLocaleString('id-ID'), icon: <ShoppingCart className="w-4 h-4" /> },
            { label: 'Revenue', value: fmtCurrency(detail.stats.totalRevenue), icon: <ShoppingCart className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-gray-400 dark:text-gray-500">{s.icon}<span className="text-[10px] font-medium uppercase">{s.label}</span></div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Outlets */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Outlet ({detail.outlets.length})</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {detail.outlets.map(o => (
              <div key={o.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.name}</p>
                {o.address && <p className="text-xs text-gray-500 dark:text-gray-400">{o.address}</p>}
              </div>
            ))}
            {detail.outlets.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">Belum ada outlet</div>}
          </div>
        </div>

        {/* Users */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Pengguna ({detail.users.length} kasir)</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {detail.users.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{u.role}</span>
              </div>
            ))}
            {detail.users.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">Belum ada kasir</div>}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Riwayat Billing</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {detail.billing.map(b => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {b.previous_plan} → {b.plan}
                    {b.is_trial && <span className="ml-1 text-xs text-yellow-600">(Trial)</span>}
                  </p>
                  {b.note && <p className="text-xs text-gray-500 dark:text-gray-400">{b.note}</p>}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fmtCurrency(b.amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(b.created_at)}</p>
                </div>
              </div>
            ))}
            {detail.billing.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">Belum ada riwayat</div>}
          </div>
        </div>

        {/* Change Plan Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer" onClick={e => e.target === e.currentTarget && setShowPlanModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default" />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Ubah Plan</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Saat ini: <span className={`font-bold ${PLAN_META[detail.plan || 'free']?.color || 'text-gray-600'}`}>{PLAN_META[detail.plan || 'free']?.label || 'Free'}</span>
              </p>

              {/* Plan cards — visual picker */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PLANS.map(p => {
                  const meta = PLAN_META[p]
                  const isSelected = newPlan === p
                  const isCurrent = detail.plan === p
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setNewPlan(p)
                        if (meta.price > 0) setPlanAmount(String(meta.price))
                        else setPlanAmount('')
                      }}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? `${meta.bg} ${meta.border} ring-2 ring-blue-500/30`
                          : `border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 ${meta.bg}`
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">Aktif</span>
                      )}
                      <p className={`text-sm font-bold ${meta.color}`}>{meta.label}</p>
                      {meta.price > 0 ? (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{fmtCurrency(meta.price)}/bln</p>
                      ) : (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Custom</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {meta.features.slice(0, 2).map(f => (
                          <span key={f} className="px-1.5 py-0.5 text-[9px] bg-white/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 rounded">{f}</span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Quick presets */}
              <div className="flex gap-1.5 mb-4">
                <button
                  onClick={() => { setNewPlan('enterprise'); setPlanAmount('0'); setPlanNote('Unlimited plan — portfolio client') }}
                  className="flex-1 px-2 py-1.5 text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Set Max
                </button>
                <button
                  onClick={() => { setNewPlan('professional'); setPlanAmount('1200000') }}
                  className="flex-1 px-2 py-1.5 text-[11px] font-semibold bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  Pro Plan
                </button>
                <button
                  onClick={() => { setNewPlan('free'); setPlanAmount('0'); setPlanNote('Reset ke free') }}
                  className="flex-1 px-2 py-1.5 text-[11px] font-semibold bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Reset Free
                </button>
              </div>

              {/* Amount + Expiry + Note */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Jumlah Bayar (Rp)</label>
                    <input type="number" value={planAmount} onChange={e => setPlanAmount(e.target.value)} placeholder="0"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Expired</label>
                    <input type="date" value={planExpiry} onChange={e => setPlanExpiry(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Kosongkan = tidak expired</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Catatan</label>
                  <input type="text" value={planNote} onChange={e => setPlanNote(e.target.value)} placeholder="Contoh: Transfer BNI dikonfirmasi"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                </div>
              </div>

              {/* Summary */}
              {newPlan && newPlan !== detail.plan && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-bold">{PLAN_META[detail.plan || 'free']?.label || 'Free'}</span>
                    {' → '}
                    <span className="font-bold">{PLAN_META[newPlan]?.label || newPlan}</span>
                    {planAmount && parseInt(planAmount) > 0 && <span className="ml-2">• {fmtCurrency(parseInt(planAmount))}</span>}
                    {planExpiry && <span className="ml-2">• Exp: {new Date(planExpiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowPlanModal(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Batal
                </button>
                <button
                  disabled={updatePlanMutation.isPending || newPlan === detail.plan}
                  onClick={() => {
                    updatePlanMutation.mutate({
                      userId: selectedId!,
                      plan: newPlan as any,
                      amount: parseInt(planAmount) || 0,
                      note: planNote || undefined,
                    }, { onSuccess: () => { setShowPlanModal(false); setPlanExpiry('') } })
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-sm font-semibold text-white transition-colors">
                  {updatePlanMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suspend Modal */}
        {showSuspendModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer" onClick={e => e.target === e.currentTarget && setShowSuspendModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default" />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-800">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${detail.is_suspended ? 'bg-green-50 dark:bg-green-900/30 text-green-500' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
                {detail.is_suspended ? <CheckCircle className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 text-center mb-1">
                {detail.is_suspended ? 'Aktifkan Tenant?' : 'Suspend Tenant?'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                {detail.is_suspended
                  ? `${detail.name} akan bisa login kembali.`
                  : `${detail.name} dan semua kasirnya tidak bisa login.`}
              </p>
              {!detail.is_suspended && (
                <input type="text" value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                  placeholder="Alasan (opsional)"
                  className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowSuspendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Batal
                </button>
                <button
                  disabled={suspendMutation.isPending}
                  onClick={() => {
                    suspendMutation.mutate({
                      tenantId: selectedId!,
                      suspend: !detail.is_suspended,
                      reason: suspendReason || undefined,
                    }, { onSuccess: () => setShowSuspendModal(false) })
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    detail.is_suspended ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                  } disabled:opacity-50`}>
                  {suspendMutation.isPending ? '...' : detail.is_suspended ? 'Ya, Aktifkan' : 'Ya, Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (selectedId && detailLoading) {
    return (
      <div className="space-y-4 pt-2 md:pt-0">
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const freeCount = globalStats ? globalStats.totalTenants - PAID_PLANS.reduce((sum, p) => sum + (globalStats.planDistribution[p] || 0), 0) : 0

  // List view
  return (
    <div className="space-y-4 pt-2 md:pt-0">
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Tenant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola semua tenant di platform</p>
        </div>
        <button onClick={() => router.push('/admin')} className="md:hidden flex items-center gap-1.5 text-sm text-gray-500">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
      </div>

      {/* Plan Distribution Summary */}
      {globalStats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <button
            onClick={() => setFilterPlan(filterPlan === 'free' ? '' : 'free')}
            className={`relative rounded-xl p-3 text-left transition-all border ${
              filterPlan === 'free'
                ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 ring-1 ring-gray-300 dark:ring-gray-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Free</p>
            <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{freeCount}</p>
          </button>
          {PAID_PLANS.map(p => {
            const count = globalStats.planDistribution[p] || 0
            const meta = PLAN_META[p]
            return (
              <button
                key={p}
                onClick={() => setFilterPlan(filterPlan === p ? '' : p)}
                className={`relative rounded-xl p-3 text-left transition-all border ${
                  filterPlan === p
                    ? `${meta.bg} ${meta.border} ring-1 ring-current/20`
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</p>
                <p className={`text-xl font-bold ${meta.color}`}>{count}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 md:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Plan filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterPlan('')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  filterPlan === ''
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Semua
              </button>
              {PLANS.map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPlan(filterPlan === p ? '' : p)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    filterPlan === p
                      ? PLAN_CHIP_ACTIVE[p]
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="relative ml-auto">
              <select value={filterSuspended === undefined ? '' : filterSuspended ? 'true' : 'false'}
                onChange={e => setFilterSuspended(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[11px] font-semibold appearance-none pr-7">
                <option value="">Semua Status</option>
                <option value="false">Aktif</option>
                <option value="true">Suspended</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-4 py-4">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-56 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[1fr_120px_80px_80px_80px_100px_100px] gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
              <span>Tenant</span><span>Plan</span><span>Outlet</span><span>User</span><span>Status</span><span>Bergabung</span><span>Aksi</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {tenantsData?.tenants?.map(t => {
                const isFree = isFreeOrTrial(t.plan, t.is_trial)
                return (
                  <div key={t.id}
                    className={`w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-l-4 ${PLAN_BORDER_ACCENT[t.plan || 'free']}`}>
                    {/* Mobile */}
                    <div className="md:hidden px-4 py-3">
                      <button onClick={() => router.push(`/admin/tenants?id=${t.id}`)} className="w-full text-left">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                              {t.is_trial && <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[t.plan || 'free']}`}>
                              {(t.plan || 'free').charAt(0).toUpperCase() + (t.plan || 'free').slice(1)}
                            </span>
                            {t.is_suspended && <span className="w-2 h-2 rounded-full bg-red-500" />}
                          </div>
                        </div>
                      </button>
                      {isFree && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/tenants?id=${t.id}`)
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors">
                            <ArrowUpRight className="w-3 h-3" /> Upgrade
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-[1fr_120px_80px_80px_80px_100px_100px] gap-2 px-5 py-3 items-center">
                      <button onClick={() => router.push(`/admin/tenants?id=${t.id}`)} className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                          {t.is_trial && <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.email}</p>
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-center w-fit ${PLAN_COLORS[t.plan || 'free']}`}>
                        {(t.plan || 'free').charAt(0).toUpperCase() + (t.plan || 'free').slice(1)}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t.outletCount}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t.userCount}</span>
                      <span className={`text-xs font-medium ${t.is_suspended ? 'text-red-500' : 'text-emerald-500'}`}>
                        {t.is_suspended ? 'Suspended' : 'Aktif'}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(t.created_at)}</span>
                      <div>
                        {isFree ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/tenants?id=${t.id}`)
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-sm">
                            <ArrowUpRight className="w-3 h-3" /> Upgrade
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/tenants?id=${t.id}`)
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            Detail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!tenantsData?.tenants || tenantsData.tenants.length === 0) && (
                <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">Tidak ada tenant ditemukan</div>
              )}
            </div>
            {tenantsData && tenantsData.total > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                Menampilkan {tenantsData.tenants.length} dari {tenantsData.total} tenant
                {filterPlan && <span className="ml-2">• Filter: <span className="font-semibold">{filterPlan}</span></span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
