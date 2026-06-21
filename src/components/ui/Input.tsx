import { InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, id, className = '', ...props }, ref) => {
    const defaultId = useId()
    const inputId = id || defaultId
    const errorId = error ? `${inputId}-error` : undefined
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="block text-mobile-sm font-semibold text-[#2F3A35] dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`
            input-mobile w-full
            bg-white dark:bg-gray-800 text-[#17201D] dark:text-gray-100
            border border-[#DDD8CC] dark:border-gray-600
            rounded-[40px]
            focus:outline-none focus:border-[#0F5F56] focus:ring-2 focus:ring-[#8ECFC2]/35 dark:focus:border-gray-400
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-[#8A9188] dark:placeholder:text-gray-500
            ${error ? 'border-[#D92D20] focus:border-[#B42318]' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-mobile-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  rows?: number
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, rows = 4, fullWidth = false, id, className = '', ...props }, ref) => {
    const defaultId = useId()
    const inputId = id || defaultId
    const errorId = error ? `${inputId}-error` : undefined
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="block text-mobile-sm font-semibold text-[#2F3A35] dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`
            input-mobile w-full
            bg-white dark:bg-gray-800 text-[#17201D] dark:text-gray-100
            border border-[#DDD8CC] dark:border-gray-600
            rounded-[40px]
            focus:outline-none focus:border-[#0F5F56] focus:ring-2 focus:ring-[#8ECFC2]/35 dark:focus:border-gray-400
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-[#8A9188] dark:placeholder:text-gray-500
            resize-none
            ${error ? 'border-[#D92D20] focus:border-[#B42318]' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-mobile-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, fullWidth = false, id, className = '', ...props }, ref) => {
    const defaultId = useId()
    const inputId = id || defaultId
    const errorId = error ? `${inputId}-error` : undefined
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="block text-mobile-sm font-semibold text-[#2F3A35] dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`
            input-mobile w-full
            bg-white dark:bg-gray-800 text-[#17201D] dark:text-gray-100
            border border-[#DDD8CC] dark:border-gray-600
            rounded-[40px]
            focus:outline-none focus:border-[#0F5F56] focus:ring-2 focus:ring-[#8ECFC2]/35 dark:focus:border-gray-400
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-[#D92D20] focus:border-[#B42318]' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-mobile-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
