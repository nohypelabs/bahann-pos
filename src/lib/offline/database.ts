/**
 * IndexedDB Offline Database
 *
 * Stores transactions, products, and sync queue when offline.
 * Uses Dexie.js for better IndexedDB API.
 */

import Dexie, { Table } from 'dexie'
import { logger } from '@/lib/logger'

// Offline Transaction - pending sales when offline
export interface OfflineTransaction {
  id?: number
  transactionId: string
  outletId: string
  userId: string
  items: Array<{
    productId: string
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'debit' | 'credit' | 'qris'
  amountPaid: number
  change: number
  notes?: string
  timestamp: number
  synced: boolean
  syncError?: string
  syncAttempts: number
}

// Cached Product Data for offline access
export interface OfflineProduct {
  id: string
  name: string
  sku: string
  price: number
  category?: string
  barcode?: string
  stock: number
  outletId?: string
  lastSync: number
}

// Cached Outlet Data
export interface OfflineOutlet {
  id: string
  name: string
  address: string
  phone?: string
  lastSync: number
}

// Sync Queue for any offline changes
export interface SyncQueueItem {
  id?: number
  type: 'transaction' | 'stock_update' | 'product_update' | 'outlet_update'
  endpoint: string
  data: any
  timestamp: number
  attempts: number
  lastAttempt?: number
  error?: string
  priority: 'high' | 'normal' | 'low'
}

/**
 * Main Offline Database
 */
class OfflineDatabase extends Dexie {
  // Tables
  transactions!: Table<OfflineTransaction, number>
  products!: Table<OfflineProduct, string>
  outlets!: Table<OfflineOutlet, string>
  syncQueue!: Table<SyncQueueItem, number>

  constructor() {
    super('LakuPOSOfflineDB')

    // Define schema
    this.version(1).stores({
      transactions: '++id, transactionId, outletId, userId, timestamp, synced, syncAttempts',
      products: 'id, sku, barcode, outletId, lastSync',
      outlets: 'id, lastSync',
      syncQueue: '++id, type, endpoint, timestamp, attempts, priority'
    })
  }

  /**
   * Cleanup old synced data
   * Keeps last 30 days of synced transactions
   */
  async cleanup() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

    // Delete old synced transactions
    await this.transactions
      .where('timestamp')
      .below(thirtyDaysAgo)
      .filter(item => item.synced === true)
      .delete()

    // Delete old products (> 7 days not synced)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    await this.products
      .where('lastSync')
      .below(sevenDaysAgo)
      .delete()

    // Delete completed sync queue items
    await this.syncQueue
      .where('attempts')
      .above(5) // Remove items that failed 5+ times
      .delete()

    logger.success('Offline database cleanup completed')
  }

  /**
   * Get storage usage
   */
  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0
      }
    }
    return null
  }

  /**
   * Request persistent storage (prevents eviction)
   */
  async requestPersistentStorage() {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist()
      logger.info(`Persistent storage: ${isPersisted ? 'granted' : 'denied'}`)
      return isPersisted
    }
    return false
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const [pendingTransactions, queuedItems, totalProducts] = await Promise.all([
      this.transactions.where('synced').equals(0).count(), // 0 = false in IndexedDB
      this.syncQueue.count(),
      this.products.count()
    ])

    return {
      pendingTransactions,
      queuedItems,
      totalProducts
    }
  }
}

// Export singleton instance
export const offlineDb = new OfflineDatabase()

// Initialize on load
if (typeof window !== 'undefined') {
  // Request persistent storage
  offlineDb.requestPersistentStorage().catch((err) => logger.error('Failed to request persistent storage:', err))

  // Run cleanup on init
  offlineDb.cleanup().catch((err) => logger.error('Failed to cleanup offline database:', err))

  // Periodic cleanup (every 24 hours)
  setInterval(() => {
    offlineDb.cleanup().catch((err) => logger.error('Failed periodic cleanup:', err))
  }, 24 * 60 * 60 * 1000)
}
