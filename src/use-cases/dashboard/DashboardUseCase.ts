import type {
  DashboardRepository,
  SalesTrendRow,
  TopProductRow,
} from '@/domain/repositories/DashboardRepository';
import { getLimits } from '@/lib/plans';

interface DateRange { startTs: string; endTs: string }

function buildDateRange(days: number | undefined, now: Date): DateRange {
  const endTs = `${now.toISOString().split('T')[0]}T23:59:59Z`
  if (days === undefined || days === 0) return { startTs: '2000-01-01T00:00:00Z', endTs }
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  return { startTs: `${start.toISOString().split('T')[0]}T00:00:00Z`, endTs }
}

interface TrendPoint { date: string; revenue: number; itemsSold: number }

function fillTrendGaps(rows: SalesTrendRow[], days: number, now: Date): TrendPoint[] {
  const trendMap: Record<string, TrendPoint> = {}
  if (days > 0) {
    const start = new Date(now)
    start.setDate(start.getDate() - (days - 1))
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      trendMap[ds] = { date: ds, revenue: 0, itemsSold: 0 }
    }
  }

  for (const row of rows) {
    if (!trendMap[row.saleDate]) trendMap[row.saleDate] = { date: row.saleDate, revenue: 0, itemsSold: 0 }
    trendMap[row.saleDate].revenue = row.revenue
    trendMap[row.saleDate].itemsSold = row.itemsSold
  }

  return Object.values(trendMap)
}

export class DashboardUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async getStats(outletIds: string[], ownerId: string, days?: number) {
    const now = new Date()
    const { startTs, endTs } = buildDateRange(days, now)

    const [productCount, outletCount, summary, lowStockCount] = await Promise.all([
      this.repo.getProductCount(ownerId),
      this.repo.getOutletCount(ownerId),
      outletIds.length > 0
        ? this.repo.getSalesSummary(outletIds, startTs, endTs)
        : Promise.resolve({ totalRevenue: 0, transactionCount: 0, totalItemsSold: 0 }),
      outletIds.length > 0
        ? this.repo.getLowStock(outletIds, 10).then(items => items.length)
        : Promise.resolve(0),
    ])

    return {
      totalProducts: productCount,
      totalOutlets: outletCount,
      totalRevenue: summary.totalRevenue,
      totalItemsSold: summary.totalItemsSold,
      lowStockCount,
      transactionCount: summary.transactionCount,
    }
  }

  async getSalesTrend(outletIds: string[], days: number) {
    const now = new Date()
    const { startTs, endTs } = buildDateRange(days, now)

    if (outletIds.length === 0) return fillTrendGaps([], days, now)

    const rows = await this.repo.getSalesTrend(outletIds, startTs, endTs)
    return fillTrendGaps(rows, days, now)
  }

  async getTopProducts(outletIds: string[], days: number, limit: number) {
    const now = new Date()
    const { startTs, endTs } = buildDateRange(days, now)

    if (outletIds.length === 0) return []
    return this.repo.getTopProducts(outletIds, startTs, endTs, limit)
  }

  async getLowStock(outletIds: string[], threshold: number) {
    if (outletIds.length === 0) return []
    return this.repo.getLowStock(outletIds, threshold)
  }

  async getRecentTransactions(outletIds: string[], limit: number) {
    if (outletIds.length === 0) return []
    return this.repo.getRecentTransactions(outletIds, limit)
  }

  async exportReport(outletIds: string[], userId: string, plan: string, days: number) {
    const limits = getLimits(plan)
    if (!limits.canExport) {
      return { allowed: false as const, message: 'Fitur export tersedia mulai plan Starter. Upgrade untuk menggunakan fitur ini.' }
    }

    if (outletIds.length === 0) return { allowed: true as const, salesTrend: [], topProducts: [] }

    const now = new Date()
    const { startTs, endTs } = buildDateRange(days, now)

    const [trendRows, topRows] = await Promise.all([
      this.repo.getSalesTrend(outletIds, startTs, endTs),
      this.repo.getTopProducts(outletIds, startTs, endTs, 10),
    ])

    return {
      allowed: true as const,
      salesTrend: fillTrendGaps(trendRows, days, now),
      topProducts: topRows,
    }
  }
}
