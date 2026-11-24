import { expect, test } from '@playwright/test'
import { addItem, api, evidence, freshPlate, ITEMS, openNoteViaDialog, receiptDialog, requireStock, rupiah, t } from './helpers'

test('internet down: open a note, add items, take cash, print; it syncs once the connection is back', async ({ page, context }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  const outletId = await a.outletId()
  const plugsBefore = await requireStock(page, ITEMS.sparkPlug.sku, 1)
  // The station has downloaded its data.
  await expect(page.getByText(t('workshop.offline.allSent'))).toBeVisible()
  await expect(page.getByText(/Data barang & member per \d/)).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByRole('status')).toContainText(t('workshop.offline.offline'))

  const plate = freshPlate('O')
  const noteId = await openNoteViaDialog(page, plate, { brand: 'Honda', model: 'Vario' })
  await addItem(page, ITEMS.oilChange)
  await addItem(page, ITEMS.sparkPlug)
  await expect(page.getByText(rupiah(40_000)).first()).toBeVisible()
  await expect(page.getByText(t('workshop.offline.notSent')).first()).toBeVisible()

  // Paying offline goes straight to the station's cash screen.
  await page.getByRole('button', { name: t('workshop.note.pay'), exact: true }).click()
  const cash = page.getByRole('dialog', { name: t('workshop.offline.payTitle') })
  await expect(cash).toContainText(t('workshop.offline.payNotice'))
  await cash.getByPlaceholder('0', { exact: true }).fill('50000')
  await cash.getByRole('button', { name: /^Konfirmasi/ }).click()

  const receipt = receiptDialog(page)
  await expect(receipt).toBeVisible()
  await expect(receipt.getByText(plate)).toBeVisible()
  await expect(receipt.locator('.receipt-row', { hasText: 'Kembalian:' })).toContainText(rupiah(10_000))
  await expect(receipt).toContainText(t('workshop.offline.receiptNote'))
  const receiptNumber = (await receipt.locator('.receipt-row', { hasText: 'No. Transaksi:' }).locator('.receipt-value').textContent())!.trim()
  await receipt.getByRole('button', { name: 'Batal' }).click()

  // Still offline: the list shows it paid and not sent; the server knows nothing yet.
  const card = page.getByRole('button', { name: new RegExp(plate) })
  await expect(card).toContainText(t('workshop.note.statusPaid'))
  await expect(card).toContainText(t('workshop.offline.notSent'))
  await expect(page.getByRole('status')).toContainText(/\d+ perubahan menunggu dikirim/)

  await context.setOffline(false)
  await expect(page.getByRole('status')).toContainText(t('workshop.offline.allSent'), { timeout: 45_000 })

  await expect.poll(() => a.noteStatus(noteId), { timeout: 30_000 }).toBe('paid')
  const note = await a.note(noteId)
  expect(note.paidTotal).toBe(40_000)
  // The sale carries the receipt number printed offline and what was handed over.
  const sale = await a.q<{ transactionId: string; totalAmount: number; amountPaid: number; changeAmount: number }>(
    'transactions.getById', { id: note.transactionId },
  )
  expect(sale).toMatchObject({ transactionId: receiptNumber, totalAmount: 40_000, amountPaid: 50_000, changeAmount: 10_000 })
  expect(await a.stock(ITEMS.sparkPlug.sku, outletId)).toBe(plugsBefore - 1)
  evidence('offline', { plate, noteId, receiptNumber, paidTotal: note.paidTotal, plugs: [plugsBefore, plugsBefore - 1] })
})
