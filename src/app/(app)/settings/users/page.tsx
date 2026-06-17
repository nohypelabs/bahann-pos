'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'

const ROLES = [
  { key: 'ADMIN_TENANT', label: '👑 Admin Tenant', desc: 'Akses penuh semua outlet', scope: 'TENANT', icon: '👑' },
  { key: 'AREA_MANAGER', label: '📍 Area Manager', desc: 'Akses beberapa outlet (group)', scope: 'OUTLET_GROUP', icon: '📍' },
  { key: 'STORE_MANAGER', label: '🏪 Store Manager', desc: 'Kelola 1 outlet', scope: 'OUTLET', icon: '🏪' },
  { key: 'CASHIER', label: '👤 Kasir', desc: 'POS transaksi di 1 outlet', scope: 'OUTLET', icon: '👤' },
  { key: 'AUDITOR', label: '🔍 Auditor', desc: 'Read-only laporan & audit log', scope: 'TENANT', icon: '🔍' },
] as const

type RoleKey = typeof ROLES[number]['key']

function StyledSelect<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value as T)}
          className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
    </div>
  )
}

export default function UsersManagementPage() {
  const { showToast } = useToast()
  const { data: users, refetch } = trpc.users.list.useQuery()
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const { data: roles } = trpc.users.getRoles.useQuery()
  const { data: outletGroups } = trpc.users.getOutletGroups.useQuery()
  const outlets = outletsResponse?.outlets || []

  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [form, setForm] = useState({
    name: '', email: '', password: '', whatsappNumber: '',
    roleKey: 'CASHIER' as RoleKey,
    outletId: '', outletGroupId: '',
  })
  const [formError, setFormError] = useState('')

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      refetch()
      closeForm()
      showToast('Pengguna ditambahkan', 'success')
    },
    onError: err => setFormError(err.message),
  })

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      refetch()
      setEditingUser(null)
      showToast('Role diperbarui', 'success')
    },
    onError: err => showToast(err.message || 'Gagal memperbarui role. Periksa koneksi dan coba lagi.', 'error'),
  })

  const closeForm = () => {
    setShowAddUser(false)
    setForm({ name: '', email: '', password: '', whatsappNumber: '', roleKey: 'CASHIER', outletId: '', outletGroupId: '' })
    setFormError('')
  }

  const selectedRole = ROLES.find(r => r.key === form.roleKey)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!form.name || !form.email || !form.password) {
      setFormError('Nama, email, dan password wajib diisi')
      return
    }

    if (form.password.length < 8) {
      setFormError('Password minimal 8 karakter')
      return
    }

    await createUserMutation.mutateAsync({
      name: form.name,
      email: form.email,
      password: form.password,
      whatsappNumber: form.whatsappNumber || undefined,
      roleKey: form.roleKey,
      outletId: form.outletId || undefined,
      outletGroupId: form.outletGroupId || undefined,
    })
  }

  const handleUpdateRole = async (userId: string, roleKey: RoleKey, outletId?: string, outletGroupId?: string) => {
    await updateRoleMutation.mutateAsync({
      userId,
      roleKey,
      outletId: outletId || undefined,
      outletGroupId: outletGroupId || undefined,
    })
  }

  const getRoleBadge = (user: any) => {
    const rbacRole = user.rbac_roles?.[0]
    if (rbacRole) {
      const role = ROLES.find(r => r.key === rbacRole.role_key)
      return role ? `${role.icon} ${rbacRole.role_name}` : rbacRole.role_name
    }
    // Legacy fallback
    switch (user.role) {
      case 'admin': return '👑 Admin'
      case 'manager': return '👔 Manager'
      default: return '👤 Kasir'
    }
  }

  const getScopeInfo = (user: any) => {
    const rbacRole = user.rbac_roles?.[0]
    if (!rbacRole) return user.outlet_name || '—'
    switch (rbacRole.scope_type) {
      case 'TENANT': return 'Semua outlet'
      case 'OUTLET': return user.outlet_name || 'Outlet assigned'
      case 'OUTLET_GROUP': return `Group: ${rbacRole.outlet_group_id || '—'}`
      default: return '—'
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola akun tim dan hak akses"
        action={
          <Button variant="primary" onClick={() => setShowAddUser(true)}>
            + Tambah Pengguna
          </Button>
        }
      />

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Daftar Pengguna</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                {['Nama', 'Email', 'Role', 'Scope', 'Aksi'].map(h => (
                  <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users?.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{user.name}</td>
                  <td className="px-3 md:px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-3 md:px-4 py-3">
                    <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      {getRoleBadge(user)}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{getScopeInfo(user)}</td>
                  <td className="px-3 md:px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>Edit</Button>
                  </td>
                </tr>
              ))}
              {!users?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada pengguna</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <SectionCard title="Tambah Pengguna"
              action={<button onClick={closeForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <span>❌</span>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">{formError}</p>
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Role *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLES.map(role => (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, roleKey: role.key, outletId: '', outletGroupId: '' }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          form.roleKey === role.key
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-xl">{role.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{role.label}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">{role.desc}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          {role.scope}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outlet Selection (for OUTLET scope) */}
                {selectedRole?.scope === 'OUTLET' && (
                  <StyledSelect<string>
                    label="Outlet *"
                    value={form.outletId}
                    onChange={v => setForm(f => ({ ...f, outletId: v }))}
                    options={[
                      { value: '', label: 'Pilih outlet…' },
                      ...outlets.map(o => ({ value: o.id, label: o.name })),
                    ]}
                  />
                )}

                {/* Outlet Group Selection (for OUTLET_GROUP scope) */}
                {selectedRole?.scope === 'OUTLET_GROUP' && (
                  <div>
                    <StyledSelect<string>
                      label="Outlet Group *"
                      value={form.outletGroupId}
                      onChange={v => setForm(f => ({ ...f, outletGroupId: v }))}
                      options={[
                        { value: '', label: 'Pilih outlet group…' },
                        ...(outletGroups || []).map(g => ({ value: g.id, label: `${g.name} (${g.outlet_ids.length} outlet)` })),
                      ]}
                    />
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Outlet group mengelompokkan beberapa outlet untuk Area Manager
                    </p>
                  </div>
                )}

                {/* User Info */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Input type="text" label="Nama *" placeholder="Nama lengkap"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth required />
                  <Input type="email" label="Email *" placeholder="email@example.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} fullWidth required />
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nomor WhatsApp</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm select-none">+62</span>
                      <input type="tel" placeholder="8123456789"
                        value={form.whatsappNumber}
                        onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                        className="w-full pl-12 pr-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <Input type="password" label="Password *" placeholder="Minimal 8 karakter"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} fullWidth required />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" variant="primary" fullWidth disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Menyimpan…' : 'Tambah Pengguna'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
                </div>
              </form>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <SectionCard title={`Edit: ${editingUser.name}`}
              action={<button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Ubah role dan scope pengguna. Permission otomatis sesuai role.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLES.map(role => {
                      const isCurrentRole = editingUser.rbac_roles?.[0]?.role_key === role.key
                      return (
                        <button
                          key={role.key}
                          type="button"
                          onClick={() => handleUpdateRole(editingUser.id, role.key, editingUser.outlet_id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            isCurrentRole
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <span className="text-xl">{role.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{role.label}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{role.desc}</p>
                          </div>
                          {isCurrentRole && <span className="text-xs text-blue-500 font-semibold">✓ Aktif</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingUser(null)} fullWidth>Tutup</Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
