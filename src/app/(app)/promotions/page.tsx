'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'

const EMPTY_FORM = {
  code: '', name: '', type: 'percentage' as 'fixed' | 'percentage',
  discountAmount: 0, discountPercentage: 0, minPurchase: 0, maxDiscount: 0,
}

export default function PromotionsPage() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const { showToast } = useToast()

  const { data: promos, refetch } = trpc.promotions.list.useQuery({ activeOnly: false })
  const createMutation = trpc.promotions.create.useMutation({
    onSuccess: () => {
      refetch()
      setShowForm(false)
      setFormData(EMPTY_FORM)
      showToast('Promosi berhasil dibuat!', 'success')
    },
  })

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat promosi', 'error')
    }
  }

  const field = (key: keyof typeof formData, val: string | number) =>
    setFormData(prev => ({ ...prev, [key]: val }))

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Promosi"
        subtitle="Kelola kode diskon dan promosi"
        action={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Batal' : '+ Buat Promosi'}
          </Button>
        }
      />

      {showForm && (
        <SectionCard title="Buat Promosi Baru">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Kode Promo *" value={formData.code}
              onChange={e => field('code', e.target.value.toUpperCase())} fullWidth />
            <Input label="Nama Promosi *" value={formData.name}
              onChange={e => field('name', e.target.value)} fullWidth />

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tipe Diskon</label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={e => field('type', e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                >
                  <option value="fixed">Potongan Tetap (Rp)</option>
                  <option value="percentage">Persentase (%)</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
            </div>

            {formData.type === 'fixed' ? (
              <Input type="number" label="Jumlah Diskon (Rp)" value={formData.discountAmount}
                onChange={e => field('discountAmount', parseFloat(e.target.value) || 0)} fullWidth />
            ) : (
              <Input type="number" label="Diskon (%)" value={formData.discountPercentage}
                onChange={e => field('discountPercentage', parseFloat(e.target.value) || 0)} fullWidth />
            )}

            <Input type="number" label="Min. Pembelian (Rp)" value={formData.minPurchase}
              onChange={e => field('minPurchase', parseFloat(e.target.value) || 0)} fullWidth />
            <Input type="number" label="Maks. Diskon (Rp)" value={formData.maxDiscount}
              onChange={e => field('maxDiscount', parseFloat(e.target.value) || 0)} fullWidth />
          </div>

          <div className="mt-4">
            <Button variant="primary" onClick={handleCreate} disabled={createMutation.isPending || !formData.code || !formData.name}>
              {createMutation.isPending ? 'Menyimpan…' : '✅ Buat Promosi'}
            </Button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Daftar Promosi">
        {!promos || promos.length === 0 ? (
          <EmptyState icon="🏷️" title="Belum ada promosi" description="Buat promosi pertama kamu untuk mulai memberikan diskon." />
        ) : (
          <div className="space-y-2">
            {promos.map(promo => (
              <div key={promo.id} className="flex items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white font-mono">{promo.code}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      promo.is_active
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {promo.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{promo.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {promo.type === 'fixed'
                      ? formatCurrency(promo.discount_amount || 0)
                      : `${promo.discount_percentage}% off`}
                    {promo.min_purchase ? ` · Min: ${formatCurrency(promo.min_purchase)}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dipakai</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{promo.uses_count}×</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
