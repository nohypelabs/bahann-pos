'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function PromotionsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percentage' as 'fixed' | 'percentage',
    discountAmount: 0,
    discountPercentage: 0,
    minPurchase: 0,
    maxDiscount: 0,
  })

  const { data: promos, refetch } = trpc.promotions.list.useQuery({ activeOnly: false })
  const createMutation = trpc.promotions.create.useMutation({ onSuccess: () => {
    refetch()
    setShowCreateForm(false)
    setFormData({ code: '', name: '', type: 'percentage', discountAmount: 0, discountPercentage: 0, minPurchase: 0, maxDiscount: 0 })
  }})

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData)
      alert('Promotion created successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create promotion')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Promotions</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage discount codes and promotions</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Create Promotion'}
        </Button>
      </div>

      {showCreateForm && (
        <Card variant="elevated" padding="lg">
          <CardHeader><CardTitle>Create New Promotion</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} fullWidth />
              <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth />
              <Select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} options={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage', label: 'Percentage' },
              ]} fullWidth />
              {formData.type === 'fixed' ? (
                <Input type="number" label="Discount Amount" value={formData.discountAmount} onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) })} fullWidth />
              ) : (
                <Input type="number" label="Discount %" value={formData.discountPercentage} onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })} fullWidth />
              )}
              <Input type="number" label="Min Purchase" value={formData.minPurchase} onChange={(e) => setFormData({ ...formData, minPurchase: parseFloat(e.target.value) })} fullWidth />
              <Input type="number" label="Max Discount" value={formData.maxDiscount} onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })} fullWidth />
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Promotion'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card variant="default" padding="lg">
        <CardHeader><CardTitle>Active Promotions</CardTitle></CardHeader>
        <CardBody>
          <div className="space-y-3">
            {promos?.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border">
                <div>
                  <p className="font-bold text-lg">{promo.code}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{promo.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {promo.type === 'fixed' ? formatCurrency(promo.discount_amount || 0) : `${promo.discount_percentage}% off`}
                    {promo.min_purchase ? ` • Min: ${formatCurrency(promo.min_purchase)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">Uses: {promo.uses_count}</p>
                  <span className={`px-2 py-1 rounded text-xs ${promo.is_active ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                    {promo.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
