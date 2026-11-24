import { expect, test } from '@playwright/test'
import { ITEMS, t } from './helpers'

test('select products, print A4 labels, and lay out a custom sheet', async ({ page }) => {
  await page.goto('/products')
  for (const item of [ITEMS.oil, ITEMS.sparkPlug]) {
    await page.locator('tr', { hasText: item.name }).getByRole('checkbox').check()
  }
  await page.getByRole('button', { name: t('products.labels.print') }).click()
  await page.waitForURL('**/products/labels')

  // In the item list (the preview repeats the names).
  await expect(page.getByRole('paragraph').filter({ hasText: ITEMS.oil.name })).toBeVisible()
  await expect(page.getByRole('paragraph').filter({ hasText: ITEMS.sparkPlug.name })).toBeVisible()
  await expect(page.getByText(t('products.labels.preview'))).toBeVisible()

  // 25 + 1 labels on the 21-per-sheet preset → 2 sheets.
  await page.getByLabel(t('products.labels.copies')).first().fill('25')
  await expect(page.getByText('26 label · 2 lembar A4')).toBeVisible()

  // Intercept the print call to inspect the document instead of opening the dialog.
  await page.evaluate(() => {
    const w = window as unknown as { __printed?: unknown }
    new MutationObserver((records) => {
      for (const r of records) for (const node of r.addedNodes) {
        if (!(node instanceof HTMLIFrameElement)) continue
        node.contentWindow!.print = () => {
          const doc = node.contentDocument!
          const pages = [...doc.body.children]
          w.__printed = {
            pageStyle: [...doc.querySelectorAll('style')].pop()?.textContent ?? '',
            labelsPerPage: pages.map((p) => p.children.length),
            barcodes: doc.querySelectorAll('svg').length,
          }
        }
      }
    }).observe(document.body, { childList: true })
  })
  await page.getByRole('button', { name: t('products.labels.print') }).click()
  type Printed = { pageStyle: string; labelsPerPage: number[]; barcodes: number }
  const readPrinted = () => page.evaluate(() => (window as unknown as { __printed?: Printed }).__printed ?? null)
  await expect.poll(readPrinted).not.toBeNull()
  const printed = (await readPrinted())!
  expect(printed.pageStyle).toContain('size: A4')
  expect(printed.labelsPerPage).toEqual([21, 5])
  expect(printed.barcodes).toBe(26)

  // Custom sheet: decimal commas survive typing; a grid wider than A4 blocks printing.
  await page.getByLabel(t('products.labels.sheet')).selectOption('custom')
  const width = page.getByLabel(t('products.labels.width'))
  await width.fill('52,5')
  await expect(width).toHaveValue('52,5')
  await page.getByLabel(t('products.labels.columns'), { exact: true }).fill('4')
  await expect(page.getByText(t('products.labels.doesNotFit'))).toHaveCount(0)
  await width.fill('70')
  await expect(page.getByText(t('products.labels.doesNotFit'))).toBeVisible()
  await expect(page.getByRole('button', { name: t('products.labels.print') })).toBeDisabled()
})
