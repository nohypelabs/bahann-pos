import { expect, test } from '@playwright/test'
import { addItem, api, evidence, freshPlate, ITEMS, itemRow, openNoteViaDialog, payCash, receiptDialog, requireStock, rupiah, t } from './helpers'

test('walk-in customer on a new motor: open a note, agree a price, pay cash', async ({ page }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  const outletId = await a.outletId()
  const plugsBefore = await requireStock(page, ITEMS.sparkPlug.sku, 2)
  const plate = freshPlate('W')

  const noteId = await openNoteViaDialog(page, plate, { brand: 'Yamaha', model: 'NMAX', odometer: '15200', complaint: 'Servis rutin, busi' })
  await expect(page.getByText(plate, { exact: true })).toBeVisible()
  await expect(page.getByText(t('workshop.walkIn'))).toBeVisible()

  await addItem(page, ITEMS.lightService)
  await addItem(page, ITEMS.sparkPlug)

  // The labour price is agreed per job; 60.000 instead of the list 50.000.
  const price = itemRow(page, ITEMS.lightService.name).getByLabel(t('workshop.note.agreedPrice'))
  await price.fill('60000')
  await price.press('Tab')
  await itemRow(page, ITEMS.sparkPlug.name).getByRole('button', { name: '+', exact: true }).click()
  await expect(itemRow(page, ITEMS.sparkPlug.name).getByText('2', { exact: true })).toBeVisible()
  await expect(page.getByText(rupiah(110_000)).first()).toBeVisible()

  // Rp150.000 handed over for Rp110.000: the receipt shows what was paid and the change.
  await payCash(page, 150_000)
  const receipt = receiptDialog(page)
  await expect(receipt.getByText(plate)).toBeVisible()
  await expect(receipt.locator('.receipt-row', { hasText: /^\s*Bayar:/ })).toContainText(rupiah(150_000))
  await expect(receipt.locator('.receipt-row', { hasText: 'Kembalian:' })).toContainText(rupiah(40_000))
  // The preview is a real dialog with the receipt stylesheet applied (it used to render unstyled, inline).
  expect(await receipt.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
  expect(await receipt.locator('.receipt-container').evaluate((el) => getComputedStyle(el).maxWidth)).not.toBe('none')

  await expect.poll(() => a.noteStatus(noteId)).toBe('paid')
  const note = await a.note(noteId)
  expect(note.paidTotal).toBe(110_000)
  expect(note.items.find((i) => i.productSku === ITEMS.lightService.sku)?.unitPrice).toBe(60_000)
  expect(await a.stock(ITEMS.sparkPlug.sku, outletId)).toBe(plugsBefore - 2)

  // The plate now remembers the visit.
  const found = await a.lookup(plate)
  expect(found.openServiceOrderId).toBeNull()
  expect(found.owner).toBeNull()
  evidence('walk-in', { plate, noteId, transactionId: note.transactionId, paidTotal: note.paidTotal, plugs: [plugsBefore, plugsBefore - 2] })
})
