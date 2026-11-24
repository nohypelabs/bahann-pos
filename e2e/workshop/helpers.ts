import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { trpcMutation, trpcQuery } from './trpc'

const ID: Record<string, string> = JSON.parse(readFileSync('src/locales/id.json', 'utf8'))

/** Indonesian UI text for a locale key, so a copy change does not break selectors. */
export function t(key: string): string {
  const text = ID[key]
  if (!text) throw new Error(`Missing locale key ${key}`)
  return text
}

/** "Rp 110.000" with any spacing, as formatCurrency renders it. */
export const rupiah = (n: number) => new RegExp(`Rp\\s?${n.toLocaleString('id-ID').replace(/\./g, '\\.')}(?!\\d)`)

/** A plate no earlier run has used: E2E + a tag + base-36 time. */
export const freshPlate = (tag: string) => `E2E${tag}${Date.now().toString(36).toUpperCase().slice(-6)}`

/** The member vehicle seeded by scripts/workshop-test-tenant.mjs (Andi, M0001). */
/** One line of evidence for docs/testing/WORKSHOP_E2E_LOG.md. */
export const evidence = (what: string, data: Record<string, unknown>) => console.log(`  [evidence] ${what} ${JSON.stringify(data)}`)

export const MEMBER_PLATE = 'B1234UJI'

export const ITEMS = {
  lightService: { sku: 'JASA-SRV-RINGAN', name: 'Jasa Servis Ringan', price: 50_000 },
  oilChange: { sku: 'JASA-GANTI-OLI', name: 'Jasa Ganti Oli', price: 15_000 },
  oil: { sku: 'OLI-MPX1-08', name: 'Oli AHM MPX1 0.8L', price: 55_000 },
  sparkPlug: { sku: 'BUSI-NGK-C7', name: 'Busi NGK C7HSA', price: 25_000 },
} as const

export interface Lookup {
  plateNumber: string
  owner: { id: string; name: string; memberCode: string | null } | null
  stampCard: { balance: number; required: number } | null
  vouchers: { id: string; code: string; source: string }[]
  openServiceOrderId: string | null
}

export interface Note {
  id: string
  status: 'open' | 'paid' | 'cancelled'
  outletId: string
  paidTotal: number | null
  transactionId: string | null
  items: { productSku: string; quantity: number; unitPrice: number | null }[]
}

export function api(page: Page) {
  const q = <T>(path: string, input?: unknown) => trpcQuery<T>(page.request, path, input)
  const m = <T>(path: string, input?: unknown) => trpcMutation<T>(page.request, path, input)
  return {
    q,
    m,
    lookup: (plate: string) => q<Lookup>('workshop.vehicles.lookup', { plate }),
    note: (id: string) => q<Note>('workshop.notes.get', { id }),
    outletId: async () => (await q<{ outlets: { id: string }[] }>('outlets.getAll')).outlets[0].id,
    productId: async (sku: string) => {
      const res = await q<{ products: { id: string; sku: string }[] }>('products.getAll', { search: sku, limit: 5 })
      const p = res.products.find((x) => x.sku === sku)
      if (!p) throw new Error(`Product ${sku} not found on the test tenant`)
      return p.id
    },
    /** Latest closing stock of a product at the outlet. */
    stock: async (sku: string, outletId: string) => {
      const productId = await q<{ products: { id: string; sku: string }[] }>('products.getAll', { search: sku, limit: 5 })
        .then((r) => r.products.find((x) => x.sku === sku)!.id)
      const row = await q<{ stockAkhir: number } | null>('stock.getLatest', { productId, outletId })
      return row?.stockAkhir ?? 0
    },
    /** Cancels an open note a previous, interrupted run left on this plate. */
    clearOpenNote: async (plate: string) => {
      const found = await q<Lookup>('workshop.vehicles.lookup', { plate })
      if (found.openServiceOrderId) await m('workshop.notes.cancel', { id: found.openServiceOrderId, reason: 'E2E cleanup' })
    },
  }
}

/** Fails early with a clear message when the test tenant ran out of a part. */
export async function requireStock(page: Page, sku: string, needed: number) {
  const a = api(page)
  const have = await a.stock(sku, await a.outletId())
  expect(have, `Stock of ${sku} on the test tenant is ${have}; top it up (Catat Stok) before running the suite`).toBeGreaterThanOrEqual(needed)
  return have
}

/** Opens a note from the notes list through the "Nota baru" dialog; returns the note id. */
export async function openNoteViaDialog(page: Page, plate: string, opts: { brand?: string; model?: string; odometer?: string; complaint?: string } = {}) {
  await page.goto('/pos/notes')
  await page.getByRole('button', { name: t('workshop.notes.new') }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(t('workshop.plate')).fill(plate)
  await dialog.getByRole('button', { name: t('workshop.newNote.check') }).click()
  if (opts.brand) await dialog.getByLabel(t('workshop.brand')).fill(opts.brand)
  if (opts.model) await dialog.getByLabel(t('workshop.model')).fill(opts.model)
  if (opts.odometer) await dialog.getByLabel(t('workshop.odometer')).fill(opts.odometer)
  if (opts.complaint) await dialog.getByLabel(t('workshop.complaint')).fill(opts.complaint)
  await dialog.getByRole('button', { name: t('workshop.newNote.open'), exact: true }).click()
  await page.waitForURL(/\/pos\/notes\/[0-9a-f-]{36}$/)
  return page.url().split('/').pop()!
}

/** Adds an item to the open note through the search box. */
export async function addItem(page: Page, item: { sku: string; name: string }) {
  await page.getByPlaceholder(t('workshop.note.searchItem')).fill(item.sku)
  await page.getByRole('button', { name: new RegExp(item.name) }).first().click()
  await expect(itemRow(page, item.name)).toBeVisible()
}

/** The innermost element of a note line that holds the item name and its +/- buttons. */
export const itemRow = (page: Page, name: string) =>
  page.locator('div')
    .filter({ has: page.getByText(name, { exact: true }) })
    .filter({ has: page.getByRole('button', { name: '+', exact: true }) })
    .last()

/** Pays the open note in cash (the exact amount unless `given` is set) and waits for the receipt. */
export async function payCash(page: Page, given?: number) {
  await page.getByRole('button', { name: t('workshop.note.pay'), exact: true }).click()
  await page.getByRole('button', { name: /^Cash/ }).click()
  if (given) await page.getByPlaceholder('0', { exact: true }).fill(String(given))
  else await page.getByRole('button', { name: 'Uang Pas' }).click()
  await page.getByRole('button', { name: /^Konfirmasi/ }).click()
  await expect(receiptDialog(page)).toBeVisible()
}

/** The receipt preview that opens after a payment. */
export const receiptDialog = (page: Page) => page.getByRole('dialog', { name: 'Preview Struk' })
