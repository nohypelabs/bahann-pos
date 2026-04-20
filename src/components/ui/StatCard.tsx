type StatCardColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  color?: StatCardColor
  sub?: string
}

const colorMap: Record<StatCardColor, { wrap: string; label: string }> = {
  gray:   { wrap: 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100',   label: 'text-gray-500 dark:text-gray-400' },
  blue:   { wrap: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',   label: 'text-blue-600 dark:text-blue-400' },
  green:  { wrap: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100', label: 'text-green-600 dark:text-green-400' },
  yellow: { wrap: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100', label: 'text-yellow-700 dark:text-yellow-400' },
  red:    { wrap: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',         label: 'text-red-600 dark:text-red-400' },
  purple: { wrap: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100', label: 'text-purple-600 dark:text-purple-400' },
}

export function StatCard({ icon, label, value, color = 'gray', sub }: StatCardProps) {
  const { wrap, label: labelClass } = colorMap[color]
  return (
    <div className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border ${wrap}`}>
      <span className="text-xl md:text-2xl shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] md:text-xs font-medium ${labelClass}`}>{label}</p>
        <p className="text-base md:text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className={`text-[10px] mt-0.5 ${labelClass}`}>{sub}</p>}
      </div>
    </div>
  )
}
