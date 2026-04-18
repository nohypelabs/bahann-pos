'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'

type UserRole = 'admin' | 'manager' | 'cashier' | 'user'

export default function UsersManagementPage() {
  const { data: users, refetch } = trpc.users.list.useQuery()
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<any>({})
  const [selectedRole, setSelectedRole] = useState<UserRole>('user')

  const updateMutation = trpc.users.updatePermissions.useMutation({
    onSuccess: () => {
      refetch()
      setEditingUser(null)
    },
  })

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      refetch()
      alert('Role updated successfully!')
    },
  })

  const handleSave = async (userId: string) => {
    try {
      // Get current user to check if role changed
      const currentUser = users?.find(u => u.id === userId)
      const roleChanged = currentUser && currentUser.role !== selectedRole

      // Update permissions
      await updateMutation.mutateAsync({ userId, permissions })

      // Update role if changed
      if (roleChanged) {
        await updateRoleMutation.mutateAsync({ userId, role: selectedRole })
      }

      alert('User updated successfully!')
      setEditingUser(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user.id)
    setPermissions(user.permissions || {})
    setSelectedRole(user.role || 'user')
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (confirm(`Ubah role user menjadi "${newRole.toUpperCase()}"?`)) {
      try {
        await updateRoleMutation.mutateAsync({ userId, role: newRole })
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to update role')
      }
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'admin': return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-300'
      case 'manager': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 border border-yellow-300'
      default: return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-300'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage user roles and permissions</p>
      </div>

      <Card variant="default" padding="lg">
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Email</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded font-semibold ${getRoleBadgeColor(user.role || 'user')}`}>
                      {user.role?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                      Edit Permissions
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" padding="lg" className="max-w-2xl w-full max-h-screen overflow-y-auto">
            <CardHeader><CardTitle>Edit User & Permissions</CardTitle></CardHeader>
            <CardBody>
              {/* Role Selector */}
              <div className="mb-6 pb-6 border-b-2 border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  User Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="user">👤 User (Kasir)</option>
                  <option value="manager">👔 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  💡 Admin memiliki akses penuh, Manager dapat melihat laporan, User hanya bisa transaksi sesuai permission
                </p>
              </div>

              {/* Permissions */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Permissions</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'canVoidTransactions', label: 'Void Transactions' },
                  { key: 'canGiveDiscount', label: 'Give Discount' },
                  { key: 'canCloseDay', label: 'Close Day (EOD)' },
                  { key: 'canManageUsers', label: 'Manage Users' },
                  { key: 'canEditPrices', label: 'Edit Prices' },
                  { key: 'canManagePromotions', label: 'Manage Promotions' },
                  { key: 'canViewReports', label: 'View Reports' },
                  { key: 'canManageInventory', label: 'Manage Inventory' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!permissions[key]}
                      onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2">Max Discount %</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded"
                  value={permissions.maxDiscountPercent || 0}
                  onChange={(e) => setPermissions({ ...permissions, maxDiscountPercent: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="primary" onClick={() => handleSave(editingUser)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
