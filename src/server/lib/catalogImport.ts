// Imports a product catalogue checked on the products page (src/lib/products/
// catalogImport.ts). Called in batches by products.importCatalog.
//
// Existing SKUs (or, for a row without a SKU, the product with that exact name)
// are skipped or updated, as the user chose; nothing is overwritten with blanks. A missing SKU is generated (category prefix + running number). A
// barcode already used by another product is refused. Initial stock is recorded
// for new tracked items at the chosen outlet. One bad row only fails itself.
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { supabaseAdmin } from '@/infra/supabase/server'
import { SupabaseBusinessProfileRepository } from '@/infra/repositories/SupabaseBusinessProfileRepository'
import { BUSINESS_TYPE_DEFAULTS } from '@/domain/entities/BusinessProfile'
import { formatSku, skuPrefix } from '@/domain/catalog/productCodes'
import { businessDate } from '@/lib/business/timezone'
import { assertOutletAccessible } from '@/server/lib/tenant'

const PAGE = 1000
const CHUNK = 100

export const catalogImportInput = z.object({
  /** Outlet that receives the initial stock; required when any row has stock. */
  outletId: z.string().uuid().optional(),
  existing: z.enum(['skip', 'update']),
  rows: z.array(z.object({
    row: z.number().int().positive(),
    sku: z.string().trim().max(60).nullish(),
    name: z.string().trim().min(1).max(200),
    kind: z.enum(['PRODUCT', 'SERVICE', 'MENU', 'PACKAGE']).nullish(),
    category: z.string().trim().max(100).nullish(),
    price: z.number().min(0).max(1_000_000_000).nullish(),
    costPrice: z.number().min(0).max(1_000_000_000).nullish(),
    barcode: z.string().trim().max(40).nullish(),
    initialStock: z.number().int().min(0).max(1_000_000).nullish(),
  })).min(1).max(500),
})

export type CatalogImportInput = z.infer<typeof catalogImportInput>
type Row = CatalogImportInput['rows'][number]

export type CatalogImportReason = 'EXISTS' | 'SKU_TAKEN' | 'BARCODE_TAKEN' | 'INSERT_FAILED' | 'UPDATE_FAILED'

export interface CatalogImportResult {
  created: { row: number; sku: string }[]
  updated: { row: number; sku: string }[]
  skipped: { row: number; sku: string; reason: CatalogImportReason }[]
  failed: { row: number; sku: string | null; reason: CatalogImportReason; detail?: string }[]
  /** Rows whose initial stock was recorded. */
  stocked: number
}

const STOCK_BEHAVIOR: Record<string, string> = { PRODUCT: 'TRACKED', SERVICE: 'UNTRACKED', MENU: 'UNTRACKED', PACKAGE: 'UNTRACKED' }

async function existingProducts(tenantId: string) {
  const rows: { id: string; sku: string; name: string; barcode: string | null }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('products').select('id, sku, name, barcode').eq('tenant_id', tenantId).order('id').range(from, from + PAGE - 1)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < PAGE) return rows
  }
}

export async function importCatalog(
  ctx: { userId: string; tenantId: string },
  input: CatalogImportInput,
): Promise<CatalogImportResult> {
  const { userId, tenantId } = ctx
  const result: CatalogImportResult = { created: [], updated: [], skipped: [], failed: [], stocked: 0 }

  const wantsStock = input.rows.some((r) => (r.initialStock ?? 0) > 0)
  if (wantsStock) {
    if (!input.outletId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'OUTLET_REQUIRED' })
    await assertOutletAccessible(userId, tenantId, input.outletId)
  }

  const profile = await new SupabaseBusinessProfileRepository().findByTenantId(tenantId)
  const defaultKind = (profile ? BUSINESS_TYPE_DEFAULTS[profile.businessType].defaultItemType : 'PRODUCT') as Row['kind']

  const existing = await existingProducts(tenantId)
  const bySku = new Map(existing.map((p) => [p.sku.toUpperCase(), p]))
  const byBarcode = new Map(existing.filter((p) => p.barcode).map((p) => [p.barcode!, p]))
  // A row without a SKU is the same product as one with exactly that name, so
  // importing the same file twice does not create every SKU-less item again.
  const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')
  const byName = new Map<string, (typeof existing)[number] | null>()
  for (const p of existing) byName.set(nameKey(p.name), byName.has(nameKey(p.name)) ? null : p)

  const toCreate: (Row & { sku: string })[] = []
  const toUpdate: { row: Row; id: string; sku: string }[] = []
  const needSku: Row[] = []

  for (const row of input.rows) {
    const sku = row.sku?.toUpperCase() || null
    const current = sku ? bySku.get(sku) : byName.get(nameKey(row.name)) ?? undefined
    const holder = row.barcode ? byBarcode.get(row.barcode) : undefined
    if (holder && holder.id !== current?.id) {
      result.failed.push({ row: row.row, sku, reason: 'BARCODE_TAKEN', detail: holder.sku })
      continue
    }
    if (current) {
      if (input.existing === 'skip') result.skipped.push({ row: row.row, sku: current.sku, reason: 'EXISTS' })
      else toUpdate.push({ row, id: current.id, sku: current.sku })
      continue
    }
    if (sku) toCreate.push({ ...row, sku })
    else needSku.push(row)
  }

  // Generated SKUs from the tenant's counter, skipping any already taken.
  if (needSku.length > 0) {
    const taken = new Set([...bySku.keys(), ...toCreate.map((r) => r.sku)])
    const { data, error } = await supabaseAdmin.rpc('next_product_codes', { p_tenant_id: tenantId, p_kind: 'sku', p_count: needSku.length + 20 })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    const numbers = (data as number[]).map(Number)
    let next = 0
    for (const row of needSku) {
      let sku = ''
      while (next < numbers.length) {
        sku = formatSku(skuPrefix(row.category), numbers[next++])
        if (!taken.has(sku)) break
        sku = ''
      }
      if (!sku) { result.failed.push({ row: row.row, sku: null, reason: 'SKU_TAKEN' }); continue }
      taken.add(sku)
      toCreate.push({ ...row, sku })
    }
  }

  // Inserts in chunks; a chunk that fails is retried row by row to isolate the bad one.
  const record = (r: Row & { sku: string }) => {
    const kind = r.kind ?? defaultKind ?? 'PRODUCT'
    return {
      tenant_id: tenantId,
      owner_id: userId,
      sku: r.sku,
      name: r.name,
      category: r.category || null,
      price: r.price ?? null,
      cost_price: r.costPrice ?? null,
      barcode: r.barcode || null,
      item_type: kind,
      stock_behavior: STOCK_BEHAVIOR[kind] ?? 'TRACKED',
      pricing_model: 'FIXED',
    }
  }
  const createdIds = new Map<number, { id: string; tracked: boolean }>()
  const insert = async (rows: (Row & { sku: string })[]) => {
    const { data, error } = await supabaseAdmin.from('products').insert(rows.map(record)).select('id, sku, stock_behavior')
    if (!error) {
      const ids = new Map((data ?? []).map((d) => [String(d.sku), d]))
      for (const r of rows) {
        const d = ids.get(r.sku)!
        createdIds.set(r.row, { id: d.id as string, tracked: d.stock_behavior === 'TRACKED' })
        result.created.push({ row: r.row, sku: r.sku })
      }
      return
    }
    if (rows.length === 1) {
      const msg = error.message
      const reason: CatalogImportReason = msg.includes('barcode') ? 'BARCODE_TAKEN' : msg.includes('sku') ? 'SKU_TAKEN' : 'INSERT_FAILED'
      result.failed.push({ row: rows[0].row, sku: rows[0].sku, reason, detail: msg })
      return
    }
    for (const r of rows) await insert([r])
  }
  for (let i = 0; i < toCreate.length; i += CHUNK) await insert(toCreate.slice(i, i + CHUNK))

  // Updates change only the cells that were filled in.
  const updateOne = async ({ row, id, sku }: (typeof toUpdate)[number]) => {
    const patch: Record<string, unknown> = { name: row.name }
    if (row.category) patch.category = row.category
    if (row.price != null) patch.price = row.price
    if (row.costPrice != null) patch.cost_price = row.costPrice
    if (row.barcode) patch.barcode = row.barcode
    const { error } = await supabaseAdmin.from('products').update(patch).eq('tenant_id', tenantId).eq('id', id)
    if (error) result.failed.push({ row: row.row, sku, reason: error.message.includes('barcode') ? 'BARCODE_TAKEN' : 'UPDATE_FAILED', detail: error.message })
    else result.updated.push({ row: row.row, sku })
  }
  for (let i = 0; i < toUpdate.length; i += 10) await Promise.all(toUpdate.slice(i, i + 10).map(updateOne))

  // Initial stock for the new tracked items: today's row and a stock-in movement.
  if (wantsStock && input.outletId) {
    const today = businessDate()
    const stocked = toCreate
      .map((r) => ({ r, created: createdIds.get(r.row) }))
      .filter(({ r, created }) => created?.tracked && (r.initialStock ?? 0) > 0)
    for (let i = 0; i < stocked.length; i += CHUNK) {
      const chunk = stocked.slice(i, i + CHUNK)
      const { error: stockError } = await supabaseAdmin.from('daily_stock').upsert(chunk.map(({ r, created }) => ({
        tenant_id: tenantId, product_id: created!.id, outlet_id: input.outletId!, stock_date: today,
        stock_awal: 0, stock_in: r.initialStock!, stock_out: 0, stock_akhir: r.initialStock!,
      })), { onConflict: 'product_id,outlet_id,stock_date' })
      if (stockError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: stockError.message })
      const { error: movementError } = await supabaseAdmin.from('stock_movements').insert(chunk.map(({ r, created }) => ({
        tenant_id: tenantId, product_id: created!.id, outlet_id: input.outletId!, user_id: userId,
        movement_type: 'IN', quantity: r.initialStock!, previous_stock: 0, new_stock: r.initialStock!, reason: 'Stok awal (impor Excel)',
      })))
      if (movementError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: movementError.message })
      result.stocked += chunk.length
    }
  }

  return result
}
