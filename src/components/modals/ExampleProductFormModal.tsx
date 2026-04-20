/**
 * Example: Heavy Product Form Modal Content (Lazy Loadable)
 *
 * This is a reference implementation showing how to create
 * lazy-loadable modal content with heavy dependencies.
 *
 * Usage in a page:
 * ```tsx
 * const ProductFormContent = lazy(() => import('@/components/modals/ExampleProductFormModal'))
 *
 * <LazyModal isOpen={isOpen} onClose={handleClose} title="Add Product" size="lg">
 *   <ProductFormContent onSubmit={handleSubmit} onCancel={handleClose} />
 * </LazyModal>
 * ```
 */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'

interface ProductFormModalProps {
  onSubmit: (data: any) => void | Promise<void>
  onCancel: () => void
  initialData?: {
    name?: string
    sku?: string
    price?: number
    stock?: number
    category?: string
    description?: string
  }
}

/**
 * Heavy form component that should be lazy-loaded
 * Contains:
 * - Complex form validation
 * - Multiple input types
 * - Potential integration with heavy libraries (date pickers, rich text editors, etc.)
 */
export default function ExampleProductFormModal({
  onSubmit,
  onCancel,
  initialData,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    price: initialData?.price || 0,
    stock: initialData?.stock || 0,
    category: initialData?.category || '',
    description: initialData?.description || '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required'
    }
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative'
    }
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          required
          fullWidth
        />

        <Input
          label="SKU"
          value={formData.sku}
          onChange={(e) => handleChange('sku', e.target.value)}
          error={errors.sku}
          required
          fullWidth
        />

        <Input
          label="Price (IDR)"
          type="number"
          value={formData.price}
          onChange={(e) => handleChange('price', Number(e.target.value))}
          error={errors.price}
          required
          fullWidth
        />

        <Input
          label="Stock"
          type="number"
          value={formData.stock}
          onChange={(e) => handleChange('stock', Number(e.target.value))}
          error={errors.stock}
          required
          fullWidth
        />

        <Select
          label="Category"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          error={errors.category}
          required
          fullWidth
          options={[
            { value: '', label: 'Select category' },
            { value: 'electronics', label: 'Electronics' },
            { value: 'clothing', label: 'Clothing' },
            { value: 'food', label: 'Food & Beverage' },
            { value: 'home', label: 'Home & Garden' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </div>

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => handleChange('description', e.target.value)}
        rows={4}
        fullWidth
        placeholder="Enter product description..."
      />

      {/* Info box about lazy loading */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <p className="text-xs text-blue-900 font-semibold mb-1">
          💡 Lazy Loading Optimization:
        </p>
        <p className="text-xs text-blue-800">
          This form is lazy-loaded only when the modal opens, reducing the initial bundle size.
          Heavy dependencies like date pickers, rich text editors, or complex validation libraries
          are only loaded when needed.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </form>
  )
}
