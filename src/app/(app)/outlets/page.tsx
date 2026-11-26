'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { getLimits } from '@/lib/plans'
import type { Outlet } from '@/types'
import { Store, CheckCircle, MapPin, Plus, Pencil, Trash2, X } from 'lucide-react'
import { friendlyError } from '@/lib/errors/friendlyError'

// ─── Modal ───────────────────────────────────────────────────────────────────
function OutletFormModal({ outlet, onClose, onSuccess }: {
  outlet: Outlet | null; onClose: () => void; onSuccess: () => void
}) {
  const [name, setName] = useState(outlet?.name || '')
  const { showToast } = useToast()
  const createOutlet = trpc.outlets.create.useMutation()
  const updateOutlet = trpc.outlets.update.useMutation()
  const isPending = createOutlet.isPending || updateOutlet.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (outlet) {
        await updateOutlet.mutateAsync({ id: outlet.id, name })
        showToast('Outlet berhasil diperbarui!', 'success')
      } else {
        await createOutlet.mutateAsync({ name })
        showToast('Outlet berhasil dibuat!', 'success')
      }
      onSuccess()
    } catch (err) {
      showToast(friendlyError(err, 'Operasi gagal'), 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md">
        <SectionCard
          title={outlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}
          action={<button onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><X className="w-5 h-5" /></button>}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nama Outlet *" type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="contoh: Cabang Sudirman, Toko BSD" fullWidth required />
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} fullWidth disabled={isPending}>Batal</Button>
              <Button type="submit" variant="primary" fullWidth disabled={isPending}>
                {isPending ? 'Menyimpan…' : outlet ? 'Update Outlet' : 'Buat Outlet'}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OutletsPage() {
  const [isModalOpen, setIsModalOpen]           = useState(false)
  const [editingOutlet, setEditingOutlet]       = useState<Outlet | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { showToast } = useToast()

  const { data: planData }                                        = trpc.auth.getPlan.useQuery()
  const { data: outletsResponse, isLoading, refetch }            = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets || []
  const limits  = getLimits(planData?.plan ?? 'free')

  const deleteOutlet = trpc.outlets.delete.useMutation({ onSuccess: () => refetch() })

  const handleEdit = (outlet: Outlet) => { setEditingOutlet(outlet); setIsModalOpen(true) }
  const handleAddNew = () => {
    if (outlets.length >= limits.maxOutlets) {
      setShowUpgradeModal(true)
      return
    }
    setEditingOutlet(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus outlet "${name}"? Aksi ini tidak bisa dibatalkan.`)) return
    try {
      await deleteOutlet.mutateAsync({ id })
      showToast('Outlet berhasil dihapus', 'success')
    } catch (err) {
      showToast(friendlyError(err, 'Gagal menghapus outlet'), 'error')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Manajemen Outlet"
        subtitle="Kelola lokasi toko kamu"
        action={<Button variant="primary" onClick={handleAddNew}><Plus className="w-4 h-4 mr-1" /> Tambah Outlet</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
        <StatCard icon={<Store />} label="Total Outlet" value={outlets.length} color="gray" />
        <StatCard icon={<CheckCircle />} label="Aktif"         value={outlets.length} color="green" />
        <StatCard icon={<MapPin />} label="Lokasi"        value={outlets.length} color="blue" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : outlets.length === 0 ? (
        <SectionCard>
          <EmptyState icon={<Store />} title="Belum ada outlet" description="Mulai dengan menambahkan lokasi toko pertama kamu."
            action={<Button variant="primary" onClick={handleAddNew}>Tambah Outlet Pertama</Button>} />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {outlets.map(outlet => (
            <div key={outlet.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex items-center justify-center text-white">
                  <Store className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white">{outlet.name}</p>
                  <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">{outlet.id.slice(0, 8)}…</p>
                </div>
                <span className="px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                  AKTIF
                </span>
              </div>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Dibuat {new Date(outlet.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button variant="secondary" size="sm" onClick={() => handleEdit(outlet)} fullWidth><Pencil className="w-3.5 h-3.5 inline mr-0.5" /> Edit</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(outlet.id, outlet.name)} fullWidth disabled={deleteOutlet.isPending}>
                  <Trash2 className="w-3.5 h-3.5 inline mr-0.5" /> Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <OutletFormModal
          outlet={editingOutlet}
          onClose={() => { setIsModalOpen(false); setEditingOutlet(null) }}
          onSuccess={() => { refetch(); setIsModalOpen(false); setEditingOutlet(null) }}
        />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="outlets"
        currentPlan={planData?.plan ?? 'free'}
        currentUsage={{ used: outlets.length, max: limits.maxOutlets }}
      />
    </div>
  )
}
