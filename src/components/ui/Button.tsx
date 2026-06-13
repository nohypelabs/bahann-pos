import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', fullWidth = false, className = '', disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-[40px]
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
    `

    const sizeStyles = {
      sm: 'min-h-[40px] px-4 py-2 text-mobile-sm',
      md: 'btn-mobile',
      lg: 'min-h-[48px] px-3 md:px-6 py-3 text-mobile-lg',
    }

    const variantStyles = {
      primary: `
        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
        border-2 border-gray-200 dark:border-gray-600
        hover:bg-gray-50 dark:hover:bg-gray-600
      `,
      secondary: `
        bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200
        border-2 border-gray-300 dark:border-gray-500
        hover:bg-gray-200 dark:hover:bg-gray-500
      `,
      outline: `
        bg-transparent text-gray-900 dark:text-gray-100
        border-2 border-gray-300 dark:border-gray-600
        hover:bg-white dark:hover:bg-gray-700
      `,
      danger: `
        bg-red-500 text-white
        border-2 border-red-600
        hover:bg-red-600
      `,
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
