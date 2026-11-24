import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'
import { api, evidence, t } from './helpers'

type Product = { id: string; sku: string; name: string; barcode: string | null; price: number | null; cost_price: number | null; item_type: string; stock_behavior: string; category: string | null }

/** A shop-style file: title rows, the shop's own column names, ~950 rows, a few broken ones. */
function shopFile(tag: string, priceBump = 0) {
  const rows: unknown[][] = [
    [`DAFTAR STOK BARANG ${tag}`],
    ['per 20 November 2026'],
    ['No', 'Kode Barang', 'Nama Barang', 'Jenis', 'Kategori', 'Harga Beli', 'Harga Jual', 'Barcode', 'Qty'],
  ]
  for (let i = 1; i <= 900; i++) {
    const code = `${tag}-${String(i).padStart(4, '0')}`
    rows.push([i, code, `Part ${tag} ${i}`, 'Sparepart', i % 2 ? 'Oli' : 'Kampas', 10_000 + i, `Rp ${(15_000 + i + priceBump).toLocaleString('id-ID')}`, `29${String(Date.now()).slice(-6)}${String(i).padStart(5, '0')}`, i % 10])
  }
  for (let i = 1; i <= 40; i++) rows.push([900 + i, '', `Jasa ${tag} ${i}`, 'Jasa', 'Jasa', '', 20_000 + priceBump, '', ''])
  // Broken: no name, price not a number, barcode turned into scientific notation, SKU twice.
  rows.push([941, `${tag}-X1`, '', 'Sparepart', '', '', 1000, '', 1])
  rows.push([942, `${tag}-X2`, `Rusak harga ${tag}`, 'Sparepart', '', '', 'dua ribu', '', 1])
  rows.push([943, `${tag}-X3`, `Rusak barcode ${tag}`, 'Sparepart', '', '', 1000, '8,99123E+12', 1])
  rows.push([944, `${tag}-0001`, `Dobel ${tag}`, 'Sparepart', '', '', 1000, '', 1])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Stok')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

async function importFile(page: import('@playwright/test').Page, buffer: Buffer, name: string, existing: 'skip' | 'update') {
  await page.goto('/products')
  await page.getByRole('button', { name: 'Import Excel' }).click()
  await page.getByLabel(t('products.import.chooseFile')).setInputFiles({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer })
  if (existing === 'update') await page.getByLabel(t('products.import.existingUpdate')).check()
  await page.getByRole('button', { name: /^Impor \d+ baris$/ }).click()
  const result = page.getByRole('status').filter({ hasText: t('products.import.result.created') })
  await expect(result).toBeVisible({ timeout: 120_000 })
  const read = async (key: string) => Number(await result.locator('div', { hasText: t(`products.import.result.${key}`) }).locator('p').first().textContent())
  return { created: await read('created'), updated: await read('updated'), skipped: await read('skipped'), failed: await read('failed'), stocked: await read('stocked') }
}

test('import ~950 rows from a shop-style Excel file, then re-import to skip and to update', async ({ page }) => {
  test.setTimeout(300_000)
  const a = api(page)
  const tag = `IMP${Date.now().toString(36).toUpperCase().slice(-5)}`
  const outletId = await (async () => { await page.goto('/products'); return a.outletId() })()

  try {
    // Preview: header found under the title, broken rows flagged, generated SKUs counted.
    await page.getByRole('button', { name: 'Import Excel' }).click()
    await page.getByLabel(t('products.import.chooseFile')).setInputFiles({ name: `${tag}.xlsx`, mimeType: 'application/octet-stream', buffer: shopFile(tag) })
    const summary = page.getByRole('status').first()
    await expect(summary).toContainText(t('products.import.headerAt').replace('{row}', '3'))
    await expect(summary).toContainText(t('products.import.ready').replace('{n}', '940'))
    await expect(summary).toContainText(t('products.import.invalid').replace('{n}', '4'))
    await expect(summary).toContainText(t('products.import.autoSku').replace('{n}', '40'))
    await page.getByLabel(t('products.import.onlyProblems')).check()
    await expect(page.getByText(t('products.import.issue.BARCODE_SCIENTIFIC'))).toBeVisible()
    await expect(page.getByText(t('products.import.issue.DUPLICATE_SKU'))).toBeVisible()

    const first = await importFile(page, shopFile(tag), `${tag}.xlsx`, 'skip')
    expect(first).toEqual({ created: 940, updated: 0, skipped: 0, failed: 0, stocked: 810 })

    const found = await a.q<{ products: Product[] }>('products.getAll', { search: tag, all: true })
    const bySku = new Map(found.products.map((p) => [p.sku, p]))
    const p7 = bySku.get(`${tag}-0007`)!
    expect(p7).toMatchObject({ name: `Part ${tag} 7`, price: 15_007, cost_price: 10_007, item_type: 'PRODUCT', stock_behavior: 'TRACKED', category: 'Oli' })
    expect(p7.barcode).toMatch(/^29\d{11}$/)
    expect(await a.stock(`${tag}-0007`, outletId)).toBe(7)
    const services = found.products.filter((p) => p.item_type === 'SERVICE')
    expect(services).toHaveLength(40)
    expect(services.every((s) => s.stock_behavior === 'UNTRACKED' && /^JAS-\d{5}$/.test(s.sku))).toBe(true)

    // Same file again: everything that exists is skipped and nothing changes.
    // Services have no SKU in the file: they are matched by name, not created twice.
    const again = await importFile(page, shopFile(tag), `${tag}.xlsx`, 'skip')
    expect(again).toMatchObject({ created: 0, skipped: 940, failed: 0, stocked: 0 })
    expect(await a.stock(`${tag}-0007`, outletId)).toBe(7)

    // Prices raised by 500: update mode changes prices, leaves stock alone.
    const updated = await importFile(page, shopFile(tag, 500), `${tag}.xlsx`, 'update')
    expect(updated).toMatchObject({ created: 0, updated: 940, failed: 0, stocked: 0 })
    const after = await a.q<{ products: Product[] }>('products.getAll', { search: `${tag}-0007`, all: true })
    expect(after.products.find((p) => p.sku === `${tag}-0007`)).toMatchObject({ price: 15_507, cost_price: 10_007 })
    expect(await a.stock(`${tag}-0007`, outletId)).toBe(7)

    evidence('catalog-import', { tag, first, again, updated: updated.updated, sample: { sku: p7.sku, barcode: p7.barcode } })
  } finally {
    const leftovers = await a.q<{ products: Product[] }>('products.getAll', { search: tag, all: true })
    const ids = leftovers.products.map((p) => p.id)
    for (let i = 0; i < ids.length; i += 200) await a.m('products.batchDelete', { productIds: ids.slice(i, i + 200) })
  }
})
