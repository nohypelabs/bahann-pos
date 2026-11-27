import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', fullWidth = false, className = '', disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center cursor-pointer
      font-medium rounded-[20px]
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-[#8ECFC2] focus:ring-offset-2 focus:ring-offset-[#FFFFFF]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
      ${fullWidth ? 'w-full' : ''}
    `

    const sizeStyles = {
      sm: 'min-h-[40px] px-4 py-2 text-mobile-sm',
      md: 'btn-mobile',
      lg: 'min-h-[48px] px-3 md:px-6 py-3 text-mobile-lg',
    }

    const variantStyles = {
      primary: `
        bg-[#0F5F56] text-white
        border border-[#0B4E48]
        shadow-[0_1px_0_rgba(15,95,86,0.18)]
        hover:bg-[#0B4E48]
      `,
      secondary: `
        glass-button bg-[#F4F5F5] text-[#2F3A35]
        border border-[#E4E6E7]
        hover:bg-[#EDEEEE] hover:text-[#17201D]
      `,
      outline: `
        glass-button bg-white text-[#2F3A35]
        border border-[#E4E6E7]
        hover:border-[#B9CBBF] hover:bg-[#F8F9F9] hover:text-[#0F5F56]
      `,
      danger: `
        bg-[#B42318] text-white
        border border-[#981B12]
        hover:bg-[#981B12]
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
