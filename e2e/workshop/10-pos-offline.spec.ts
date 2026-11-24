import { expect, test } from '@playwright/test'
import { api, evidence, ITEMS, receiptDialog } from './helpers'

type Tx = { transactionId: string; totalAmount: number; status: string }

test('quick cashier: a sale made offline is sent when the connection is back', async ({ page, context }) => {
  const a = api(page)
  await page.goto('/pos/sales')
  await page.getByRole('button', { name: new RegExp(ITEMS.oilChange.name) }).first().click()
  await page.getByRole('button', { name: 'Tambah ke Keranjang' }).click()

  await context.setOffline(true)
  await page.getByRole('button', { name: /Bayar/ }).last().click()

  const receipt = receiptDialog(page)
  await expect(receipt).toBeVisible()
  const number = (await receipt.locator('.receipt-row', { hasText: 'No. Transaksi:' }).locator('.receipt-value').textContent())!.trim()
  await receipt.getByRole('button', { name: 'Batal' }).click()

  // Waiting in IndexedDB (this count was always 0 before `synced` became 0/1).
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve) => {
    const open = indexedDB.open('LakuPOSOfflineDB')
    open.onsuccess = () => {
      const req = open.result.transaction('transactions').objectStore('transactions').index('synced').count(0)
      req.onsuccess = () => resolve(req.result)
    }
  }))).toBeGreaterThan(0)

  await context.setOffline(false)
  const findSale = async () => {
    const res = await a.q<{ transactions?: Tx[] } | Tx[]>('transactions.list', { limit: 50 })
    const rows = Array.isArray(res) ? res : res.transactions ?? []
    return rows.find((t) => t.transactionId === number) ?? null
  }
  await expect.poll(findSale, { timeout: 60_000, intervals: [2_000] }).not.toBeNull()
  expect(await findSale()).toMatchObject({ totalAmount: ITEMS.oilChange.price, status: 'completed' })
  evidence('pos-offline', { number })
})
