'use client'

/**
 * Offline Indicator Component
 *
 * Shows network status and pending sync items.
 * Auto-hides when online and all synced.
 */

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
        icon: '📡',
        message: 'Mode Offline',
        pulse: true
      }
    }

    if (syncStatus === 'syncing') {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-white',
        icon: '🔄',
        message: 'Menyinkronkan...',
        pulse: false
      }
    }

    if (syncStatus === 'success') {
      return {
        color: 'bg-green-500',
        textColor: 'text-white',
        icon: '✅',
        message: 'Tersinkronisasi',
        pulse: false
      }
    }

    if (syncStatus === 'error') {
      return {
        color: 'bg-red-500',
        textColor: 'text-white',
        icon: '❌',
        message: 'Gagal Sinkronisasi',
        pulse: true
      }
    }

    // Has pending items but online
    if (totalPending > 0) {
      return {
        color: 'bg-blue-500',
        textColor: 'text-white',
        icon: '⏳',
        message: 'Menunggu Sinkronisasi',
        pulse: false
      }
    }

    return {
      color: 'bg-gray-500',
      textColor: 'text-white',
      icon: '📶',
      message: 'Online',
      pulse: false
    }
  }

  const status = getStatusConfig()

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
          <span className={`text-sm md:text-xl ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}>
            {status.icon}
          </span>

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
