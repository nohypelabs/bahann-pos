'use client'

/**
 * Offline Indicator Component
 *
 * Shows network status and pending sync items.
 * Auto-hides when online and all synced.
 */

import { CheckCircle2, Clock, RefreshCw, Wifi, WifiOff, XCircle } from 'lucide-react'
import { useOffline } from '@/hooks/useOffline'

export function OfflineIndicator() {
  const { isOnline, syncStatus, pendingTransactions, queuedItems, forceSync } = useOffline()

  const totalPending = pendingTransactions + queuedItems

  // Don't show if online and nothing pending
  if (isOnline && totalPending === 0 && syncStatus === 'idle') {
    return null
  }

  // Determine status color and message
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: 'bg-red-500',
        textColor: 'text-white',
        icon: WifiOff,
        message: 'Mode Offline',
        pulse: true
      }
    }

    if (syncStatus === 'syncing') {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-white',
        icon: RefreshCw,
        message: 'Menyinkronkan...',
        pulse: false
      }
    }

    if (syncStatus === 'success') {
      return {
        color: 'bg-green-500',
        textColor: 'text-white',
        icon: CheckCircle2,
        message: 'Tersinkronisasi',
        pulse: false
      }
    }

    if (syncStatus === 'error') {
      return {
        color: 'bg-red-500',
        textColor: 'text-white',
        icon: XCircle,
        message: 'Gagal Sinkronisasi',
        pulse: true
      }
    }

    // Has pending items but online
    if (totalPending > 0) {
      return {
        color: 'bg-blue-500',
        textColor: 'text-white',
        icon: Clock,
        message: 'Menunggu Sinkronisasi',
        pulse: false
      }
    }

    return {
      color: 'bg-gray-500',
      textColor: 'text-white',
      icon: Wifi,
      message: 'Online',
      pulse: false
    }
  }

  const status = getStatusConfig()
  const StatusIcon = status.icon

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className={`
        ${status.color} ${status.textColor}
        px-2 py-2 md:px-4 md:py-3 rounded-lg shadow-lg
        transition-all duration-300 ease-in-out
        ${status.pulse ? 'animate-pulse' : ''}
      `}>
        <div className="flex items-center gap-3">
          {/* Icon */}
          <StatusIcon className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />

          {/* Message */}
          <div className="flex-1">
            <p className="font-semibold text-sm">{status.message}</p>
            {totalPending > 0 && (
              <p className="text-xs opacity-90 mt-0.5">
                {pendingTransactions > 0 && `${pendingTransactions} transaksi`}
                {pendingTransactions > 0 && queuedItems > 0 && ', '}
                {queuedItems > 0 && `${queuedItems} update`}
              </p>
            )}
          </div>

          {/* Action Button - only show if has pending items and online */}
          {totalPending > 0 && isOnline && syncStatus !== 'syncing' && (
            <button
              onClick={() => forceSync()}
              className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-semibold transition-colors"
              title="Sinkronkan sekarang"
            >
              Sync
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
