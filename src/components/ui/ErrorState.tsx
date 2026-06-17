import { type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  icon,
  title = 'Terjadi kesalahan',
  description = 'Gagal memuat data. Silakan coba lagi.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center">
      <div className="mb-3 text-red-300 dark:text-red-600 [&>svg]:w-10 [&>svg]:h-10 md:[&>svg]:w-12 md:[&>svg]:h-12">
        {icon ?? <AlertTriangle />}
      </div>
      <p className="text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">{description}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Coba Lagi
          </Button>
        </div>
      )}
    </div>
  )
}
