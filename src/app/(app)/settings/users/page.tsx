'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'

type UserRole = 'admin' | 'manager' | 'cashier' | 'user'

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700',
  manager: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
  default: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700',
}
const ROLE_LABEL: Record<string, string> = { admin: '👑 Admin', manager: '👔 Manager', default: '👤 Kasir' }

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

const PERMISSIONS = [
  { key: 'canVoidTransactions', label: 'Void Transaksi' },
  { key: 'canGiveDiscount',     label: 'Beri Diskon' },
  { key: 'canCloseDay',         label: 'Tutup Hari (EOD)' },
  { key: 'canManageUsers',      label: 'Kelola Pengguna' },
  { key: 'canEditPrices',       label: 'Edit Harga' },
  { key: 'canManagePromotions', label: 'Kelola Promo' },
  { key: 'canViewReports',      label: 'Lihat Laporan' },
  { key: 'canManageInventory',  label: 'Kelola Inventori' },
]

export default function UsersManagementPage() {
  const { showToast } = useToast()
  const { data: users, refetch } = trpc.users.list.useQuery()
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets || []

  const [editingUser,   setEditingUser]   = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [permissions,   setPermissions]   = useState<any>({})
  const [selectedRole,  setSelectedRole]  = useState<UserRole>('user')
  const [showAddCashier, setShowAddCashier] = useState(false)
  const [cashierForm,   setCashierForm]   = useState({ name: '', email: '', password: '', whatsappNumber: '', outletId: '' })
  const [cashierError,  setCashierError]  = useState('')

  const updateMutation       = trpc.users.updatePermissions.useMutation({ onSuccess: () => { refetch(); setEditingUser(null) } })
  const updateRoleMutation   = trpc.users.updateRole.useMutation({ onSuccess: () => refetch() })
  const createCashierMutation = trpc.users.createCashier.useMutation({
    onSuccess: () => {
      refetch()
      setShowAddCashier(false)
      setCashierForm({ name: '', email: '', password: '', whatsappNumber: '', outletId: '' })
      setCashierError('')
      showToast('Kasir berhasil ditambahkan!', 'success')
    },
    onError: err => setCashierError(err.message),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (user: any) => {
    setEditingUser(user.id)
    setPermissions(user.permissions || {})
    setSelectedRole(user.role || 'user')
  }

  const handleSave = async (userId: string) => {
    try {
      const currentUser = users?.find(u => u.id === userId)
      await updateMutation.mutateAsync({ userId, permissions })
      if (currentUser && currentUser.role !== selectedRole) {
        await updateRoleMutation.mutateAsync({ userId, role: selectedRole })
      }
      showToast('Pengguna berhasil diperbarui', 'success')
      setEditingUser(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal update pengguna', 'error')
    }
  }

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault()
    setCashierError('')
    if (!cashierForm.outletId) { setCashierError('Pilih outlet terlebih dahulu'); return }
    await createCashierMutation.mutateAsync(cashierForm)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola kasir dan hak akses"
        action={<Button variant="primary" onClick={() => setShowAddCashier(true)}>+ Tambah Kasir</Button>}
      />

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Daftar Pengguna</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                {['Nama', 'Email', 'Role', 'Outlet', 'Aksi'].map(h => (
                  <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users?.map(user => {
                const outletName = outlets.find(o => o.id === user.outlet_id)?.name || '—'
                const roleKey = user.role === 'admin' || user.role === 'manager' ? user.role : 'default'
                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{user.name}</td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{user.email}</td>
                    <td className="px-3 md:px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${ROLE_BADGE[roleKey]}`}>
                        {ROLE_LABEL[roleKey]}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{outletName}</td>
                    <td className="px-3 md:px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>Edit</Button>
                    </td>
                  </tr>
                )
              })}
              {!users?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada pengguna</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cashier Modal */}
      {showAddCashier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <SectionCard title="Tambah Kasir"
              action={<button onClick={() => { setShowAddCashier(false); setCashierError('') }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>}
            >
              <form onSubmit={handleAddCashier} className="space-y-3">
                {cashierError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <span>❌</span>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">{cashierError}</p>
                  </div>
                )}

                <Input type="text" label="Nama Kasir *" placeholder="Nama lengkap"
                  value={cashierForm.name} onChange={e => setCashierForm(f => ({ ...f, name: e.target.value }))} fullWidth required />
                <Input type="email" label="Email *" placeholder="email@kasir.com"
                  value={cashierForm.email} onChange={e => setCashierForm(f => ({ ...f, email: e.target.value }))} fullWidth required />

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nomor WhatsApp *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm select-none">+62</span>
                    <input type="tel" placeholder="8123456789"
                      value={cashierForm.whatsappNumber}
                      onChange={e => setCashierForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                      className="w-full pl-12 pr-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <Input type="password" label="Password *" placeholder="Minimal 8 karakter"
                  value={cashierForm.password} onChange={e => setCashierForm(f => ({ ...f, password: e.target.value }))} fullWidth required />

                <StyledSelect<string>
                  label="Outlet *"
                  value={cashierForm.outletId}
                  onChange={v => setCashierForm(f => ({ ...f, outletId: v }))}
                  options={[{ value: '', label: 'Pilih outlet…' }, ...outlets.map(o => ({ value: o.id, label: o.name }))]}
                />

                <div className="flex gap-2 pt-1">
                  <Button type="submit" variant="primary" fullWidth disabled={createCashierMutation.isPending}>
                    {createCashierMutation.isPending ? 'Menyimpan…' : 'Tambah Kasir'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowAddCashier(false); setCashierError('') }}>
                    Batal
                  </Button>
                </div>
              </form>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <SectionCard title="Edit Pengguna & Hak Akses"
              action={<button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>}
            >
              <div className="space-y-5">
                <div>
                  <StyledSelect<UserRole>
                    label="Role"
                    value={selectedRole}
                    onChange={setSelectedRole}
                    options={[
                      { value: 'user',    label: '👤 Kasir' },
                      { value: 'manager', label: '👔 Manager' },
                      { value: 'admin',   label: '👑 Admin' },
                    ]}
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Admin: akses penuh · Manager: lihat laporan · Kasir: transaksi sesuai permission
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Permission Khusus</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSIONS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!permissions[key]}
                          onChange={e => setPermissions((p: Record<string, unknown>) => ({ ...p, [key]: e.target.checked }))}
                          className="w-4 h-4 accent-blue-500 rounded" />
                        <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Maks Diskon (%)</label>
                  <input type="number"
                    value={permissions.maxDiscountPercent || 0}
                    onChange={e => setPermissions((p: Record<string, unknown>) => ({ ...p, maxDiscountPercent: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => handleSave(editingUser)} disabled={updateMutation.isPending} fullWidth>
                    {updateMutation.isPending ? 'Menyimpan…' : '✅ Simpan'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingUser(null)}>Batal</Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
