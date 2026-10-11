import type {
  DashboardRepository,
  SalesTrendRow,
} from '@/domain/repositories/DashboardRepository';
import { getLimits } from '@/lib/plans';
import { addDays, businessDate, endOfBusinessDay, startOfBusinessDay } from '@/lib/business/timezone';

interface DateRange { startTs: string; endTs: string; startDate: string; endDate: string }

/** The last `days` business (WIB) days up to today; 0/undefined means all time. */
function buildDateRange(days: number | undefined, now: Date): DateRange {
  const endDate = businessDate(now)
  const startDate = days === undefined || days === 0 ? '2000-01-01' : addDays(endDate, -(days - 1))
  return {
    startTs: startOfBusinessDay(startDate),
    endTs: endOfBusinessDay(endDate),
    startDate,
    endDate,
  }
}

interface TrendPoint { date: string; revenue: number; itemsSold: number }

function fillTrendGaps(rows: SalesTrendRow[], days: number, now: Date): TrendPoint[] {
  const trendMap: Record<string, TrendPoint> = {}
  if (days > 0) {
    const today = businessDate(now)
    for (let i = days - 1; i >= 0; i--) {
      const ds = addDays(today, -i)
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

  async getStats(outletIds: string[], tenantId: string, days?: number) {
    const now = new Date()
    const { startTs, endTs, startDate, endDate } = buildDateRange(days, now)

    const [productCount, outletCount, summary, lowStockCount, expenses] = await Promise.all([
      this.repo.getProductCount(tenantId),
      this.repo.getOutletCount(tenantId),
      outletIds.length > 0
        ? this.repo.getSalesSummary(outletIds, startTs, endTs)
        : Promise.resolve({ totalRevenue: 0, transactionCount: 0, totalItemsSold: 0, totalCogs: 0, uncostedLines: 0 }),
      outletIds.length > 0
        ? this.repo.getLowStock(outletIds, 10).then(items => items.length)
        : Promise.resolve(0),
      outletIds.length > 0
        ? this.repo.getExpenseSummary(outletIds, startDate, endDate)
        : Promise.resolve({ totalExpenses: 0, expenseCount: 0 }),
    ])

    // Revenue is gross sales (the top line). Gross profit subtracts the cost of
    // goods sold (HPP); operating profit then subtracts operational expenses.
    const grossProfit = summary.totalRevenue - summary.totalCogs
    const operatingProfit = grossProfit - expenses.totalExpenses

    return {
      totalProducts: productCount,
      totalOutlets: outletCount,
      totalRevenue: summary.totalRevenue,
      totalItemsSold: summary.totalItemsSold,
      lowStockCount,
      transactionCount: summary.transactionCount,
      totalCogs: summary.totalCogs,
      uncostedLines: summary.uncostedLines,
      grossProfit,
      totalExpenses: expenses.totalExpenses,
      expenseCount: expenses.expenseCount,
      operatingProfit,
      profitMargin: summary.totalRevenue > 0 ? (operatingProfit / summary.totalRevenue) * 100 : null,
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

  async getRecentTransactions(outletIds: string[], limit: number, days?: number) {
    if (outletIds.length === 0) return []
    const now = new Date()
    const { startTs, endTs } = buildDateRange(days, now)
    return this.repo.getRecentTransactions(outletIds, limit, startTs, endTs)
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
