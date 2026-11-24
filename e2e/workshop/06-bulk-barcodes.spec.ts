import { expect, test } from '@playwright/test'
import { api, evidence, t } from './helpers'

test('"fill missing barcodes" covers goods but leaves services alone', async ({ page }) => {
  const a = api(page)
  await page.goto('/products')
  const tag = Date.now().toString(36).toUpperCase()
  const part = await a.m<{ id: string }>('products.create', {
    sku: `E2E-PART-${tag}`, name: `E2E Part ${tag}`, price: 1000, category: 'E2E',
    itemType: 'PRODUCT', stockBehavior: 'UNTRACKED', pricingModel: 'FIXED',
  })
  const labour = await a.m<{ id: string }>('products.create', {
    sku: `E2E-JASA-${tag}`, name: `E2E Jasa ${tag}`, price: 1000, category: 'E2E',
    itemType: 'SERVICE', stockBehavior: 'UNTRACKED', pricingModel: 'FIXED',
  })

  try {
    await page.reload()
    await page.getByRole('button', { name: t('products.codes.assignAll') }).click()
    await expect(page.getByText(/produk diberi barcode baru/)).toBeVisible()

    const [p, s] = await a.q<{ id: string; barcode: string | null }[]>('products.getForLabels', { ids: [part.id, labour.id] })
      .then((rows) => [rows.find((r) => r.id === part.id)!, rows.find((r) => r.id === labour.id)!])
    expect(p.barcode).toMatch(/^20\d{11}$/)
    expect(s.barcode).toBeNull()
    evidence('bulk-barcodes', { part: p.barcode, service: s.barcode })
  } finally {
    await a.m('products.delete', { id: part.id })
    await a.m('products.delete', { id: labour.id })
  }
})
