type StatusType = 'active' | 'pending' | 'rejected' | 'neutral'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string; defaultLabel: string }> = {
  active: {
    bg: 'bg-success-bg',
    text: 'text-success',
    dot: 'bg-success',
    defaultLabel: 'Aktif',
  },
  pending: {
    bg: 'bg-warning-bg',
    text: 'text-warning',
    dot: 'bg-warning',
    defaultLabel: 'Pending',
  },
  rejected: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    dot: 'bg-danger',
    defaultLabel: 'Ditolak',
  },
  neutral: {
    bg: 'bg-bg',
    text: 'text-text-muted',
    dot: 'bg-text-muted',
    defaultLabel: 'Draft',
  },
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-xs font-medium
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label ?? config.defaultLabel}
    </span>
  )
}
