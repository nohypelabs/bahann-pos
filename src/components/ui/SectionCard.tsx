import { ReactNode } from 'react'

interface SectionCardProps {
  children: ReactNode
  className?: string
  /** Numbered step label, e.g. step="1" stepLabel="Pilih Produk" */
  step?: string | number
  stepLabel?: string
  /** Plain title row (no step number) */
  title?: string
  /** Optional element placed at the right of the title row */
  action?: ReactNode
}

export function SectionCard({ children, className = '', step, stepLabel, title, action }: SectionCardProps) {
  const hasHeader = step != null || title || action

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            {step != null && (
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                {step} · {stepLabel}
              </p>
            )}
            {title && (
              <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                {title}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-4 md:px-6 py-4 md:py-5">
        {children}
      </div>
    </div>
  )
}
