'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { trpc } from '@/lib/trpc/client'
import { Search, Crown, Users, Shield, ChevronDown, CheckCircle2, XCircle, Info } from 'lucide-react'

type AlertState = { type: 'success' | 'error' | 'info'; msg: string } | null

const ROLES = [
  { value: 'user', label: 'Kasir', icon: '👤', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', desc: 'Transaksi sesuai permission' },
  { value: 'manager', label: 'Manager', icon: '👔', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', desc: 'Lihat laporan, kelola operasional' },
  { value: 'admin', label: 'Admin', icon: '👑', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', desc: 'Akses penuh tenant' },
  { value: 'super_admin', label: 'Super Admin', icon: '⚡', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', desc: 'Platform operator' },
] as const

const ROLE_COLORS: Record<string, string> = {
  user: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  manager: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
  admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
  super_admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
}

export default function AdminRolesPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [alert, setAlert] = useState<AlertState>(null)
  const [changingUserId, setChangingUserId] = useState<string | null>(null)

  const utils = trpc.useUtils()

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

  const flash = (type: NonNullable<AlertState>['type'], msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 4000)
  }

  const { data: usersData, isLoading } = trpc.superAdmin.listAllUsers.useQuery(
    { search: search || undefined, role: filterRole || undefined, limit: 100 },
    { enabled: userRole === 'super_admin' }
  )

  const updateRoleMutation = trpc.superAdmin.updateUserRole.useMutation({
    onSuccess: (data) => {
      flash('success', data.message)
      setChangingUserId(null)
      utils.superAdmin.listAllUsers.invalidate()
    },
    onError: (err) => flash('error', err.message || 'Gagal update role'),
  })

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole })
  }

  if (userRole !== 'super_admin') return null

  const users = usersData?.users || []
  const total = usersData?.total || 0

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl">
      <PageHeader
        title="Kelola Role"
        subtitle="Assign dan ubah role user di semua tenant"
      />

      {/* Alert */}
      {alert && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium ${
          alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
          : alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
        }`}>
          <span>{alert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : alert.type === 'error' ? <XCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}</span>
          {alert.msg}
        </div>
      )}

      {/* Role Legend */}
      <SectionCard title="Hierarki Role">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ROLES.map(r => (
            <div key={r.value} className={`p-3 rounded-xl border ${r.color}`}>
              <p className="text-sm font-bold">{r.icon} {r.label}</p>
              <p className="text-[11px] opacity-75 mt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Filters */}
      <SectionCard title="Filter">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
            >
              <option value="">Semua Role</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{total} user ditemukan</p>
      </SectionCard>

      {/* Users Table */}
      <SectionCard title="Daftar User">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada user ditemukan
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outlet</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role Saat Ini</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ubah Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            u.role === 'super_admin' ? 'bg-purple-100 text-purple-700'
                            : u.role === 'admin' ? 'bg-red-100 text-red-700'
                            : u.role === 'manager' ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}>
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{u.outlet?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                          {ROLES.find(r => r.value === u.role)?.label || u.role || 'Kasir'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {changingUserId === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <div className="relative">
                              <select
                                defaultValue={u.role || 'user'}
                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                className="appearance-none px-2 py-1.5 pr-7 text-xs border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400"
                              >
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>
                            <button onClick={() => setChangingUserId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setChangingUserId(u.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Ubah
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {users.map((u: any) => (
                <div key={u.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        u.role === 'super_admin' ? 'bg-purple-100 text-purple-700'
                        : u.role === 'admin' ? 'bg-red-100 text-red-700'
                        : u.role === 'manager' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                      {ROLES.find(r => r.value === u.role)?.label || 'Kasir'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">Role:</span>
                    <div className="relative flex-1">
                      <select
                        defaultValue={u.role || 'user'}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="w-full appearance-none px-2 py-1.5 pr-7 text-xs border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400"
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {u.outlet?.name && (
                    <p className="text-[11px] text-gray-400 mt-1.5">🏪 {u.outlet.name}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  )
}
