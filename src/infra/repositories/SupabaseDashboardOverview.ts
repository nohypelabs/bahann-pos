import { supabaseAdmin as supabase } from '../supabase/server'
import { buildOverview, type DashboardOverview, type SaleRow } from '@/domain/dashboard/overview'
import { BUSINESS_TIMEZONE, addDays, businessDate, startOfBusinessDay } from '@/lib/business/timezone'

type Row = Record<string, unknown>
const PAGE = 1000

const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIMEZONE, hour: '2-digit', hourCycle: 'h23' })

function fail(what: string, error: { message: string }): never {
  throw new Error(`Failed to ${what}: ${error.message}`)
}

/** Completed sales of the outlets since `fromIso`, with their lines, paged past PostgREST's 1000-row cap. */
async function fetchSales(tenantId: string, outletIds: string[], fromIso: string): Promise<SaleRow[]> {
  const rows: SaleRow[] = []
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`id, transaction_id, total_amount, payment_method, created_at, customer_id, service_order_id,
        items:transaction_items(product_id, product_name, quantity, line_total, unit_cost, product:products(item_type, category))`)
      .eq('tenant_id', tenantId)
      .in('outlet_id', outletIds)
      .eq('status', 'completed')
      .gte('created_at', fromIso)
      .order('created_at')
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error) fail('load sales for the dashboard', error)
    for (const t of (data ?? []) as Row[]) {
      rows.push({
        id: t.id as string,
        number: (t.transaction_id as string | null) ?? '',
        total: Number(t.total_amount ?? 0),
        paymentMethod: (t.payment_method as string | null) ?? null,
        createdAt: t.created_at as string,
        customerId: (t.customer_id as string | null) ?? null,
        serviceOrderId: (t.service_order_id as string | null) ?? null,
        lines: ((t.items as Row[] | null) ?? []).map((i) => {
          const product = (i.product as Row | null) ?? null
          return {
            productId: (i.product_id as string | null) ?? null,
            name: (i.product_name as string | null) ?? 'Barang',
            itemType: (product?.item_type as string | null) ?? null,
            category: (product?.category as string | null) ?? null,
            quantity: Number(i.quantity ?? 0),
            lineTotal: Number(i.line_total ?? 0),
            unitCost: i.unit_cost == null ? null : Number(i.unit_cost),
          }
        }),
      })
    }
    if (!data || data.length < PAGE) return rows
  }
}

/** Active mechanics with the service notes they closed today and the ones still open. */
async function fetchMechanicsToday(tenantId: string, outletIds: string[], today: string) {
  const [mechanics, orders] = await Promise.all([
    supabase.from('mechanics').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
    supabase.from('service_orders').select('mechanic_id, status, closed_at')
      .eq('tenant_id', tenantId).in('outlet_id', outletIds).not('mechanic_id', 'is', null)
      .or(`status.eq.open,and(status.eq.paid,closed_at.gte.${startOfBusinessDay(today)})`),
  ])
  if (mechanics.error) fail('load mechanics', mechanics.error)
  if (orders.error) fail('load service notes for mechanics', orders.error)
  const counts = new Map<string, { paidToday: number; openNotes: number }>()
  for (const o of (orders.data ?? []) as Row[]) {
    const c = counts.get(o.mechanic_id as string) ?? { paidToday: 0, openNotes: 0 }
    if (o.status === 'open') c.openNotes += 1
    else c.paidToday += 1
    counts.set(o.mechanic_id as string, c)
  }
  return ((mechanics.data ?? []) as Row[]).map((m) => ({
    mechanicId: m.id as string,
    name: m.name as string,
    ...(counts.get(m.id as string) ?? { paidToday: 0, openNotes: 0 }),
  }))
}

/** Sales of the last `days` business days and the same span before it, for the dashboard. */
export async function loadDashboardOverview(tenantId: string, outletIds: string[], days: number): Promise<DashboardOverview> {
  const today = businessDate()
  const previousFrom = addDays(today, -(2 * days - 1))
  const [rows, mechanics] = outletIds.length
    ? await Promise.all([fetchSales(tenantId, outletIds, startOfBusinessDay(previousFrom)), fetchMechanicsToday(tenantId, outletIds, today)])
    : [[], []]

  const customerIds = [...new Set(rows.map((r) => r.customerId).filter((id): id is string => !!id))]
  const customers = new Map<string, { name: string; memberCode: string | null }>()
  if (customerIds.length) {
    const { data, error } = await supabase.from('customers').select('id, name, member_code').eq('tenant_id', tenantId).in('id', customerIds)
    if (error) fail('load customers for the dashboard', error)
    for (const c of (data ?? []) as Row[]) customers.set(c.id as string, { name: c.name as string, memberCode: (c.member_code as string | null) ?? null })
  }

  return buildOverview({
    rows, days, today, customers, mechanics, addDays,
    dayOf: (iso) => businessDate(new Date(iso)),
    hourOf: (iso) => Number(hourFormatter.format(new Date(iso))) % 24,
  })
}
