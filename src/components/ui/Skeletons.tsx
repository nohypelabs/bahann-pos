/**
 * Loading Skeleton Components
 * Reusable skeleton loaders for consistent UX during lazy loading
 */

export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div
      className="w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl animate-pulse flex items-center justify-center"
      style={{ height: `${height}px` }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Memuat grafik...</p>
      </div>
    </div>
  )
}

export function ModalLoadingSkeleton({ message = 'Memuat...' }: { message?: string }) {
  return (
    <div className="p-4 md:p-8 flex flex-col items-center gap-4">
      <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="p-3 md:p-6 bg-gray-50 rounded-xl animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-8 bg-gray-300 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

export function FormLoadingSkeleton() {
  return (
    <div className="space-y-4 p-3 md:p-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}

export function ExportLoadingSkeleton() {
  return (
    <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-blue-700 font-medium">Menyiapkan ekspor...</span>
    </div>
  )
}

export function ProductListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0 divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-3 py-2.5 animate-pulse">
          <div className="grid grid-cols-12 gap-2 items-center">
            {/* Product name + SKU */}
            <div className="col-span-5 space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
            {/* Price */}
            <div className="col-span-3">
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
            {/* Stock badge */}
            <div className="col-span-2 flex justify-center">
              <div className="h-5 w-10 bg-gray-200 rounded-full" />
            </div>
            {/* Select indicator */}
            <div className="col-span-2 flex justify-center">
              <div className="h-5 w-5 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl border-2 border-gray-200 animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="flex items-center justify-between mt-2">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 w-8 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
