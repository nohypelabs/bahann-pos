'use client'

interface PillOption {
  value: number
  label: string
}

interface OutletOption {
  value: string
  label: string
}

interface FilterBarProps {
  /** Period pill buttons */
  periodValue: number
  onPeriodChange: (value: number) => void
  periodOptions?: PillOption[]
  /** Outlet select — omit to hide */
  outlets?: OutletOption[]
  outletValue?: string
  onOutletChange?: (value: string) => void
  outletPlaceholder?: string
}

const DEFAULT_PERIOD_OPTIONS: PillOption[] = [
  { value: 1,  label: 'Hari Ini' },
  { value: 7,  label: '7 Hari' },
  { value: 14, label: '14 Hari' },
  { value: 30, label: '30 Hari' },
  { value: 0,  label: 'Semua' },
]

export function FilterBar({
  periodValue,
  onPeriodChange,
  periodOptions = DEFAULT_PERIOD_OPTIONS,
  outlets,
  outletValue = '',
  onOutletChange,
  outletPlaceholder = 'Semua Outlet',
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
      {/* Outlet select */}
      {outlets && onOutletChange && (
        <div className="relative sm:w-52">
          <select
            value={outletValue}
            onChange={e => onOutletChange(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          >
            <option value="">{outletPlaceholder}</option>
            {outlets.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
        </div>
      )}

      {/* Period pills */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {periodOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPeriodChange(opt.value)}
            className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              periodValue === opt.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
