interface StepperInputProps {
  label: string
  sub?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  accent?: 'blue' | 'red' | 'green'
}

const accentStyles = {
  blue: {
    ring: 'border-blue-300 dark:border-blue-700',
    btn: 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 dark:text-blue-400',
  },
  red: {
    ring: 'border-red-300 dark:border-red-700',
    btn: 'hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400',
  },
  green: {
    ring: 'border-green-300 dark:border-green-700',
    btn: 'hover:bg-green-50 dark:hover:bg-green-900/30 text-green-500 dark:text-green-400',
  },
}

export function StepperInput({ label, sub, value, onChange, min = 0, max, accent = 'blue' }: StepperInputProps) {
  const { ring, btn } = accentStyles[accent]

  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tracking-wide uppercase">
        {label}
      </span>
      <div className={`flex items-center border-2 ${ring} rounded-xl overflow-hidden bg-white dark:bg-gray-800`}>
        <button
          type="button"
          onClick={decrement}
          className={`w-9 h-11 flex items-center justify-center font-bold text-xl transition-colors ${btn}`}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={e => {
            const n = parseInt(e.target.value)
            if (isNaN(n)) { onChange(min); return }
            const clamped = max !== undefined ? Math.min(max, Math.max(min, n)) : Math.max(min, n)
            onChange(clamped)
          }}
          min={min}
          max={max}
          className="w-14 h-11 text-center font-bold text-gray-900 dark:text-white bg-transparent border-0 outline-none text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={increment}
          className={`w-9 h-11 flex items-center justify-center font-bold text-xl transition-colors ${btn}`}
        >
          +
        </button>
      </div>
      {sub && <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}
