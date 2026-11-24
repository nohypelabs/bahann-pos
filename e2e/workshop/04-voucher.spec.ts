import { expect, test } from '@playwright/test'
import { addItem, api, evidence, ITEMS, MEMBER_PLATE, openNoteViaDialog, payCash, requireStock, rupiah, t } from './helpers'

test('a free-service voucher takes the labour off the bill and is used up', async ({ page }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  await a.clearOpenNote(MEMBER_PLATE)
  await requireStock(page, ITEMS.oil.sku, 1)

  const before = await a.lookup(MEMBER_PLATE)
  await a.m('workshop.loyalty.issueVoucher', {
    customerId: before.owner!.id,
    reward: { type: 'free_service', maxValue: 50_000 },
    validDays: 1,
  })
  const issued = (await a.lookup(MEMBER_PLATE)).vouchers.find((v) => !before.vouchers.some((b) => b.id === v.id))
  expect(issued, 'issueVoucher should add a voucher').toBeTruthy()

  const noteId = await openNoteViaDialog(page, MEMBER_PLATE)
  await addItem(page, ITEMS.lightService)
  await addItem(page, ITEMS.oil)
  await expect(page.getByText(rupiah(105_000)).first()).toBeVisible()

  await page.getByLabel(t('workshop.note.useVoucher')).selectOption(issued!.code)
  // Labour (50.000) is free; the oil is still paid.
  await expect(page.getByText(rupiah(55_000)).first()).toBeVisible()

  await payCash(page)
  await expect.poll(() => a.noteStatus(noteId)).toBe('paid')
  expect((await a.note(noteId)).paidTotal).toBe(55_000)
  expect((await a.lookup(MEMBER_PLATE)).vouchers.some((v) => v.id === issued!.id)).toBe(false)
  evidence('voucher', { noteId, voucher: issued!.code, paidTotal: 55_000 })
})
