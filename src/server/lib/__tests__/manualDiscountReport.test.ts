import { summarizeManualDiscounts, type ManualDiscountRow } from '@/server/lib/manualDiscountReport'

const row = (overrides: Partial<ManualDiscountRow>): ManualDiscountRow => ({
  kind: 'line', transactionId: 'tx-1', transactionNumber: 'TRX-1', at: '2026-11-25T03:00:00Z', status: 'completed',
  cashier: 'Sari', outlet: 'Bengkel', item: 'Oli', quantity: 1, listPrice: 55000, unitPrice: 50000,
  amount: 5000, reason: 'OWNER_POLICY', note: null, ...overrides,
})

describe('summarizeManualDiscounts', () => {
  it('totals completed sales per cashier and reason, newest rows first', () => {
    const report = summarizeManualDiscounts([
      row({}),
      row({ kind: 'sale', transactionId: 'tx-1', amount: 2000, reason: 'ROUNDING', at: '2026-11-25T03:00:01Z' }),
      row({ transactionId: 'tx-2', cashier: 'Budi', amount: 10000, at: '2026-11-25T05:00:00Z' }),
      row({ transactionId: 'tx-3', cashier: 'Budi', amount: 99999, status: 'voided', at: '2026-11-25T06:00:00Z' }),
    ])

    expect(report.total).toEqual({ amount: 17000, count: 3, sales: 2 })
    expect(report.byCashier).toEqual([
      { cashier: 'Budi', amount: 10000, count: 1 },
      { cashier: 'Sari', amount: 7000, count: 2 },
    ])
    expect(report.byReason).toEqual([
      { reason: 'OWNER_POLICY', amount: 15000, count: 2 },
      { reason: 'ROUNDING', amount: 2000, count: 1 },
    ])
    // The voided sale is listed but not counted.
    expect(report.rows.map((r) => r.transactionId)).toEqual(['tx-3', 'tx-2', 'tx-1', 'tx-1'])
  })

  it('caps the rows it returns', () => {
    const rows = Array.from({ length: 5 }, (_, i) => row({ transactionId: `tx-${i}`, at: `2026-11-2${i}T00:00:00Z` }))
    const report = summarizeManualDiscounts(rows, 3)
    expect(report.rows).toHaveLength(3)
    expect(report.truncated).toBe(true)
    expect(report.total.count).toBe(5)
  })
})
