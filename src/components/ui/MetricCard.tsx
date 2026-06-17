import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

type MetricVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface MetricCardProps {
  label: string
  value: string | number
  trend?: string
  trendDirection?: 'up' | 'down'
  icon?: ReactNode
  variant?: MetricVariant
  className?: string
}

const variantStyles: Record<MetricVariant, { bg: string; border: string; value: string }> = {
  default: {
    bg: 'bg-surface',
    border: 'border border-transparent',
    value: 'text-fg',
  },
  success: {
    bg: 'bg-success-bg',
    border: 'border border-success/20',
    value: 'text-success',
  },
  warning: {
    bg: 'bg-warning-bg',
    border: 'border border-warning/20',
    value: 'text-warning',
  },
  danger: {
    bg: 'bg-danger-bg',
    border: 'border border-danger/20',
    value: 'text-danger',
  },
  info: {
    bg: 'bg-info-bg',
    border: 'border border-info/20',
    value: 'text-info',
  },
}

const trendColors: Record<'up' | 'down', string> = {
  up: 'text-success',
  down: 'text-danger',
}

export function MetricCard({
  label,
  value,
  trend,
  trendDirection,
  icon,
  variant = 'default',
  className = '',
}: MetricCardProps) {
  const styles = variantStyles[variant]
  const isCurrency = typeof value === 'string' && (value.includes('Rp') || value.includes('IDR'))

  return (
    <div
      className={`
        ${styles.bg} ${styles.border}
        rounded-2xl p-4
        flex flex-col gap-1
        transition-all duration-200
        ${className}
      `}
    >
      {/* Header: label + icon */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-muted font-medium leading-tight">
          {label}
        </span>
        {icon && (
          <div className="text-text-muted [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <p
        className={`
          text-2xl md:text-[28px] font-bold leading-tight ${styles.value}
          ${isCurrency ? 'tabular-nums' : ''}
        `}
      >
        {value}
      </p>

      {/* Trend */}
      {trend && trendDirection && (
        <div className={`flex items-center gap-1 text-[13px] font-medium ${trendColors[trendDirection]}`}>
          {trendDirection === 'up' ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{trend}</span>
        </div>
      )}
    </div>
  )
}
