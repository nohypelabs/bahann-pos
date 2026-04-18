'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'

type UserRole = 'admin' | 'manager' | 'cashier' | 'user'

export default function UsersManagementPage() {
  const { data: users, refetch } = trpc.users.list.useQuery()
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets || []

  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<any>({})
  const [selectedRole, setSelectedRole] = useState<UserRole>('user')
  const [showAddCashier, setShowAddCashier] = useState(false)
  const [cashierForm, setCashierForm] = useState({
    name: '', email: '', password: '', whatsappNumber: '', outletId: '',
  })
  const [cashierError, setCashierError] = useState('')

  const updateMutation = trpc.users.updatePermissions.useMutation({ onSuccess: () => { refetch(); setEditingUser(null) } })
  const updateRoleMutation = trpc.users.updateRole.useMutation({ onSuccess: () => refetch() })
  const createCashierMutation = trpc.users.createCashier.useMutation({
    onSuccess: () => {
      refetch()
      setShowAddCashier(false)
      setCashierForm({ name: '', email: '', password: '', whatsappNumber: '', outletId: '' })
      setCashierError('')
    },
    onError: (err) => setCashierError(err.message),
  })

  const handleSave = async (userId: string) => {
    try {
      const currentUser = users?.find(u => u.id === userId)
      await updateMutation.mutateAsync({ userId, permissions })
      if (currentUser && currentUser.role !== selectedRole) {
        await updateRoleMutation.mutateAsync({ userId, role: selectedRole })
      }
      setEditingUser(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal update user')
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user.id)
    setPermissions(user.permissions || {})
    setSelectedRole(user.role || 'user')
  }

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault()
    setCashierError('')
    if (!cashierForm.outletId) { setCashierError('Pilih outlet terlebih dahulu'); return }
    await createCashierMutation.mutateAsync(cashierForm)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-300'
      case 'manager': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-300'
      default: return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-300'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '👑 Admin'
      case 'manager': return '👔 Manager'
      default: return '👤 Kasir'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Manajemen Pengguna</h1>
          <p className="text-gray-600 dark:text-gray-400">Kelola kasir dan hak akses</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddCashier(true)}>
          + Tambah Kasir
        </Button>
      </div>

      <Card variant="default" padding="lg">
        <CardHeader><CardTitle>Daftar Pengguna</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Nama</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Email</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Outlet</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users?.map((user) => {
                const outletName = outlets.find(o => o.id === user.outlet_id)?.name || '-'
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded font-semibold ${getRoleBadgeColor(user.role || 'user')}`}>
                        {getRoleLabel(user.role || 'user')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{outletName}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {!users?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Belum ada pengguna
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Add Cashier Modal */}
      {showAddCashier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" padding="lg" className="max-w-md w-full">
            <CardHeader><CardTitle>Tambah Kasir</CardTitle></CardHeader>
            <CardBody>
              <form onSubmit={handleAddCashier} className="space-y-4">
                {cashierError && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-sm font-semibold text-red-600">❌ {cashierError}</p>
                  </div>
                )}

                <Input
                  type="text"
                  label="Nama Kasir"
                  placeholder="Nama lengkap"
                  value={cashierForm.name}
                  onChange={e => setCashierForm({ ...cashierForm, name: e.target.value })}
                  fullWidth
                  required
                />

                <Input
                  type="email"
                  label="Email"
                  placeholder="email@kasir.com"
                  value={cashierForm.email}
                  onChange={e => setCashierForm({ ...cashierForm, email: e.target.value })}
                  fullWidth
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nomor WhatsApp *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none">+62</span>
                    <input
                      type="tel"
                      placeholder="8123456789"
                      value={cashierForm.whatsappNumber}
                      onChange={e => setCashierForm({ ...cashierForm, whatsappNumber: e.target.value })}
                      className="w-full pl-14 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      required
                    />
                  </div>
                </div>

                <Input
                  type="password"
                  label="Password"
                  placeholder="Minimal 8 karakter"
                  value={cashierForm.password}
                  onChange={e => setCashierForm({ ...cashierForm, password: e.target.value })}
                  fullWidth
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Outlet *</label>
                  <select
                    value={cashierForm.outletId}
                    onChange={e => setCashierForm({ ...cashierForm, outletId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    required
                  >
                    <option value="">Pilih outlet...</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={createCashierMutation.isPending}
                  >
                    {createCashierMutation.isPending ? 'Menyimpan...' : 'Tambah Kasir'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAddCashier(false); setCashierError('') }}>
                    Batal
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" padding="lg" className="max-w-2xl w-full max-h-screen overflow-y-auto">
            <CardHeader><CardTitle>Edit Pengguna & Hak Akses</CardTitle></CardHeader>
            <CardBody>
              <div className="mb-6 pb-6 border-b-2 border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 transition-all"
                >
                  <option value="user">👤 Kasir</option>
                  <option value="manager">👔 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Admin: akses penuh · Manager: lihat laporan · Kasir: transaksi sesuai permission
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Permission Khusus</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'canVoidTransactions', label: 'Void Transaksi' },
                  { key: 'canGiveDiscount', label: 'Beri Diskon' },
                  { key: 'canCloseDay', label: 'Tutup Hari (EOD)' },
                  { key: 'canManageUsers', label: 'Kelola Pengguna' },
                  { key: 'canEditPrices', label: 'Edit Harga' },
                  { key: 'canManagePromotions', label: 'Kelola Promo' },
                  { key: 'canViewReports', label: 'Lihat Laporan' },
                  { key: 'canManageInventory', label: 'Kelola Inventori' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!permissions[key]}
                      onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Maks Diskon %</label>
                <input
                  type="number"
                  className="w-full p-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={permissions.maxDiscountPercent || 0}
                  onChange={(e) => setPermissions({ ...permissions, maxDiscountPercent: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="primary" onClick={() => handleSave(editingUser)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)}>Batal</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
