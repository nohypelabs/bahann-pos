'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import type { Outlet } from '@/types'
import { useToast } from '@/components/ui/Toast'

export default function OutletsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null)
  const { showToast } = useToast()

  const { data: outletsResponse, isLoading, refetch } = trpc.outlets.getAll.useQuery()

  const outlets = outletsResponse?.outlets || []
  const pagination = outletsResponse?.pagination

  const deleteOutlet = trpc.outlets.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" outlet?`)) {
      try {
        await deleteOutlet.mutateAsync({ id })
        showToast('Outlet deleted successfully!', 'success')
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete outlet'
        showToast(errorMessage, 'error')
      }
    }
  }

  const handleAddNew = () => {
    setEditingOutlet(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">🏪 Outlets Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your store locations</p>
        </div>
        <Button variant="primary" size="lg" onClick={handleAddNew}>
          ➕ Add Outlet
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Outlets</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{outlets?.length || 0}</p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600">{outlets?.length || 0}</p>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Locations</p>
            <p className="text-3xl font-bold text-blue-600">{outlets?.length || 0}</p>
          </div>
        </Card>
      </div>

      {/* Outlets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-gray-900"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading outlets...</p>
          </div>
        ) : !outlets || outlets.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Outlets Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Start by adding your first outlet/store location.</p>
            <Button variant="primary" onClick={handleAddNew}>
              Add First Outlet
            </Button>
          </div>
        ) : (
          outlets.map((outlet) => (
            <Card key={outlet.id} variant="elevated" padding="lg">
              <div className="space-y-4">
                {/* Outlet Icon */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl mx-auto">
                  🏪
                </div>

                {/* Outlet Name */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{outlet.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{outlet.id}</p>
                </div>

                {/* Created Date */}
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    Created:{' '}
                    {new Date(outlet.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(outlet)} fullWidth>
                    ✏️ Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(outlet.id, outlet.name)}
                    fullWidth
                    disabled={deleteOutlet.isPending}
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Outlet Form Modal */}
      {isModalOpen && (
        <OutletFormModal
          outlet={editingOutlet}
          onClose={() => {
            setIsModalOpen(false)
            setEditingOutlet(null)
          }}
          onSuccess={() => {
            refetch()
            setIsModalOpen(false)
            setEditingOutlet(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Outlet Form Modal Component
 */
interface OutletFormModalProps {
  outlet: Outlet | null
  onClose: () => void
  onSuccess: () => void
}

function OutletFormModal({ outlet, onClose, onSuccess }: OutletFormModalProps) {
  const [name, setName] = useState(outlet?.name || '')
  const { showToast } = useToast()

  const createOutlet = trpc.outlets.create.useMutation()
  const updateOutlet = trpc.outlets.update.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (outlet) {
        // Update existing outlet
        await updateOutlet.mutateAsync({
          id: outlet.id,
          name,
        })
        showToast('Outlet updated successfully!', 'success')
      } else {
        // Create new outlet
        await createOutlet.mutateAsync({ name })
        showToast('Outlet created successfully!', 'success')
      }

      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      showToast(errorMessage, 'error')
    }
  }

  const isLoading = createOutlet.isPending || updateOutlet.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{outlet ? 'Edit Outlet' : 'Add New Outlet'}</CardTitle>
            <button onClick={onClose} className="text-2xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300">
              ✕
            </button>
          </div>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Outlet Name *"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., OTISTA Branch, BSD Store"
              fullWidth
              required
            />

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} fullWidth disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                {isLoading ? 'Saving...' : outlet ? 'Update Outlet' : 'Create Outlet'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
