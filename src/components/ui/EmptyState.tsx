import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center">
      <span className="text-4xl md:text-5xl mb-3">{icon}</span>
      <p className="text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      {description && (
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
