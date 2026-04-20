import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-base md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
