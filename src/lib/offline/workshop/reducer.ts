// Applies workshop station operations to local notes. Pure: the station shows the
// server's notes with the operations it has not confirmed yet replayed on top, so
// the cashier sees their own work immediately, online or offline, and a later
// refresh from the server cannot make it disappear.
import { normalizePlate } from '@/domain/workshop/rules'
import type { OfflineOp } from '@/shared/schemas/workshopOffline'
import type { WsCustomer, WsMechanic, WsNote, WsProduct, WsVehicle } from '@/lib/offline/database'

export interface StationLookups {
  products: Map<string, WsProduct>
  customers: Map<string, WsCustomer>
  /** By plate number. */
  vehicles: Map<string, WsVehicle>
  mechanics: Map<string, WsMechanic>
}

export function lineTotal(note: Pick<WsNote, 'items'>): number {
  return note.items.reduce((sum, i) => sum + (i.unitPrice ?? i.listPrice) * i.quantity, 0)
}

/** Returns new notes with `ops` applied in order; the inputs are not modified. */
export function applyOps(notes: WsNote[], ops: OfflineOp[], lookups: StationLookups): WsNote[] {
  const byId = new Map(notes.map((n) => [n.id, n]))
  const customers = new Map(lookups.customers)

  for (const op of ops) {
    switch (op.kind) {
      case 'customer.create': {
        const c = op.customer
        customers.set(c.id, { id: c.id, name: c.name, phone: c.phone ?? null, isMember: c.member, memberCode: null })
        break
      }

      case 'note.open': {
        const n = op.note
        if (byId.has(n.id)) break
        const plateNumber = normalizePlate(n.plate)
        const known = lookups.vehicles.get(plateNumber)
        const customerId = n.customerId ?? known?.customerId ?? null
        const customer = customerId ? customers.get(customerId) ?? null : null
        const mechanic = n.mechanicId ? lookups.mechanics.get(n.mechanicId) ?? null : null
        byId.set(n.id, {
          id: n.id,
          outletId: n.outletId,
          status: 'open',
          vehicle: known
            ? { ...known, customerId: known.customerId ?? customerId }
            : { id: null, plateNumber, brand: n.brand ?? null, model: n.model ?? null, customerId },
          customer: customer
            ? { id: customer.id, name: customer.name, phone: customer.phone, isMember: customer.isMember, memberCode: customer.memberCode }
            : null,
          mechanic: mechanic ? { id: mechanic.id, name: mechanic.name } : null,
          complaint: n.complaint ?? null,
          odometerKm: n.odometerKm ?? null,
          openedAt: op.at,
          items: [],
        })
        break
      }

      case 'note.update': {
        const note = byId.get(op.noteId)
        if (!note || note.status !== 'open') break
        const mechanic = op.mechanicId ? lookups.mechanics.get(op.mechanicId) ?? null : null
        byId.set(note.id, {
          ...note,
          mechanic: mechanic ? { id: mechanic.id, name: mechanic.name } : null,
          complaint: op.complaint ?? null,
          odometerKm: op.odometerKm,
        })
        break
      }

      case 'note.setItem': {
        const note = byId.get(op.noteId)
        if (!note || note.status !== 'open') break
        const existing = note.items.find((i) => i.productId === op.productId)
        let items: WsNote['items']
        if (op.quantity <= 0) {
          items = note.items.filter((i) => i.productId !== op.productId)
        } else if (existing) {
          items = note.items.map((i) => (i.productId === op.productId ? { ...i, quantity: op.quantity, unitPrice: op.unitPrice } : i))
        } else {
          const product = lookups.products.get(op.productId)
          if (!product) break
          items = [...note.items, {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            itemType: product.itemType,
            quantity: op.quantity,
            unitPrice: op.unitPrice,
            listPrice: product.price,
          }]
        }
        byId.set(note.id, { ...note, items })
        break
      }

      case 'note.cancel': {
        const note = byId.get(op.noteId)
        if (!note || note.status !== 'open') break
        byId.set(note.id, { ...note, status: 'cancelled', cancelReason: op.reason })
        break
      }

      case 'note.payCash': {
        const note = byId.get(op.noteId)
        if (!note || note.status !== 'open') break
        // The note as charged: the lines and prices on the receipt.
        const charged = new Map(op.lines.map((l) => [l.productId, l]))
        const items = note.items
          .filter((i) => charged.has(i.productId))
          .map((i) => ({ ...i, quantity: charged.get(i.productId)!.quantity, unitPrice: charged.get(i.productId)!.unitPrice }))
        byId.set(note.id, {
          ...note,
          items,
          status: 'paid',
          paid: {
            transactionNumber: op.transactionNumber,
            total: op.total,
            amountPaid: op.amountPaid,
            change: Math.max(0, op.amountPaid - op.total),
            at: op.at,
          },
        })
        break
      }
    }
  }

  return [...byId.values()]
}
