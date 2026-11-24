import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { api, evidence, freshPlate, ITEMS, requireStock } from './helpers'

type Result = { opId: string; status: 'done' | 'failed' | 'retry'; error?: string; result?: Record<string, unknown> }

test('offline push: a replayed batch does nothing twice, a refused operation stays refused', async ({ page }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  const outletId = await a.outletId()
  const plugsBefore = await requireStock(page, ITEMS.sparkPlug.sku, 1)
  const snapshot = await a.q<{ shifts: { id: string; outletId: string; deviceId: string | null }[] }>('workshop.offline.snapshot')
  const shift = snapshot.shifts.find((s) => s.outletId === outletId)!
  const plug = await a.productId(ITEMS.sparkPlug.sku)
  const at = new Date().toISOString()
  const noteId = randomUUID()
  const plate = freshPlate('P')
  const number = `E2E-OFF-${Date.now()}`

  const ops = [
    { kind: 'note.open', opId: randomUUID(), at, note: { id: noteId, outletId, plate, brand: 'Suzuki' } },
    { kind: 'note.setItem', opId: randomUUID(), at, noteId, productId: plug, quantity: 1, unitPrice: null },
    {
      kind: 'note.payCash', opId: randomUUID(), at, noteId, outletId, shiftId: shift.id, deviceId: shift.deviceId,
      transactionNumber: number, amountPaid: 30_000, lines: [{ productId: plug, quantity: 1, unitPrice: 25_000 }], total: 25_000,
    },
  ]
  const push = (body: unknown[]) => a.m<{ results: Result[] }>('workshop.offline.push', { deviceId: 'e2e', ops: body })

  const first = await push(ops)
  expect(first.results.map((r) => r.status)).toEqual(['done', 'done', 'done'])

  // The same batch again, as after a lost response.
  const again = await push(ops)
  expect(again.results.map((r) => r.status)).toEqual(['done', 'done', 'done'])
  expect(again.results[2].result).toEqual(first.results[2].result)

  const note = await a.note(noteId)
  expect(note.status).toBe('paid')
  expect(note.paidTotal).toBe(25_000)
  expect(await a.stock(ITEMS.sparkPlug.sku, outletId)).toBe(plugsBefore - 1)
  const found = await a.lookup(plate)
  expect(found.openServiceOrderId).toBeNull()

  // An operation on a note that does not exist is refused, and stays refused on replay.
  const bad = { kind: 'note.setItem', opId: randomUUID(), at, noteId: randomUUID(), productId: plug, quantity: 1, unitPrice: null }
  const refused = await push([bad])
  expect(refused.results[0]).toMatchObject({ status: 'failed', error: 'SERVICE_ORDER_NOT_FOUND' })
  expect((await push([bad])).results[0]).toMatchObject({ status: 'failed', error: 'SERVICE_ORDER_NOT_FOUND' })

  evidence('offline-push', { plate, noteId, number, transaction: first.results[2].result })
})
