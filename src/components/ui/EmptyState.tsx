import { type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center">
      <div className="mb-3 text-[#8A9188] dark:text-gray-500 [&>svg]:w-10 [&>svg]:h-10 md:[&>svg]:w-12 md:[&>svg]:h-12">
        {icon ?? <Inbox />}
      </div>
      <p className="text-sm md:text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      {description && (
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
