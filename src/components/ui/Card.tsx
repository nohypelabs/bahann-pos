import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className = '', ...props }, ref) => {
    const baseStyles = `
      card-mobile bg-gray-50 dark:bg-gray-800 rounded-[40px]
      transition-all duration-200
    `

    const variantStyles = {
      default: `
        shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]
        border-2 border-gray-300 dark:border-gray-600
        hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] dark:hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.6)]
        hover:translate-x-[-2px] hover:translate-y-[-2px]
      `,
      elevated: `
        shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.6)]
        border-2 border-gray-400 dark:border-gray-500
      `,
      flat: `
        shadow-[5px_5px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.4)]
        border-2 border-gray-200 dark:border-gray-600
      `,
    }

    const paddingStyles = {
      none: '!p-0',
      sm: '!p-3',
      md: '',
      lg: '!p-3 sm:!p-3 md:p-6 md:!p-4 md:p-8',
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`mb-2 md:mb-4 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <h3 ref={ref} className={`text-mobile-base md:text-mobile-xl font-bold text-gray-900 dark:text-gray-100 ${className}`} {...props}>
        {children}
      </h3>
    )
  }
)

CardTitle.displayName = 'CardTitle'

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`${className}`} {...props}>
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'CardBody'
