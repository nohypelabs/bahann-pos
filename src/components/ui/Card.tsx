import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className = '', ...props }, ref) => {
    const baseStyles = `
      card-mobile bg-white dark:bg-gray-800
      transition-all duration-200
    `

    const variantStyles = {
      default: `
        shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.4)]
        border-2 border-gray-200 dark:border-gray-700
        hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] dark:hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]
        hover:translate-x-[-2px] hover:translate-y-[-2px]
      `,
      elevated: `
        shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]
        border-2 border-gray-300 dark:border-gray-600
      `,
      flat: `
        shadow-[3px_3px_0px_0px_rgba(0,0,0,0.06)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]
        border-2 border-gray-100 dark:border-gray-700
      `,
    }

    const paddingStyles = {
      none: '!p-0',
      sm: '!p-3',
      md: '',
      lg: '!p-6 sm:!p-8',
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
      <div ref={ref} className={`mb-4 ${className}`} {...props}>
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <h3 ref={ref} className={`text-mobile-xl font-bold text-gray-900 dark:text-gray-100 ${className}`} {...props}>
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
