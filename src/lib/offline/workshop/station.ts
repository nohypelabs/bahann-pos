// The workshop cashier station's local store and sync loop.
//
// Reads come from IndexedDB (offlineDb.ws*), so the station works the same with
// or without internet. Every change is an operation in the outbox: applied to the
// screen at once (see reducer.ts) and sent to workshop.offline.push in order when
// the server is reachable. The server records each operation once, so sending
// again after a lost response is safe.
import { TRPCClientError } from '@trpc/client'
import { offlineDb, type WsNote, type WsOutboxItem } from '@/lib/offline/database'
import { vanillaTrpc } from '@/lib/trpc/client'
import { logger } from '@/lib/logger'
import type { OfflineOp, OfflineOpResult } from '@/shared/schemas/workshopOffline'

const NOTES_EVERY_MS = 15_000
const SNAPSHOT_EVERY_MS = 5 * 60_000
const BATCH = 50

export type Reachability = 'online' | 'offline'

type Listener = () => void
const listeners = new Set<Listener>()
let reachable: Reachability = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
let syncing: Promise<void> | null = null
/** Set when sync() was called during a run: one more run follows it. */
let rerun: { snapshot?: boolean } | null = null
let started = false
let lastSyncError: string | null = null

function notify() { listeners.forEach((l) => l()) }

export function subscribeStation(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function stationStatus() {
  return { reachable, syncing: syncing !== null, lastSyncError }
}

function setReachable(next: Reachability) {
  if (reachable !== next) { reachable = next; notify() }
}

/** No HTTP response at all: the network or the server is down. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TRPCClientError) return !err.data?.httpStatus
  return err instanceof TypeError
}

/** The signed-in user's email: outbox items are sent only by the user who made them. */
export function stationOwner(): string {
  try { return JSON.parse(localStorage.getItem('user') ?? '{}').email ?? 'unknown' } catch { return 'unknown' }
}

export async function stationId(): Promise<string> {
  const row = await offlineDb.wsMeta.get('stationId')
  if (row) return row.value as string
  const id = crypto.randomUUID()
  await offlineDb.wsMeta.put({ key: 'stationId', value: id })
  return id
}

export const newId = () => crypto.randomUUID()

// ─── Pulling from the server ────────────────────────────────────────────────

/** Replaces the cached catalogue, people, motors, mechanics, outlets and shifts. */
export async function refreshSnapshot(): Promise<void> {
  const snap = await vanillaTrpc.workshop.offline.snapshot.query()
  const owner = stationOwner()
  await offlineDb.transaction('rw',
    [offlineDb.wsProducts, offlineDb.wsStock, offlineDb.wsCustomers, offlineDb.wsVehicles,
      offlineDb.wsMechanics, offlineDb.wsOutlets, offlineDb.wsShifts, offlineDb.wsMeta],
    async () => {
      await Promise.all([
        offlineDb.wsProducts.clear(), offlineDb.wsStock.clear(), offlineDb.wsCustomers.clear(),
        offlineDb.wsVehicles.clear(), offlineDb.wsMechanics.clear(), offlineDb.wsOutlets.clear(), offlineDb.wsShifts.clear(),
      ])
      await Promise.all([
        offlineDb.wsProducts.bulkPut(snap.products),
        offlineDb.wsStock.bulkPut(snap.stock),
        offlineDb.wsCustomers.bulkPut(snap.customers),
        offlineDb.wsVehicles.bulkPut(snap.vehicles),
        offlineDb.wsMechanics.bulkPut(snap.mechanics),
        offlineDb.wsOutlets.bulkPut(snap.outlets),
        offlineDb.wsShifts.bulkPut(snap.shifts),
        offlineDb.wsMeta.bulkPut([
          { key: 'snapshotAt', value: snap.generatedAt },
          { key: 'owner', value: owner },
        ]),
      ])
    })
}

/** Replaces the cached copy of the server's open notes. */
export async function refreshNotes(): Promise<void> {
  const notes = await vanillaTrpc.workshop.offline.openNotes.query()
  const rows: WsNote[] = notes.map((n) => ({
    id: n.id,
    outletId: n.outletId,
    status: n.status,
    vehicle: { id: n.vehicle.id, plateNumber: n.vehicle.plateNumber, brand: n.vehicle.brand, model: n.vehicle.model, customerId: n.vehicle.customerId },
    customer: n.customer
      ? { id: n.customer.id, name: n.customer.name, phone: n.customer.phone, isMember: n.customer.isMember, memberCode: n.customer.memberCode }
      : null,
    mechanic: n.mechanic ? { id: n.mechanic.id, name: n.mechanic.name } : null,
    complaint: n.complaint,
    odometerKm: n.odometerKm,
    openedAt: n.openedAt,
    items: n.items.map((i) => ({
      productId: i.productId, productName: i.productName, productSku: i.productSku, itemType: i.itemType,
      quantity: i.quantity, unitPrice: i.unitPrice, listPrice: i.listPrice, priceReason: i.priceReason, priceNote: i.priceNote,
    })),
    discount: n.manualDiscount,
  }))
  await offlineDb.transaction('rw', [offlineDb.wsNotes, offlineDb.wsMeta], async () => {
    await offlineDb.wsNotes.clear()
    await offlineDb.wsNotes.bulkPut(rows)
    await offlineDb.wsMeta.put({ key: 'notesAt', value: new Date().toISOString() })
  })
}

// ─── Recording and sending operations ───────────────────────────────────────

/** Records an operation (shown at once) and sends it when the server is reachable. */
export async function enqueue(op: OfflineOp): Promise<void> {
  const noteId = 'noteId' in op ? op.noteId : op.kind === 'note.open' ? op.note.id : null
  await offlineDb.wsOutbox.add({
    opId: op.opId, kind: op.kind, noteId, op, owner: stationOwner(), status: 'pending', attempts: 0, createdAt: Date.now(),
  })
  void sync()
}

async function pushPending(): Promise<boolean> {
  const owner = stationOwner()
  const device = await stationId()
  let anyDone = false
  for (;;) {
    const pending = await offlineDb.wsOutbox.where('status').equals('pending').filter((o) => o.owner === owner).sortBy('seq')
    if (pending.length === 0) return anyDone
    const batch = pending.slice(0, BATCH)
    const { results } = await vanillaTrpc.workshop.offline.push.mutate({ deviceId: device, ops: batch.map((b) => b.op as OfflineOp) })
    const byOp = new Map<string, OfflineOpResult>(results.map((r) => [r.opId, r]))
    let stop = false
    for (const item of batch) {
      const r = byOp.get(item.opId)
      if (!r || r.status === 'retry') {
        if (r?.error) lastSyncError = r.error
        await offlineDb.wsOutbox.update(item.seq!, { attempts: item.attempts + 1, error: r?.error })
        stop = true
        break
      }
      if (r.status === 'done') {
        anyDone = true
        await offlineDb.wsOutbox.update(item.seq!, { status: 'done', error: undefined })
      } else {
        await offlineDb.wsOutbox.update(item.seq!, { status: 'failed', error: r.error, attempts: item.attempts + 1 })
      }
    }
    if (stop) return anyDone
  }
}

/**
 * Sends waiting operations, then refreshes the notes. One run at a time. A call
 * during a run waits for it, and asks for one more run afterwards: an operation
 * recorded while a run was past sending would otherwise wait for the next timer.
 */
export function sync(options: { snapshot?: boolean } = {}): Promise<void> {
  if (syncing) {
    rerun = rerun || { snapshot: false }
    if (options.snapshot) rerun.snapshot = true
    return syncing
  }
  syncing = (async () => {
    notify()
    let run: { snapshot?: boolean } | null = options
    while (run) {
      rerun = null
      await syncOnce(run)
      run = rerun
    }
    syncing = null
    notify()
  })()
  return syncing
}

async function syncOnce(options: { snapshot?: boolean }): Promise<void> {
  try {
    const anyDone = await pushPending()
    const snapshotAt = (await offlineDb.wsMeta.get('snapshotAt'))?.value as string | undefined
    const owner = (await offlineDb.wsMeta.get('owner'))?.value
    const stale = !snapshotAt || Date.now() - new Date(snapshotAt).getTime() > SNAPSHOT_EVERY_MS || owner !== stationOwner()
    if (options.snapshot || stale || anyDone) await refreshSnapshot()
    await refreshNotes()
    // The server copy now includes them.
    await offlineDb.wsOutbox.where('status').equals('done').delete()
    lastSyncError = null
    setReachable('online')
  } catch (err) {
    if (isNetworkError(err)) setReachable('offline')
    else lastSyncError = err instanceof Error ? err.message : String(err)
    logger.warn('Workshop station sync did not complete', { error: err instanceof Error ? err.message : String(err) })
  }
}

/** Sends everything now; resolves true when nothing of this user is left waiting. */
export async function flush(): Promise<boolean> {
  await sync()
  const owner = stationOwner()
  const left = await offlineDb.wsOutbox.where('status').equals('pending').filter((o) => o.owner === owner).count()
  return left === 0 && reachable === 'online'
}

/** A refused operation the cashier chose to drop. */
export async function discardFailed(seq: number) {
  await offlineDb.wsOutbox.delete(seq)
}

/** A refused operation sent again under a new id (after fixing its cause). */
export async function retryFailed(item: WsOutboxItem) {
  const opId = newId()
  await offlineDb.wsOutbox.update(item.seq!, { status: 'pending', error: undefined, opId, op: { ...(item.op as object), opId } })
  void sync()
}

/** Starts the background sync once per page load. */
export function startStation() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('online', () => { setReachable('online'); void sync() })
  window.addEventListener('offline', () => setReachable('offline'))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void sync() })
  setInterval(() => { if (document.visibilityState === 'visible') void sync() }, NOTES_EVERY_MS)
  void sync()
}
