/**
 * useOffline Hook
 *
 * Monitors network status and offline sync state.
 * Provides real-time status of offline queue and sync progress.
 */

import { useState, useEffect } from 'react'
import { offlineDb } from '@/lib/offline/database'
import { syncManager, type SyncStatus } from '@/lib/offline/sync-manager'
import { logger } from '@/lib/logger'

export interface OfflineStatus {
  isOnline: boolean
  syncStatus: SyncStatus
  pendingTransactions: number
  queuedItems: number
  totalCachedProducts: number
  forceSync: () => Promise<void>
}

export function useOffline(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [pendingTransactions, setPendingTransactions] = useState(0)
  const [queuedItems, setQueuedItems] = useState(0)
  const [totalCachedProducts, setTotalCachedProducts] = useState(0)

  useEffect(() => {
    const updateCounts = async () => {
      try {
        const stats = await offlineDb.getSyncStats()
        setPendingTransactions(stats.pendingTransactions)
        setQueuedItems(stats.queuedItems)
        setTotalCachedProducts(stats.totalProducts)
      } catch (error) {
        logger.error('Failed to get sync stats:', error)
      }
    }

    // Network status listeners
    const handleOnline = () => {
      logger.info('Online')
      setIsOnline(true)
    }

    const handleOffline = () => {
      logger.info('Offline')
      setIsOnline(false)
    }

    // Sync completed listener
    const handleSyncCompleted = ((event: CustomEvent) => {
      logger.success('Sync completed')
      updateCounts()
    }) as EventListener
    const handleQueueUpdated = (() => {
      updateCounts()
    }) as EventListener

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('sync-completed', handleSyncCompleted)
    window.addEventListener('offline-queue-updated', handleQueueUpdated)

    // Subscribe to sync status changes
    const unsubscribe = syncManager.onStatusChange((status) => {
      setSyncStatus(status)
    })

    // Initial counts
    updateCounts()

    // Update counts every 5 seconds
    const interval = setInterval(updateCounts, 5000)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('sync-completed', handleSyncCompleted)
      window.removeEventListener('offline-queue-updated', handleQueueUpdated)
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  return {
    isOnline,
    syncStatus,
    pendingTransactions,
    queuedItems,
    totalCachedProducts,
    forceSync: () => syncManager.forceSync()
  }
}
