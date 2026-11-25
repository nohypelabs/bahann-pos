// The manual discount report: every line sold below its list price and every
// amount taken off a whole sale by a cashier, with who, how much and why.
import { TRPCError } from '@trpc/server'
import { supabaseAdmin } from '@/infra/supabase/server'
import { isDiscountReason, type DiscountReason } from '@/domain/sales/manualDiscount'

export interface ManualDiscountRow {
  /** 'line': one item below its list price; 'sale': an amount off the whole sale. */
  kind: 'line' | 'sale'
  transactionId: string
  transactionNumber: string
  at: string
  status: string
  cashier: string
  outlet: string
  item: string | null
  quantity: number | null
  listPrice: number | null
  unitPrice: number | null
  amount: number
  reason: DiscountReason
  note: string | null
}

interface Total { amount: number; count: number }

export interface ManualDiscountReport {
  /** Completed sales only: voided and refunded sales gave nothing away in the end. */
  total: Total & { sales: number }
  byCashier: (Total & { cashier: string })[]
  byReason: (Total & { reason: DiscountReason })[]
  rows: ManualDiscountRow[]
  truncated: boolean
}

const ROW_LIMIT = 500

/** Totals per cashier and reason; pure, so it is tested on its own. */
export function summarizeManualDiscounts(rows: ManualDiscountRow[], limit = ROW_LIMIT): ManualDiscountReport {
  const counted = rows.filter((r) => r.status === 'completed')
  const add = <K extends string>(map: Map<K, Total>, key: K, amount: number) => {
    const t = map.get(key) ?? { amount: 0, count: 0 }
    map.set(key, { amount: t.amount + amount, count: t.count + 1 })
  }
  const cashiers = new Map<string, Total>()
  const reasons = new Map<DiscountReason, Total>()
  for (const r of counted) {
    add(cashiers, r.cashier, r.amount)
    add(reasons, r.reason, r.amount)
  }
  const sorted = [...rows].sort((a, b) => b.at.localeCompare(a.at))
  return {
    total: {
      amount: counted.reduce((s, r) => s + r.amount, 0),
      count: counted.length,
      sales: new Set(counted.map((r) => r.transactionId)).size,
    },
    byCashier: [...cashiers].map(([cashier, t]) => ({ cashier, ...t })).sort((a, b) => b.amount - a.amount),
    byReason: [...reasons].map(([reason, t]) => ({ reason, ...t })).sort((a, b) => b.amount - a.amount),
    rows: sorted.slice(0, limit),
    truncated: sorted.length > limit,
  }
}

type Row = Record<string, unknown>
const nameOf = (v: unknown) => ((v as Row | null)?.name as string | undefined) ?? '-'

export async function loadManualDiscounts(tenantId: string, outletIds: string[], since: Date | null): Promise<ManualDiscountReport> {
  if (outletIds.length === 0) return summarizeManualDiscounts([])
  const fail = (message: string) => { throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message }) }

  let sales = supabaseAdmin
    .from('transactions')
    .select('id, transaction_id, created_at, status, manual_discount, discount_reason, discount_note, cashier:users!cashier_id(name), outlets(name)')
    .eq('tenant_id', tenantId)
    .in('outlet_id', outletIds)
    .gt('manual_discount', 0)
    .order('created_at', { ascending: false })
    .limit(ROW_LIMIT + 1)
  if (since) sales = sales.gte('created_at', since.toISOString())

  let lines = supabaseAdmin
    .from('transaction_items')
    .select(`product_name, quantity, unit_price, list_price, discount_reason, discount_note,
      sale:transactions!inner(id, transaction_id, created_at, status, outlet_id, cashier:users!cashier_id(name), outlets(name))`)
    .eq('tenant_id', tenantId)
    .not('discount_reason', 'is', null)
    .in('sale.outlet_id', outletIds)
    .order('created_at', { ascending: false })
    .limit(ROW_LIMIT + 1)
  if (since) lines = lines.gte('sale.created_at', since.toISOString())

  const [saleResult, lineResult] = await Promise.all([sales, lines])
  if (saleResult.error) fail(saleResult.error.message)
  if (lineResult.error) fail(lineResult.error.message)

  const rows: ManualDiscountRow[] = []
  for (const t of (saleResult.data ?? []) as Row[]) {
    if (!isDiscountReason(t.discount_reason)) continue
    rows.push({
      kind: 'sale',
      transactionId: t.id as string,
      transactionNumber: t.transaction_id as string,
      at: t.created_at as string,
      status: t.status as string,
      cashier: nameOf(t.cashier),
      outlet: nameOf(t.outlets),
      item: null, quantity: null, listPrice: null, unitPrice: null,
      amount: Number(t.manual_discount),
      reason: t.discount_reason,
      note: (t.discount_note as string | null) ?? null,
    })
  }
  for (const l of (lineResult.data ?? []) as Row[]) {
    const sale = l.sale as Row
    if (!isDiscountReason(l.discount_reason) || !sale) continue
    const listPrice = Number(l.list_price ?? 0)
    const unitPrice = Number(l.unit_price)
    const quantity = Number(l.quantity)
    rows.push({
      kind: 'line',
      transactionId: sale.id as string,
      transactionNumber: sale.transaction_id as string,
      at: sale.created_at as string,
      status: sale.status as string,
      cashier: nameOf(sale.cashier),
      outlet: nameOf(sale.outlets),
      item: l.product_name as string,
      quantity, listPrice, unitPrice,
      amount: Math.max(0, (listPrice - unitPrice) * quantity),
      reason: l.discount_reason,
      note: (l.discount_note as string | null) ?? null,
    })
  }
  const report = summarizeManualDiscounts(rows)
  // Either query may have stopped at its own limit.
  const capped = (saleResult.data?.length ?? 0) > ROW_LIMIT || (lineResult.data?.length ?? 0) > ROW_LIMIT
  return { ...report, truncated: report.truncated || capped }
}
