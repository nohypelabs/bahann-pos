'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { trpc } from '@/lib/trpc/client'

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

// ─── Super Admin View ──────────────────────────────────────────────────────────
function SuperAdminView() {
  const { data: admins, isLoading, refetch } = trpc.users.listAllAdmins.useQuery(undefined, { retry: false })
  const updatePlanMutation = trpc.users.updatePlan.useMutation({ onSuccess: () => refetch() })

  const [editing,      setEditing]      = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan>('free')
  const [amount,       setAmount]       = useState('')
  const [note,         setNote]         = useState('')
  const [saving,       setSaving]       = useState(false)
  const [savedId,      setSavedId]      = useState<string | null>(null)

  const handleEdit = (userId: string, currentPlan: string) => {
    setEditing(userId)
    setSelectedPlan((currentPlan || 'free') as Plan)
    setAmount('')
    setNote('')
    setSavedId(null)
  }

  const handleSave = async (userId: string) => {
    setSaving(true)
    try {
      await updatePlanMutation.mutateAsync({
        userId, plan: selectedPlan,
        amount: amount ? parseInt(amount.replace(/\D/g, ''), 10) : 0,
        note: note.trim() || undefined,
      })
      setSavedId(userId)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Manajemen Langganan"
        subtitle="Upgrade plan pelanggan setelah konfirmasi pembayaran transfer manual."
      />

      <SectionCard title="Semua Tenant (Admin)">
        {isLoading ? (
          <p className="text-center py-8 text-gray-400 text-sm">Memuat data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['Nama', 'Email', 'Plan Saat Ini', 'Daftar', 'Aksi'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {admins?.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 md:px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{user.name}</td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{user.email}</td>
                    <td className="px-3 md:px-4 py-3">
                      {savedId === user.id
                        ? <span className="text-green-600 dark:text-green-400 text-xs font-semibold">✅ Tersimpan</span>
                        : <PlanBadge plan={user.plan || 'free'} />}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-400">
                      {new Date(user.created_at || '').toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      {editing === user.id ? (
                        <div className="space-y-2 min-w-[260px]">
                          <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value as Plan)}
                            className="w-full px-3 py-1.5 text-xs border-2 border-green-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none">
                            {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                          <input type="text" placeholder="Nominal transfer (Rp) — opsional" value={amount} onChange={e => setAmount(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-400" />
                          <input type="text" placeholder="Catatan (misal: Transfer BNI dikonfirmasi)" value={note} onChange={e => setNote(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-400" />
                          <div className="flex gap-2">
                            <button onClick={() => handleSave(user.id)} disabled={saving}
                              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">
                              {saving ? '...' : '✓ Simpan'}
                            </button>
                            <button onClick={() => setEditing(null)}
                              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(user.id, user.plan || 'free')}
                          className="px-3 py-1.5 text-xs font-semibold border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-400 hover:text-green-600 transition-colors text-gray-600 dark:text-gray-400">
                          Ubah Plan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!admins?.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada tenant terdaftar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
        <strong>Cara pakai:</strong> Setelah customer konfirmasi transfer, cari emailnya → klik <em>Ubah Plan</em> → pilih plan → Simpan.
      </div>
    </div>
  )
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
            <div className="flex-shrink-0 mt-0.5 text-lg">
              {item.is_trial ? '🎁' : item.amount && item.amount > 0 ? '💳' : '📋'}
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
  const { data: planData, isLoading } = trpc.auth.getPlan.useQuery()
  const currentPlan  = planData?.plan || 'free'
  const currentIndex = PLANS.findIndex(p => p.value === currentPlan)

  const [requested, setRequested] = useState<string | null>(null)
  const [myEmail,   setMyEmail]   = useState('')

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (u.email) setMyEmail(u.email)
    } catch { /* ignore */ }
  }, [])

  const waNumber   = process.env.NEXT_PUBLIC_SUPPORT_WA || ''
  const bankName   = process.env.NEXT_PUBLIC_BANK_NAME || 'BCA'
  const bankAcct   = process.env.NEXT_PUBLIC_BANK_ACCOUNT || ''
  const bankHolder = process.env.NEXT_PUBLIC_BANK_HOLDER || 'Laku POS'

  const handleRequest = (plan: string, price: number) => {
    setRequested(plan)
    if (!waNumber) return
    const planLabel = PLANS.find(p => p.value === plan)?.label || plan
    const msg = encodeURIComponent(`Halo, saya ingin upgrade ke plan *${planLabel}* (${fmtRupiah(price)}/bulan).\n\nEmail akun saya: ${myEmail || '-'}\n\nMohon konfirmasi pembayaran. Terima kasih!`)
    window.open(`https://wa.me/${waNumber.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  if (isLoading) return <p className="text-center py-16 text-gray-400 text-sm">Memuat data plan...</p>

  return (
    <div className="space-y-4 md:space-y-6">
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

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {PLANS.map((plan, idx) => {
          const isCurrent   = plan.value === currentPlan
          const isDowngrade = idx < currentIndex
          const isEnterprise = plan.value === 'enterprise'

          return (
            <div key={plan.value}
              className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all ${
                isCurrent   ? `${plan.border} bg-white dark:bg-gray-900 shadow-md` :
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
                    <span className="text-green-500 text-xs">✓</span>{f}
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
                <button onClick={() => handleRequest(plan.value, plan.price as number)}
                  className={`py-2 text-center text-xs font-semibold rounded-xl transition-colors w-full ${
                    requested === plan.value
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-300'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}>
                  {requested === plan.value ? '✓ Permintaan Dikirim' : `Upgrade ke ${plan.label}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment Instructions */}
      <SectionCard title="Cara Berlangganan">
        <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center justify-center">1</span>
            <span>Pilih plan yang sesuai kebutuhan Anda, lalu klik tombol <strong>Upgrade</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center justify-center">2</span>
            <div>
              <span>Transfer pembayaran ke rekening berikut:</span>
              {bankAcct ? (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl font-mono text-sm border border-gray-200 dark:border-gray-600">
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">{bankName}</div>
                  <div className="text-gray-900 dark:text-gray-100 font-bold text-base tracking-wider">{bankAcct}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">a.n. {bankHolder}</div>
                </div>
              ) : (
                <span className="ml-2 text-amber-500 text-xs">(Rekening belum dikonfigurasi — hubungi admin)</span>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center justify-center">3</span>
            <span>Kirim bukti transfer via WhatsApp. Plan Anda akan diaktifkan dalam <strong>1×24 jam</strong>.</span>
          </li>
        </ol>
      </SectionCard>

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
