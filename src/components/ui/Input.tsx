import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-mobile-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            input-mobile w-full
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            border-2 border-gray-200 dark:border-gray-600
            rounded-xl
            shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
            focus:outline-none focus:border-gray-400 dark:focus:border-gray-400
            focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]
            focus:translate-x-[-1px] focus:translate-y-[-1px]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            ${error ? 'border-red-400 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-mobile-sm text-red-600 dark:text-red-400">{error}</p>
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
  ({ label, error, rows = 4, fullWidth = false, className = '', ...props }, ref) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-mobile-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`
            input-mobile w-full
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            border-2 border-gray-200 dark:border-gray-600
            rounded-xl
            shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
            focus:outline-none focus:border-gray-400 dark:focus:border-gray-400
            focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]
            focus:translate-x-[-1px] focus:translate-y-[-1px]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            resize-none
            ${error ? 'border-red-400 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-mobile-sm text-red-600 dark:text-red-400">{error}</p>
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
  ({ label, error, options, fullWidth = false, className = '', ...props }, ref) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-mobile-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            input-mobile w-full
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            border-2 border-gray-200 dark:border-gray-600
            rounded-xl
            shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
            focus:outline-none focus:border-gray-400 dark:focus:border-gray-400
            focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]
            focus:translate-x-[-1px] focus:translate-y-[-1px]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:border-red-500' : ''}
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
          <p className="mt-1 text-mobile-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
