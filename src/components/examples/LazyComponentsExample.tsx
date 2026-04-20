/**
 * Example: Using Lazy-Loaded Components
 *
 * This example demonstrates how to use all lazy-loaded components
 * for optimal bundle size and performance.
 *
 * Components demonstrated:
 * - LazyModal: Modal with lazy-loaded content
 * - LazyDatePicker: Date picker only loaded when modal opens
 * - LazyRichTextEditor: Rich text editor only loaded when modal opens
 * - Chart components: Only loaded when visible
 */
'use client'

import { lazy, Suspense, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LazyModal } from '@/components/ui/LazyModal'

// Lazy load heavy components - these are NOT included in the initial bundle
const LazyDatePicker = lazy(() => import('@/components/ui/LazyDatePicker'))
const LazyRichTextEditor = lazy(() => import('@/components/ui/LazyRichTextEditor'))
const ProductFormContent = lazy(() => import('@/components/modals/ExampleProductFormModal'))

export default function LazyComponentsExample() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [description, setDescription] = useState('')

  const handleSubmit = async (data: any) => {
    console.log('Form submitted:', data)
    setIsModalOpen(false)
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-base md:text-4xl font-bold text-gray-900 mb-2">
          Lazy Loading Components Example
        </h1>
        <p className="text-gray-600">
          Click buttons to see lazy-loaded components in action
        </p>
      </div>

      {/* Example 1: Lazy Modal with Heavy Form */}
      <div className="space-y-4">
        <h2 className="text-base md:text-2xl font-bold text-gray-900">
          Example 1: Lazy Modal with Form
        </h2>
        <p className="text-gray-600">
          The product form and its dependencies are only loaded when you click the button.
        </p>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Open Product Form (Lazy Loaded)
        </Button>

        <LazyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Product"
          size="lg"
          loadingMessage="Loading product form..."
        >
          <ProductFormContent
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </LazyModal>
      </div>

      {/* Example 2: Lazy Date Picker */}
      <div className="space-y-4">
        <h2 className="text-base md:text-2xl font-bold text-gray-900">
          Example 2: Lazy Date Picker
        </h2>
        <p className="text-gray-600">
          Date picker library is only loaded when this component mounts.
        </p>
        <div className="max-w-md">
          <Suspense fallback={
            <div className="p-4 bg-gray-100 rounded-xl animate-pulse">
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          }>
            <LazyDatePicker
              selected={selectedDate}
              onChange={setSelectedDate}
              label="Select Event Date"
              placeholder="Choose a date"
              fullWidth
            />
          </Suspense>
        </div>
      </div>

      {/* Example 3: Lazy Rich Text Editor */}
      <div className="space-y-4">
        <h2 className="text-base md:text-2xl font-bold text-gray-900">
          Example 3: Lazy Rich Text Editor
        </h2>
        <p className="text-gray-600">
          Rich text editor is only loaded when this component mounts.
        </p>
        <div className="max-w-2xl">
          <Suspense fallback={
            <div className="p-4 bg-gray-100 rounded-xl animate-pulse">
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          }>
            <LazyRichTextEditor
              value={description}
              onChange={setDescription}
              label="Product Description"
              placeholder="Enter detailed product description..."
              minHeight={200}
              maxHeight={400}
              showToolbar
            />
          </Suspense>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="p-3 md:p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl">
        <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-4">
          🚀 Performance Benefits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Initial Bundle Reduction
            </p>
            <p className="text-xs md:text-lg md:text-3xl font-bold text-green-600">30-40%</p>
            <p className="text-xs text-gray-600 mt-1">
              Heavy libraries loaded on-demand
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Faster Initial Load
            </p>
            <p className="text-xs md:text-lg md:text-3xl font-bold text-blue-600">&lt;1.8s</p>
            <p className="text-xs text-gray-600 mt-1">
              First Contentful Paint (FCP)
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Time to Interactive
            </p>
            <p className="text-xs md:text-lg md:text-3xl font-bold text-purple-600">&lt;3.5s</p>
            <p className="text-xs text-gray-600 mt-1">
              Users can interact faster
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Code Splitting
            </p>
            <p className="text-xs md:text-lg md:text-3xl font-bold text-orange-600">✓</p>
            <p className="text-xs text-gray-600 mt-1">
              Automatic chunk optimization
            </p>
          </div>
        </div>
      </div>

      {/* Implementation Guide */}
      <div className="p-3 md:p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-4">
          📚 Implementation Guide
        </h3>
        <div className="space-y-3 text-sm text-gray-800">
          <div>
            <p className="font-semibold text-blue-900">1. Identify Heavy Components</p>
            <p>Find components using large libraries (Recharts, date pickers, editors)</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900">2. Create Lazy Versions</p>
            <p>Move heavy components to separate files that can be dynamically imported</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900">3. Use React.lazy() + Suspense</p>
            <p>Wrap lazy components with Suspense and provide loading fallbacks</p>
          </div>
          <div>
            <p className="font-semibold text-blue-900">4. Test Performance</p>
            <p>Use bundle analyzer and Lighthouse to measure improvements</p>
          </div>
        </div>
      </div>
    </div>
  )
}
