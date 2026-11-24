'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { liveQuery } from 'dexie'
import { offlineDb, type WsCustomer, type WsMechanic, type WsNote, type WsOutboxItem, type WsOutlet, type WsProduct, type WsShift, type WsVehicle } from '@/lib/offline/database'
import { logger } from '@/lib/logger'
import type { OfflineOp } from '@/shared/schemas/workshopOffline'
import { applyOps, type StationLookups } from './reducer'
import { startStation, stationOwner, stationStatus, subscribeStation } from './station'

/** Subscribes to an IndexedDB query; re-runs when the tables it read change. */
function useLive<T>(query: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (err) => logger.error('Station query failed', err),
    })
    return () => sub.unsubscribe()
    // The query is fixed per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return value
}

export interface StationCatalog {
  products: WsProduct[]
  customers: WsCustomer[]
  vehicles: WsVehicle[]
  mechanics: WsMechanic[]
  outlets: WsOutlet[]
  shifts: WsShift[]
  stock: Map<string, number>
  snapshotAt: string | null
  lookups: StationLookups
  ready: boolean
}

const EMPTY = {
  products: [] as WsProduct[], customers: [] as WsCustomer[], vehicles: [] as WsVehicle[], mechanics: [] as WsMechanic[],
  outlets: [] as WsOutlet[], shifts: [] as WsShift[], stock: [] as { productId: string; outletId: string; stock: number }[],
  snapshotAt: null as string | null, ready: false,
}

/** The cached catalogue, people, motors and shifts. */
export function useStationCatalog(outletId?: string): StationCatalog {
  const raw = useLive(async () => {
    const [products, customers, vehicles, mechanics, outlets, shifts, stock, snap] = await Promise.all([
      offlineDb.wsProducts.toArray(), offlineDb.wsCustomers.toArray(), offlineDb.wsVehicles.toArray(),
      offlineDb.wsMechanics.toArray(), offlineDb.wsOutlets.toArray(), offlineDb.wsShifts.toArray(),
      offlineDb.wsStock.toArray(), offlineDb.wsMeta.get('snapshotAt'),
    ])
    return { products, customers, vehicles, mechanics, outlets, shifts, stock, snapshotAt: (snap?.value as string) ?? null, ready: true }
  }, EMPTY)

  return useMemo(() => ({
    ...raw,
    stock: new Map(raw.stock.filter((s) => !outletId || s.outletId === outletId).map((s) => [s.productId, s.stock])),
    lookups: {
      products: new Map(raw.products.map((p) => [p.id, p])),
      customers: new Map(raw.customers.map((c) => [c.id, c])),
      vehicles: new Map(raw.vehicles.map((v) => [v.plateNumber, v])),
      mechanics: new Map(raw.mechanics.map((m) => [m.id, m])),
    },
  }), [raw, outletId])
}

export interface StationNotes {
  /** The server's notes with this station's unconfirmed operations applied. */
  notes: WsNote[]
  /** This user's operations not yet confirmed by the server. */
  pending: WsOutboxItem[]
  /** Operations the server refused, for the cashier to review. */
  failed: WsOutboxItem[]
  /** Operations left by another account on this browser. */
  foreign: number
  /** Note ids with operations still waiting. */
  unsyncedNoteIds: Set<string>
}

export function useStationNotes(lookups: StationLookups): StationNotes {
  const raw = useLive(async () => {
    const [notes, outbox] = await Promise.all([offlineDb.wsNotes.toArray(), offlineDb.wsOutbox.orderBy('seq').toArray()])
    return { notes, outbox }
  }, { notes: [] as WsNote[], outbox: [] as WsOutboxItem[] })

  return useMemo(() => {
    const owner = stationOwner()
    const mine = raw.outbox.filter((o) => o.owner === owner)
    const replay = mine.filter((o) => o.status !== 'failed')
    const pending = mine.filter((o) => o.status === 'pending')
    return {
      notes: applyOps(raw.notes, replay.map((o) => o.op as OfflineOp), lookups),
      pending,
      failed: mine.filter((o) => o.status === 'failed'),
      foreign: raw.outbox.filter((o) => o.owner !== owner && o.status !== 'done').length,
      unsyncedNoteIds: new Set(pending.map((o) => o.noteId).filter((id): id is string => !!id)),
    }
  }, [raw, lookups])
}

/** Online/offline and whether a sync is running; starts the background sync. */
export function useStationStatus() {
  useEffect(() => { startStation() }, [])
  return useSyncExternalStore(subscribeStation, cachedStatus, serverStatus)
}

// useSyncExternalStore needs a stable snapshot between changes.
let lastStatus = stationStatus()
function cachedStatus() {
  const next = stationStatus()
  if (next.reachable !== lastStatus.reachable || next.syncing !== lastStatus.syncing || next.lastSyncError !== lastStatus.lastSyncError) {
    lastStatus = next
  }
  return lastStatus
}
const SERVER_STATUS = { reachable: 'online' as const, syncing: false, lastSyncError: null }
function serverStatus() { return SERVER_STATUS }
