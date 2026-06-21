'use client'

import { useState } from 'react'

interface ApprovalCardProps {
  actionType: string
  actorName: string
  referenceId: string
  amount?: string
  reason: string
  onApprove: () => void | Promise<void>
  onReject: () => void | Promise<void>
  disabled?: boolean
  className?: string
}

export function ApprovalCard({
  actionType,
  actorName,
  referenceId,
  amount,
  reason,
  onApprove,
  onReject,
  disabled = false,
  className = '',
}: ApprovalCardProps) {
  const [dismissing, setDismissing] = useState(false)

  const handleApprove = async () => {
    if (disabled) return
    setDismissing(true)
    await onApprove()
  }

  const handleReject = async () => {
    if (disabled) return
    setDismissing(true)
    await onReject()
  }

  return (
    <div
      className={`
        bg-surface border border-border rounded-[35px] p-4
        transition-all duration-250 ease-out
        ${dismissing ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
        ${className}
      `}
      style={{ transitionDuration: '250ms' }}
    >
      {/* Header: action type + actor */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg leading-tight">
            {actionType}{' '}
            <span className="text-text-muted font-normal">— {actorName}</span>
          </p>

          {/* Reference + amount */}
          <p className="text-[13px] text-text-muted mt-1">
            {referenceId}
            {amount && (
              <>
                <span className="mx-1.5">·</span>
                <span className="font-semibold text-fg tabular-nums">{amount}</span>
              </>
            )}
          </p>
        </div>

        {/* Action buttons — always on right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReject}
            disabled={disabled}
            className="
              px-4 py-2 text-[13px] font-semibold
              rounded-full
              text-text-muted bg-bg border border-border
              hover:bg-danger-bg hover:text-danger hover:border-danger/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
            "
          >
            Tolak
          </button>
          <button
            onClick={handleApprove}
            disabled={disabled}
            className="
              px-4 py-2 text-[13px] font-semibold
              rounded-full
              text-white bg-success
              hover:bg-success/90
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
            "
          >
            Setuju
          </button>
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <p className="mt-2.5 text-[13px] text-text-muted leading-relaxed italic">
          &ldquo;{reason}&rdquo;
        </p>
      )}
    </div>
  )
}
