import { buildOverview, changeRatio, type SaleRow } from '../overview'

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
// Rows carry their business day and hour in the id-free createdAt: "YYYY-MM-DD HH".
const dayOf = (iso: string) => iso.slice(0, 10)
const hourOf = (iso: string) => Number(iso.slice(11, 13))

const sale = (createdAt: string, total: number, lines: SaleRow['lines'], extra: Partial<SaleRow> = {}): SaleRow => ({
  id: `${createdAt}-${total}`, total, paymentMethod: 'cash', createdAt, customerId: null, serviceOrderId: null, lines, ...extra,
})
const oil = (qty: number, cost: number | null = 40000) =>
  ({ productId: 'oil', name: 'Oli', itemType: 'PRODUCT', category: 'Oli', quantity: qty, lineTotal: qty * 55000, unitCost: cost })
const service = { productId: 'svc', name: 'Servis Ringan', itemType: 'SERVICE', category: 'Jasa', quantity: 1, lineTotal: 50000, unitCost: null }

const build = (rows: SaleRow[], days = 7) => buildOverview({
  rows, days, today: '2026-11-27', dayOf, hourOf, addDays,
  customers: new Map([['c1', { name: 'Andi', memberCode: 'M0001' }]]),
  mechanics: [],
})

describe('buildOverview', () => {
  const rows = [
    sale('2026-11-27 09', 105000, [oil(1), service], { serviceOrderId: 'so1', customerId: 'c1', paymentMethod: 'qris' }),
    sale('2026-11-27 14', 110000, [oil(2)]),
    sale('2026-11-21 10', 55000, [oil(1, null)]), // first day of the 7-day window
    sale('2026-11-20 10', 99000, [oil(1)]), // previous period
    sale('2026-11-13 10', 1, [oil(1)]), // before both periods
  ]
  const o = build(rows)

  it('splits the current and previous period on business days', () => {
    expect(o.current.transactions).toBe(3)
    expect(o.current.revenue).toBe(270000)
    expect(o.previous.revenue).toBe(99000)
    expect(o.current.serviceNotes).toBe(1)
    expect(o.current.averageTicket).toBe(90000)
  })

  it('takes cost of goods off revenue; lines without a cost are counted, not guessed', () => {
    // 270.000 − (1+2) × 40.000 for costed oil; the uncosted line adds no cost.
    expect(o.current.grossProfit).toBe(150000)
    expect(o.uncostedLines).toBe(1)
  })

  it('has one point per day, with goods and services apart', () => {
    expect(o.daily.map((d) => d.date)).toEqual(['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'])
    const today = o.daily[6]
    expect(today).toMatchObject({ transactions: 2, revenue: 215000, goods: 165000, services: 50000 })
  })

  it('puts today’s sales in their hour', () => {
    expect(o.hourlyToday).toHaveLength(24)
    expect(o.hourlyToday[9].revenue).toBe(105000)
    expect(o.hourlyToday[14].revenue).toBe(110000)
    expect(o.hourlyToday[10].revenue).toBe(0)
  })

  it('ranks payment methods, categories, items and customers', () => {
    expect(o.paymentMethods.map((m) => m.method)).toEqual(['cash', 'qris'])
    expect(o.categories[0]).toMatchObject({ category: 'Oli', revenue: 220000 })
    expect(o.categories.find((c) => c.category === 'Jasa')?.share).toBeCloseTo(50000 / 270000)
    expect(o.topItems[0]).toMatchObject({ name: 'Oli', quantity: 4, isService: false })
    expect(o.topCustomers).toEqual([{ customerId: 'c1', name: 'Andi', memberCode: 'M0001', visits: 1, spent: 105000 }])
  })

  it('lists the latest sales of the period, newest first', () => {
    expect(o.recent.map((r) => r.total)).toEqual([110000, 105000, 55000])
    expect(o.recent[1]).toMatchObject({ serviceNote: true, customerName: 'Andi', paymentMethod: 'qris', items: 2 })
  })

  it('handles an empty period', () => {
    const empty = build([], 1)
    expect(empty.current).toEqual({ revenue: 0, transactions: 0, averageTicket: 0, serviceNotes: 0, grossProfit: 0 })
    expect(empty.daily).toHaveLength(1)
  })
})

describe('changeRatio', () => {
  it('is null without a base and a fraction otherwise', () => {
    expect(changeRatio(100, 0)).toBeNull()
    expect(changeRatio(150, 100)).toBe(0.5)
    expect(changeRatio(50, 100)).toBe(-0.5)
  })
})
