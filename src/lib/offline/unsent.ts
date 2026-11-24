import { offlineDb } from './database'
import { syncManager } from './sync-manager'
import { flush, stationOwner } from './workshop/station'

/**
 * Tries to send everything recorded offline (quick-cashier sales and workshop
 * station operations) and returns how many are still waiting.
 */
export async function unsentOfflineWork(): Promise<number> {
  const waitingSales = () => offlineDb.transactions.where('synced').equals(0).count()
  const waitingOps = () => offlineDb.wsOutbox.where('status').equals('pending').filter((o) => o.owner === stationOwner()).count()

  if (await waitingSales()) await syncManager.forceSync().catch(() => undefined)
  if (await waitingOps()) await flush().catch(() => false)
  return (await waitingSales()) + (await waitingOps())
}
