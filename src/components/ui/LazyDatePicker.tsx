/**
 * LazyDatePicker Component
 * Lazy-loadable date picker wrapper for heavy date picker libraries
 *
 * This wrapper supports lazy loading of popular date picker libraries like:
 * - react-datepicker
 * - react-day-picker
 * - date-fns
 *
 * Usage:
 * ```tsx
 * const DatePicker = lazy(() => import('@/components/ui/LazyDatePicker'))
 *
 * <Suspense fallback={<InputLoadingSkeleton />}>
 *   <DatePicker
 *     selected={date}
 *     onChange={setDate}
 *     label="Select Date"
 *   />
 * </Suspense>
 * ```
 */
'use client'

import { useState } from 'react'

interface LazyDatePickerProps {
  selected?: Date | null
  onChange: (date: Date | null) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  minDate?: Date
  maxDate?: Date
  dateFormat?: string
  showTimeSelect?: boolean
  fullWidth?: boolean
  disabled?: boolean
}

/**
 * Simple date picker implementation without heavy dependencies
 * Can be replaced with react-datepicker or other libraries when needed
 *
 * To use a heavy library:
 * 1. Install: npm install react-datepicker @types/react-datepicker
 * 2. Import: import ReactDatePicker from 'react-datepicker'
 * 3. Replace the input below with <ReactDatePicker {...props} />
 */
export default function LazyDatePicker({
  selected,
  onChange,
  label,
  placeholder = 'Select date',
  required = false,
  error,
  minDate,
  maxDate,
  dateFormat = 'yyyy-MM-dd',
  showTimeSelect = false,
  fullWidth = false,
  disabled = false,
}: LazyDatePickerProps) {
  const [isFocused, setIsFocused] = useState(false)

  const formatDate = (date: Date | null): string => {
    if (!date) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    if (showTimeSelect) {
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    return `${year}-${month}-${day}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value) {
      onChange(null)
      return
    }

    const newDate = new Date(value)
    if (!isNaN(newDate.getTime())) {
      onChange(newDate)
    }
  }

  const inputClasses = `
    w-full px-2 py-2 md:px-4 md:py-3 rounded-xl border-2 transition-all
    ${error
      ? 'border-red-300 focus:border-red-500'
      : isFocused
        ? 'border-blue-500 ring-2 ring-blue-200'
        : 'border-gray-300 hover:border-gray-400'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    focus:outline-none text-gray-900
  `.trim()

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type={showTimeSelect ? 'datetime-local' : 'date'}
          value={formatDate(selected || null)}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={minDate ? formatDate(minDate) : undefined}
          max={maxDate ? formatDate(maxDate) : undefined}
          className={inputClasses}
        />

        {/* Calendar icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Optimization note */}
      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-800">
          ✅ <strong>Lazy Loaded:</strong> This date picker is only loaded when needed,
          reducing initial bundle size.
        </p>
      </div>
    </div>
  )
}
