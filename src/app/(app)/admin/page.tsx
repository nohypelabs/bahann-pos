'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import {
  Users, Store, Package, CreditCard,
  TrendingUp, AlertTriangle, ShoppingCart, UserPlus,
} from 'lucide-react'

function StatCard({ label, value, icon, color = 'blue', loading }: {
  label: string; value: string | number; icon: ReactNode; color?: string; loading?: boolean
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
  }

  return (
    <div className="glass-surface bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          {loading ? (
            <div className="h-7 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} text-white flex-shrink-0`}>
          <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
        </div>
      </div>
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  warung: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  starter: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  professional: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  business: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  enterprise: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const u = JSON.parse(user)
        if (u.role !== 'super_admin') {
          router.push('/dashboard')
          return
        }
        setUserRole(u.role)
      } catch {
        router.push('/dashboard')
      }
    }
  }, [router])

  const { data: stats, isLoading } = trpc.superAdmin.globalStats.useQuery(undefined, {
    enabled: userRole === 'super_admin',
  })

  const { data: growthData } = trpc.superAdmin.getGrowthChart.useQuery({ days: 30 }, {
    enabled: userRole === 'super_admin',
  })

  const { data: tenantsData } = trpc.superAdmin.listTenants.useQuery({ limit: 5 }, {
    enabled: userRole === 'super_admin',
  })

  if (userRole !== 'super_admin') return null

  const fmtNumber = (n: number) => n.toLocaleString('id-ID')
  const fmtCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Panel</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform management dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total Tenant" value={fmtNumber(stats?.totalTenants ?? 0)} icon={<Users />} color="blue" loading={isLoading} />
        <StatCard label="Baru Bulan Ini" value={fmtNumber(stats?.newTenantsThisMonth ?? 0)} icon={<UserPlus />} color="green" loading={isLoading} />
        <StatCard label="Total Outlet" value={fmtNumber(stats?.totalOutlets ?? 0)} icon={<Store />} color="purple" loading={isLoading} />
        <StatCard label="Total Produk" value={fmtNumber(stats?.totalProducts ?? 0)} icon={<Package />} color="orange" loading={isLoading} />
        <StatCard label="Total User" value={fmtNumber(stats?.totalUsers ?? 0)} icon={<Users />} color="cyan" loading={isLoading} />
        <StatCard label="Total Transaksi" value={fmtNumber(stats?.totalTransactions ?? 0)} icon={<ShoppingCart />} color="indigo" loading={isLoading} />
        <StatCard label="Revenue" value={fmtCurrency(stats?.totalRevenue ?? 0)} icon={<CreditCard />} color="pink" loading={isLoading} />
        <StatCard label="Suspended" value={fmtNumber(stats?.suspendedTenants ?? 0)} icon={<AlertTriangle />} color="red" loading={isLoading} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Plan Distribution */}
        <div className="glass-surface bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Distribusi Plan</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(stats?.planDistribution ?? {})
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const total = stats?.totalTenants || 1
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={plan} className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold min-w-[70px] text-center ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[50px] text-right">{count} ({pct}%)</span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Growth Chart (simple text-based) */}
        <div className="glass-surface bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Pertumbuhan Tenant (30 Hari)</h2>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          {growthData && growthData.length > 0 ? (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {growthData.filter(d => d.newTenants > 0).length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Belum ada tenant baru 30 hari terakhir</p>
              ) : (
                growthData.filter(d => d.newTenants > 0).map(d => (
                  <div key={d.date} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{d.newTenants}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">({d.totalTenants} total)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-6 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tenants */}
      <div className="glass-surface bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Tenant Terbaru</h2>
          <button onClick={() => router.push('/admin/tenants')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Lihat Semua
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {tenantsData?.tenants?.map(tenant => (
            <button key={tenant.id} onClick={() => router.push(`/admin/tenants?id=${tenant.id}`)}
              className="w-full flex items-center justify-between px-4 md:px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tenant.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tenant.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[tenant.plan || 'free'] || PLAN_COLORS.free}`}>
                  {(tenant.plan || 'free').charAt(0).toUpperCase() + (tenant.plan || 'free').slice(1)}
                </span>
                {tenant.is_suspended && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">Suspended</span>
                )}
                <span className="text-xs text-gray-400">{tenant.outletCount} outlet</span>
              </div>
            </button>
          ))}
          {(!tenantsData?.tenants || tenantsData.tenants.length === 0) && (
            <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">Belum ada tenant</div>
          )}
        </div>
      </div>
    </div>
  )
}
