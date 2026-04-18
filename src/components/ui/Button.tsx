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
      font-medium rounded-xl
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
    `

    const sizeStyles = {
      sm: 'min-h-[40px] px-4 py-2 text-mobile-sm',
      md: 'btn-mobile',
      lg: 'min-h-[48px] px-6 py-3 text-mobile-lg',
    }

    const variantStyles = {
      primary: `
        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
        shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]
        hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] dark:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]
        active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        active:translate-x-[2px] active:translate-y-[2px]
        border-2 border-gray-200 dark:border-gray-600
      `,
      secondary: `
        bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200
        shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
        hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.12)] dark:hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.5)]
        active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.08)]
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        active:translate-x-[2px] active:translate-y-[2px]
        border-2 border-gray-300 dark:border-gray-500
      `,
      outline: `
        bg-transparent text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600
        shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
        hover:bg-white dark:hover:bg-gray-700
        hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.12)]
        active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.08)]
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        active:translate-x-[2px] active:translate-y-[2px]
      `,
      danger: `
        bg-red-500 text-white
        shadow-[4px_4px_0px_0px_rgba(220,38,38,0.3)]
        hover:shadow-[6px_6px_0px_0px_rgba(220,38,38,0.4)]
        active:shadow-[2px_2px_0px_0px_rgba(220,38,38,0.3)]
        hover:translate-x-[-2px] hover:translate-y-[-2px]
        active:translate-x-[2px] active:translate-y-[2px]
        border-2 border-red-600
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
