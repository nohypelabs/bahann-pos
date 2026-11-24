import { expect, test } from '@playwright/test'
import { addItem, api, evidence, ITEMS, MEMBER_PLATE, openNoteViaDialog, payCash, requireStock, rupiah, t } from './helpers'

test('a paid member visit earns a stamp, and a full card turns into a voucher', async ({ page }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  await a.clearOpenNote(MEMBER_PLATE)
  await requireStock(page, ITEMS.oil.sku, 1)
  const before = await a.lookup(MEMBER_PLATE)
  expect(before.owner?.memberCode, `${MEMBER_PLATE} should belong to a member`).toBeTruthy()
  const card = before.stampCard!
  expect(card.required).toBeGreaterThan(0)

  const noteId = await openNoteViaDialog(page, MEMBER_PLATE, { odometer: '22000' })
  await expect(page.getByText(`${t('workshop.member')} ${before.owner!.memberCode}`)).toBeVisible()

  await addItem(page, ITEMS.oilChange)
  await addItem(page, ITEMS.oil)
  await expect(page.getByText(rupiah(ITEMS.oilChange.price + ITEMS.oil.price)).first()).toBeVisible()

  await payCash(page)
  await expect.poll(async () => (await a.note(noteId)).status).toBe('paid')

  const after = await a.lookup(MEMBER_PLATE)
  const filled = card.balance + 1 >= card.required
  if (filled) {
    expect(after.stampCard!.balance).toBe(card.balance + 1 - card.required)
    expect(after.vouchers.length).toBe(before.vouchers.length + 1)
    await expect(page.getByText(/Kartu servis penuh/)).toBeVisible()
  } else {
    expect(after.stampCard!.balance).toBe(card.balance + 1)
    expect(after.vouchers.length).toBe(before.vouchers.length)
  }

  evidence('member', { noteId, stamps: [card.balance, after.stampCard!.balance], required: card.required, vouchers: [before.vouchers.length, after.vouchers.length] })

  // The member page shows the same card.
  await page.goto('/members')
  await expect(page.getByText(before.owner!.memberCode!)).toBeVisible()
})
