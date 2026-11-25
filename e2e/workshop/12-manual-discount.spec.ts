import { expect, test, type Page } from '@playwright/test'
import {
  addItem, api, evidence, freshPlate, ITEMS, itemRow, openNoteViaDialog, payCash, receiptDialog, requireStock, rupiah, t,
} from './helpers'

type TxItem = { productSku: string; unitPrice: number; listPrice: number | null; discountReason: string | null; discountNote: string | null }
type Tx = {
  id: string; transactionId: string; status: string; totalAmount: number; discountAmount: number
  manualDiscount: number; discountReason: string | null; discountNote: string | null; items: TxItem[]
}
type Report = {
  total: { amount: number; count: number }
  rows: { transactionId: string; kind: 'line' | 'sale'; amount: number; reason: string; status: string }[]
}

const reason = (code: string) => t(`discount.reason.${code}`)
const findSale = async (page: Page, number: string) => {
  const res = await api(page).q<{ transactions: Tx[] }>('transactions.list', { limit: 50 })
  return res.transactions.find((x) => x.transactionId === number) ?? null
}

/** The price dialog: a lower price is refused until a reason is chosen. */
async function lowerPrice(page: Page, price: number, why: string) {
  const dialog = page.getByRole('dialog').filter({ hasText: t('discount.line.newPrice') })
  await dialog.getByLabel(t('discount.line.newPrice')).fill(String(price))
  await dialog.getByRole('button', { name: t('common.save') }).click()
  await expect(dialog.getByRole('alert')).toHaveText(t('discount.reasonRequired'))
  await dialog.getByRole('radio', { name: reason(why) }).click()
  await dialog.getByRole('button', { name: t('common.save') }).click()
  await expect(dialog).toBeHidden()
}

test('service note: a lowered price and a discount on the note need a reason, print on the receipt and reach the report', async ({ page }) => {
  await requireStock(page, ITEMS.sparkPlug.sku, 1)
  const a = api(page)
  const plate = freshPlate('DSC')
  await openNoteViaDialog(page, plate)
  await addItem(page, ITEMS.lightService)
  await addItem(page, ITEMS.sparkPlug)

  // Spark plug 25.000 → 20.000: damaged box.
  await itemRow(page, ITEMS.sparkPlug.name).getByRole('button', { name: `${t('discount.line.button')} ${ITEMS.sparkPlug.name}` }).click()
  await lowerPrice(page, 20_000, 'DAMAGED')
  await expect(page.getByText(`${t('discount.line.from').replace('{price}', 'Rp 25.000')} · ${reason('DAMAGED')}`)).toBeVisible()

  // Rp5.000 off the note: "Other" needs a note.
  await page.getByRole('button', { name: t('discount.total.button'), exact: true }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: t('discount.total.due') })
  await dialog.getByLabel(t('discount.total.amount')).fill('5000')
  await dialog.getByRole('radio', { name: reason('OTHER') }).click()
  await dialog.getByRole('button', { name: t('common.save') }).click()
  await expect(dialog.getByRole('alert')).toHaveText(t('discount.noteRequired'))
  await dialog.getByLabel(t('discount.noteRequiredLabel')).fill('pelanggan tetap')
  await dialog.getByRole('button', { name: t('common.save') }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(t('discount.applied').replace('{amount}', 'Rp 5.000').replace('{reason}', reason('OTHER')))).toBeVisible()
  await expect(page.getByText(rupiah(65_000)).first()).toBeVisible()

  await payCash(page)
  const receipt = receiptDialog(page)
  await expect(receipt.getByText('Normal Rp 25.000, hemat Rp 5.000')).toBeVisible()
  await expect(receipt.getByText(rupiah(65_000)).first()).toBeVisible()

  const lookup = await a.lookup(plate)
  expect(lookup.openServiceOrderId).toBeNull()
  await expect.poll(async () => (await findSale(page, (await receipt.locator('.receipt-row', { hasText: 'No. Transaksi:' }).locator('.receipt-value').textContent())!.trim()))?.status).toBe('completed')
  const number = (await receipt.locator('.receipt-row', { hasText: 'No. Transaksi:' }).locator('.receipt-value').textContent())!.trim()
  const sale = (await findSale(page, number))!
  expect(sale).toMatchObject({ totalAmount: 65_000, discountAmount: 5_000, manualDiscount: 5_000, discountReason: 'OTHER', discountNote: 'pelanggan tetap' })
  expect(sale.items.find((i) => i.productSku === ITEMS.sparkPlug.sku)).toMatchObject({ unitPrice: 20_000, listPrice: 25_000, discountReason: 'DAMAGED' })
  expect(sale.items.find((i) => i.productSku === ITEMS.lightService.sku)).toMatchObject({ unitPrice: 50_000, discountReason: null })

  const report = await a.q<Report>('transactions.manualDiscounts', { days: 1 })
  expect(report.rows.filter((r) => r.transactionId === sale.id).map((r) => [r.kind, r.amount, r.reason]).sort())
    .toEqual([['line', 5_000, 'DAMAGED'], ['sale', 5_000, 'OTHER']])

  await receipt.getByRole('button', { name: 'Batal' }).click()
  await page.goto('/warehouse/reports')
  await expect(page.getByText(t('reports.discounts.title'), { exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: number }).first()).toBeVisible()
  evidence('note-discount', { plate, number, total: sale.totalAmount, reportTotal: report.total.amount })
})

test('quick cashier: price change and percent discount with reasons; void needs the cashier reason and only a PIN to approve', async ({ page }) => {
  const a = api(page)
  const outletId = await a.outletId()
  const stockBefore = await requireStock(page, ITEMS.sparkPlug.sku, 1)

  // The server refuses a discount without a proper reason or larger than the sale.
  const productId = await a.productId(ITEMS.sparkPlug.sku)
  const base = { outletId, status: 'pending', paymentMethod: 'cash', items: [{ productId, quantity: 1 }] }
  await expect(a.m('transactions.create', { ...base, items: [{ productId, quantity: 1, priceOverride: { unitPrice: 1000, reason: 'OTHER' } }] }))
    .rejects.toThrow(/Describe the reason/)
  await expect(a.m('transactions.create', { ...base, manualDiscount: { amount: 999_999, reason: 'ROUNDING' } }))
    .rejects.toThrow(/larger than the amount due/)

  await page.goto('/pos/sales')
  await page.getByRole('button', { name: new RegExp(ITEMS.sparkPlug.name) }).first().click()
  await page.getByRole('button', { name: 'Tambah ke Keranjang' }).click()
  await page.getByRole('button', { name: /Checkout/ }).first().click()
  // The innermost panel holding both the cart heading and its pay button.
  const drawer = page.locator('div')
    .filter({ has: page.getByRole('heading', { name: /Keranjang/ }) })
    .filter({ has: page.getByRole('button', { name: /^Bayar/ }) })
    .last()

  await drawer.getByRole('button', { name: `${t('discount.line.button')} ${ITEMS.sparkPlug.name}` }).click()
  await lowerPrice(page, 22_000, 'ROUNDING')
  await expect(drawer.getByText(`${t('discount.line.from').replace('{price}', 'Rp 25.000')} · ${reason('ROUNDING')}`)).toBeVisible()

  // 10% of 22.000 off the sale.
  await drawer.getByRole('button', { name: new RegExp(`^${t('discount.total.button')}`) }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: t('discount.total.due') })
  await dialog.getByRole('button', { name: '%' }).click()
  await dialog.getByLabel(t('discount.total.percent')).fill('10')
  await expect(dialog.getByText(rupiah(19_800))).toBeVisible()
  await dialog.getByRole('radio', { name: reason('OWNER_POLICY') }).click()
  await dialog.getByRole('button', { name: t('common.save') }).click()
  await expect(dialog).toBeHidden()

  await drawer.getByRole('button', { name: /Bayar/ }).click()
  await page.getByRole('button', { name: /^Cash/ }).click()
  await page.getByRole('button', { name: 'Uang Pas' }).click()
  await page.getByRole('button', { name: /^Konfirmasi/ }).click()
  const receipt = receiptDialog(page)
  await expect(receipt).toBeVisible()
  await expect(receipt.getByText('Normal Rp 25.000, hemat Rp 3.000')).toBeVisible()
  const number = (await receipt.locator('.receipt-row', { hasText: 'No. Transaksi:' }).locator('.receipt-value').textContent())!.trim()
  await receipt.getByRole('button', { name: 'Batal' }).click()

  const sale = (await findSale(page, number))!
  expect(sale).toMatchObject({ status: 'completed', totalAmount: 19_800, discountAmount: 2_200, manualDiscount: 2_200, discountReason: 'OWNER_POLICY' })
  expect(sale.items[0]).toMatchObject({ unitPrice: 22_000, listPrice: 25_000, discountReason: 'ROUNDING' })
  expect(await a.stock(ITEMS.sparkPlug.sku, outletId)).toBe(stockBefore - 1)

  // Void: the cashier must explain; the approver only approves with a PIN.
  await page.goto('/transactions')
  const row = page.getByRole('row').filter({ hasText: number })
  await expect(row.getByText(`${t('transactions.manualDiscount')}:`)).toBeVisible()
  await row.getByRole('button', { name: 'Void' }).click()
  const reasonBox = page.getByPlaceholder('Contoh: Pelanggan membatalkan, salah input…')
  await reasonBox.fill('batal')
  await page.getByRole('button', { name: 'Konfirmasi Void' }).click()
  await expect(page.getByText('Alasan minimal 10 karakter')).toBeVisible()
  const why = `Salah input harga ${number.slice(-5)}`
  await reasonBox.fill(why)
  await page.getByRole('button', { name: 'Konfirmasi Void' }).click()
  await expect(page.getByText(t('transactions.voidRequested'))).toBeVisible()
  expect((await findSale(page, number))!.status).toBe('completed')

  const password = process.env.WORKSHOP_TEST_PASSWORD
  if (!password) throw new Error('WORKSHOP_TEST_PASSWORD is needed to set the approver PIN')
  await a.m('users.setPin', { pin: '4321', currentPassword: password })

  await page.goto('/approvals')
  const card = page.locator('div').filter({ hasText: why }).filter({ has: page.getByRole('button', { name: 'Setuju', exact: true }) }).last()
  await card.getByRole('button', { name: 'Setuju', exact: true }).click()
  const pinDialog = page.getByRole('dialog')
  await pinDialog.locator('input').first().click()
  await page.keyboard.type('4321')
  await pinDialog.getByRole('button', { name: /Verifikasi & Setujui/ }).click()
  await expect(pinDialog).toBeHidden()

  await expect.poll(async () => (await findSale(page, number))?.status).toBe('voided')
  expect(await a.stock(ITEMS.sparkPlug.sku, outletId)).toBe(stockBefore)
  const report = await a.q<Report>('transactions.manualDiscounts', { days: 1 })
  expect(report.rows.filter((r) => r.transactionId === sale.id).every((r) => r.status === 'voided')).toBe(true)
  evidence('pos-discount-void', { number, total: sale.totalAmount, voidReason: why, stockBefore })
})
