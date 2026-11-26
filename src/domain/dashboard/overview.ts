// What the dashboard shows about sales in a period, computed from completed transactions.
// Pure functions: the repository fetches rows, these turn them into numbers.

export interface SaleLine {
  productId: string | null
  name: string
  /** PRODUCT, SERVICE, MENU, PACKAGE; null when the product was deleted. */
  itemType: string | null
  category: string | null
  quantity: number
  lineTotal: number
  /** Cost per unit at the time of sale; null when the product had no cost price. */
  unitCost: number | null
}

export interface SaleRow {
  id: string
  /** Receipt number, e.g. TRX-…; empty when unknown. */
  number?: string
  total: number
  paymentMethod: string | null
  createdAt: string
  customerId: string | null
  serviceOrderId: string | null
  lines: SaleLine[]
}

export interface PeriodKpis {
  revenue: number
  transactions: number
  averageTicket: number
  /** Paid service notes (sales made from a service note). */
  serviceNotes: number
  /** Revenue minus the cost of goods sold; lines without a cost count as zero cost. */
  grossProfit: number
}

export interface DayPoint {
  date: string
  revenue: number
  transactions: number
  /** Revenue split by line type, before sale-level discounts. */
  goods: number
  services: number
}

export interface DashboardOverview {
  days: number
  current: PeriodKpis
  previous: PeriodKpis
  daily: DayPoint[]
  /** 24 entries, revenue per business hour of today. */
  hourlyToday: { hour: number; revenue: number; transactions: number }[]
  paymentMethods: { method: string; revenue: number; count: number }[]
  categories: { category: string; revenue: number; share: number }[]
  topItems: { name: string; isService: boolean; quantity: number; revenue: number }[]
  topCustomers: { customerId: string; name: string; memberCode: string | null; visits: number; spent: number }[]
  mechanicsToday: { mechanicId: string; name: string; paidToday: number; openNotes: number }[]
  /** Latest sales of the period, newest first. */
  recent: { id: string; number: string; createdAt: string; total: number; paymentMethod: string; items: number; serviceNote: boolean; customerName: string | null }[]
  /** Goods lines in the period without a cost price, so gross profit is overstated. */
  uncostedLines: number
}

const SERVICE_TYPES = new Set(['SERVICE'])

export function isServiceLine(line: Pick<SaleLine, 'itemType'>): boolean {
  return line.itemType !== null && SERVICE_TYPES.has(line.itemType)
}

export function kpisOf(rows: SaleRow[]): PeriodKpis {
  const revenue = rows.reduce((s, r) => s + r.total, 0)
  const cost = rows.reduce((s, r) => s + r.lines.reduce((c, l) => c + (l.unitCost ?? 0) * l.quantity, 0), 0)
  return {
    revenue,
    transactions: rows.length,
    averageTicket: rows.length ? Math.round(revenue / rows.length) : 0,
    serviceNotes: rows.filter((r) => r.serviceOrderId).length,
    grossProfit: revenue - cost,
  }
}

/**
 * Splits rows into the current period (the last `days` business days up to `today`) and the
 * one before it, and summarises both. `dayOf` and `hourOf` map an instant to the business
 * calendar (WIB), so a sale at 01:00 WIB lands on its own day.
 */
export function buildOverview(input: {
  rows: SaleRow[]
  days: number
  today: string
  dayOf: (iso: string) => string
  hourOf: (iso: string) => number
  addDays: (date: string, days: number) => string
  customers: Map<string, { name: string; memberCode: string | null }>
  mechanics: { mechanicId: string; name: string; paidToday: number; openNotes: number }[]
}): DashboardOverview {
  const { rows, days, today, dayOf, hourOf, addDays } = input
  const from = addDays(today, -(days - 1))
  const previousFrom = addDays(from, -days)
  const withDay = rows.map((r) => ({ row: r, day: dayOf(r.createdAt) }))
  const current = withDay.filter((x) => x.day >= from && x.day <= today).map((x) => x.row)
  const previous = withDay.filter((x) => x.day >= previousFrom && x.day < from).map((x) => x.row)

  const daily: DayPoint[] = []
  const byDay = new Map<string, DayPoint>()
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const point = { date: d, revenue: 0, transactions: 0, goods: 0, services: 0 }
    daily.push(point)
    byDay.set(d, point)
  }
  for (const { row, day } of withDay) {
    const point = byDay.get(day)
    if (!point) continue
    point.revenue += row.total
    point.transactions += 1
    for (const l of row.lines) {
      if (isServiceLine(l)) point.services += l.lineTotal
      else point.goods += l.lineTotal
    }
  }

  const hourlyToday = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, transactions: 0 }))
  for (const { row, day } of withDay) {
    if (day !== today) continue
    const slot = hourlyToday[hourOf(row.createdAt)]
    slot.revenue += row.total
    slot.transactions += 1
  }

  const methods = new Map<string, { method: string; revenue: number; count: number }>()
  for (const r of current) {
    const method = r.paymentMethod || 'cash'
    const m = methods.get(method) ?? { method, revenue: 0, count: 0 }
    m.revenue += r.total
    m.count += 1
    methods.set(method, m)
  }

  const lines = current.flatMap((r) => r.lines)
  const categoryTotals = new Map<string, number>()
  for (const l of lines) {
    const category = isServiceLine(l) ? 'Jasa' : (l.category?.trim() || 'Lainnya')
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + l.lineTotal)
  }
  const lineRevenue = [...categoryTotals.values()].reduce((s, v) => s + v, 0)

  const items = new Map<string, { name: string; isService: boolean; quantity: number; revenue: number }>()
  for (const l of lines) {
    const key = l.productId ?? `name:${l.name}`
    const item = items.get(key) ?? { name: l.name, isService: isServiceLine(l), quantity: 0, revenue: 0 }
    item.quantity += l.quantity
    item.revenue += l.lineTotal
    items.set(key, item)
  }

  const customerTotals = new Map<string, { visits: number; spent: number }>()
  for (const r of current) {
    if (!r.customerId) continue
    const c = customerTotals.get(r.customerId) ?? { visits: 0, spent: 0 }
    c.visits += 1
    c.spent += r.total
    customerTotals.set(r.customerId, c)
  }

  return {
    days,
    current: kpisOf(current),
    previous: kpisOf(previous),
    daily,
    hourlyToday,
    paymentMethods: [...methods.values()].sort((a, b) => b.revenue - a.revenue),
    categories: [...categoryTotals.entries()]
      .map(([category, revenue]) => ({ category, revenue, share: lineRevenue ? revenue / lineRevenue : 0 }))
      .sort((a, b) => b.revenue - a.revenue),
    topItems: [...items.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 6),
    topCustomers: [...customerTotals.entries()]
      .filter(([id]) => input.customers.has(id))
      .map(([customerId, t]) => ({ customerId, ...input.customers.get(customerId)!, ...t }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5),
    mechanicsToday: input.mechanics,
    recent: [...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((r) => ({
      id: r.id,
      number: r.number ?? '',
      createdAt: r.createdAt,
      total: r.total,
      paymentMethod: r.paymentMethod || 'cash',
      items: r.lines.reduce((s, l) => s + l.quantity, 0),
      serviceNote: !!r.serviceOrderId,
      customerName: r.customerId ? input.customers.get(r.customerId)?.name ?? null : null,
    })),
    uncostedLines: lines.filter((l) => !isServiceLine(l) && l.unitCost === null).length,
  }
}

/** Percentage change from `before` to `now`; null when there is nothing to compare with. */
export function changeRatio(now: number, before: number): number | null {
  if (before === 0) return null
  return (now - before) / Math.abs(before)
}
