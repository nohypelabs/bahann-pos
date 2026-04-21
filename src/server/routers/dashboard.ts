import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { getTenantOwnerId } from '@/server/lib/tenant'
import { getLimits } from '@/lib/plans'
import { getRedisClient } from '@/lib/redis-upstash'

const DASHBOARD_CACHE_TTL = 120 // 2 minutes

function dashKey(type: string, ownerId: string, outletId: string | undefined, suffix: string) {
  return `dash:${type}:${ownerId}:${outletId ?? 'all'}:${suffix}`
}

async function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const redis = getRedisClient()
  if (redis) {
    try {
      const cached = await redis.get<string>(key)
      if (cached != null) return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T
    } catch { /* cache miss — fall through */ }
  }
  const result = await fetcher()
  if (redis) {
    try { await redis.setex(key, ttl, JSON.stringify(result)) } catch { /* non-fatal */ }
  }
  return result
}

// Typed wrappers for RPC functions not yet reflected in generated database.types.ts
interface SalesSummaryRow { total_revenue: string; transaction_count: string; total_items_sold: string }
interface SalesTrendRow   { sale_date: string; revenue: string; items_sold: string }
interface TopProductRow   { product_id: string; product_name: string; product_sku: string; total_quantity: string; total_revenue: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (supabase.rpc as unknown as (fn: string, args?: object) => Promise<{ data: any; error: unknown }>)

async function rpcSalesSummary(p: { p_outlet_ids: string[]; p_start_date: string; p_end_date: string }) {
  const { data } = await rpc('get_sales_summary', p)
  return (data as SalesSummaryRow[] | null)?.[0] ?? { total_revenue: '0', transaction_count: '0', total_items_sold: '0' }
}

async function rpcSalesTrend(p: { p_outlet_ids: string[]; p_start_date: string; p_end_date: string }) {
  const { data } = await rpc('get_sales_trend', p)
  return (data as SalesTrendRow[] | null) ?? []
}

async function rpcTopProducts(p: { p_outlet_ids: string[]; p_start_date: string; p_end_date: string; p_limit: number }) {
  const { data } = await rpc('get_top_products', p)
  return (data as TopProductRow[] | null) ?? []
}

// Resolve all outlet IDs for a tenant. If a specific outletId is given, validate
// it belongs to the tenant and return it alone. Returns [] if no outlets yet.
async function getTenantOutletIds(ownerId: string, specificOutletId?: string): Promise<string[]> {
  if (specificOutletId) {
    const { data } = await supabase
      .from('outlets')
      .select('id')
      .eq('id', specificOutletId)
      .eq('owner_id', ownerId)
      .single()
    return data ? [data.id] : []
  }
  const { data } = await supabase
    .from('outlets')
    .select('id')
    .eq('owner_id', ownerId)
  return data?.map((o: { id: string }) => o.id) ?? []
}

function buildDateRange(days: number | undefined, now: Date): { startTs: string; endTs: string } {
  const endTs = `${now.toISOString().split('T')[0]}T23:59:59Z`
  if (days === undefined || days === 0) return { startTs: '2000-01-01T00:00:00Z', endTs }
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  return { startTs: `${start.toISOString().split('T')[0]}T00:00:00Z`, endTs }
}

export const dashboardRouter = router({
  /**
   * Get dashboard statistics — uses SQL RPC for transaction aggregation
   */
  getStats: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        days: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const now = new Date()
      const { startTs, endTs } = buildDateRange(input?.days, now)

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const cacheKey = dashKey('stats', ownerId, input?.outletId, `${input?.days ?? 'all'}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await getTenantOutletIds(ownerId, input?.outletId)

        const [productsResult, outletsResult] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
          supabase.from('outlets').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
        ])

        if (outletIds.length === 0) {
          return {
            totalProducts: productsResult.count || 0,
            totalOutlets: outletsResult.count || 0,
            totalRevenue: 0,
            totalItemsSold: 0,
            lowStockCount: 0,
            transactionCount: 0,
          }
        }

        const today = now.toISOString().split('T')[0]

        const [summary, lowStockResult] = await Promise.all([
          rpcSalesSummary({ p_outlet_ids: outletIds, p_start_date: startTs, p_end_date: endTs }),
          supabase
            .from('daily_stock')
            .select('product_id', { count: 'exact', head: true })
            .eq('stock_date', today)
            .lt('stock_akhir', 10)
            .in('outlet_id', outletIds),
        ])

        return {
          totalProducts: productsResult.count || 0,
          totalOutlets: outletsResult.count || 0,
          totalRevenue: Number(summary.total_revenue) || 0,
          totalItemsSold: Number(summary.total_items_sold) || 0,
          lowStockCount: lowStockResult.count || 0,
          transactionCount: Number(summary.transaction_count) || 0,
        }
      })
    }),

  /**
   * Get sales trend — SQL GROUP BY day, no JS aggregation
   */
  getSalesTrend: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        days: z.number().default(7),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const days = input?.days ?? 7
      const now = new Date()
      const { startTs, endTs } = buildDateRange(days, now)

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const cacheKey = dashKey('trend', ownerId, input?.outletId, `${days}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await getTenantOutletIds(ownerId, input?.outletId)

        // Pre-initialize date buckets so gaps show as 0
        const trendMap: Record<string, { date: string; revenue: number; itemsSold: number }> = {}
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

        if (outletIds.length === 0) return Object.values(trendMap)

        const rows = await rpcSalesTrend({ p_outlet_ids: outletIds, p_start_date: startTs, p_end_date: endTs })

        rows.forEach(row => {
          const ds = row.sale_date
          if (!trendMap[ds]) trendMap[ds] = { date: ds, revenue: 0, itemsSold: 0 }
          trendMap[ds].revenue = Number(row.revenue) || 0
          trendMap[ds].itemsSold = Number(row.items_sold) || 0
        })

        return Object.values(trendMap)
      })
    }),

  /**
   * Get top selling products — SQL aggregation, no JS loops
   */
  getTopProducts: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(5),
        days: z.number().default(7),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const days = input?.days ?? 7
      const limit = input?.limit || 5
      const now = new Date()
      const { startTs, endTs } = buildDateRange(days, now)

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const cacheKey = dashKey('top', ownerId, input?.outletId, `${days}:${limit}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await getTenantOutletIds(ownerId, input?.outletId)
        if (outletIds.length === 0) return []

        const rows = await rpcTopProducts({ p_outlet_ids: outletIds, p_start_date: startTs, p_end_date: endTs, p_limit: limit })

        return rows.map(row => ({
          productId: row.product_id,
          productName: row.product_name || 'Unknown',
          productSku: row.product_sku || 'N/A',
          totalQuantity: Number(row.total_quantity) || 0,
          totalRevenue: Number(row.total_revenue) || 0,
        }))
      })
    }),

  /**
   * Get low stock products
   */
  getLowStock: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        threshold: z.number().default(10),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const today = new Date().toISOString().split('T')[0]
      const threshold = input?.threshold || 10

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const cacheKey = dashKey('low', ownerId, input?.outletId, `${threshold}:${today}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL * 2, async () => {
        const outletIds = await getTenantOutletIds(ownerId, input?.outletId)
        if (outletIds.length === 0) return []

        const { data: stockData } = await supabase
          .from('daily_stock')
          .select(`
            product_id,
            outlet_id,
            stock_akhir,
            stock_date,
            products!inner(id, name, sku, category),
            outlets!inner(id, name)
          `)
          .eq('stock_date', today)
          .lt('stock_akhir', threshold)
          .in('outlet_id', outletIds)
          .order('stock_akhir', { ascending: true })

        if (!stockData || stockData.length === 0) return []

        return stockData.map((stock: any) => ({
          productId: stock.product_id,
          productName: stock.products?.name || 'Unknown',
          productSku: stock.products?.sku || 'N/A',
          productCategory: stock.products?.category || null,
          outletId: stock.outlet_id,
          outletName: stock.outlets?.name || 'Unknown',
          currentStock: stock.stock_akhir,
          date: stock.stock_date,
        }))
      })
    }),

  /**
   * Get recent transactions
   */
  getRecentTransactions: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const limit = input?.limit || 10

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const outletIds = await getTenantOutletIds(ownerId, input?.outletId)
      if (outletIds.length === 0) return []

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_id,
          outlet_id,
          status,
          total_amount,
          created_at,
          transaction_items (
            product_id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            line_total
          ),
          outlets!inner(id, name),
          cashier:users!cashier_id(id, name, email)
        `)
        .in('outlet_id', outletIds)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!transactions || transactions.length === 0) return []

      const flatTransactions: any[] = []

      transactions.forEach((tx: any) => {
        if (tx.transaction_items && tx.transaction_items.length > 0) {
          tx.transaction_items.forEach((item: any) => {
            flatTransactions.push({
              id: `${tx.id}-${item.product_id}`,
              transactionId: tx.transaction_id,
              productName: item.product_name,
              productSku: item.product_sku || 'N/A',
              outletName: tx.outlets?.name || 'Unknown',
              cashierName: tx.cashier?.name || 'Unknown',
              date: tx.created_at,
              quantity: item.quantity,
              revenue: item.line_total,
              status: tx.status,
              totalAmount: tx.total_amount,
              createdAt: tx.created_at,
            })
          })
        } else {
          flatTransactions.push({
            id: tx.id,
            transactionId: tx.transaction_id,
            productName: 'No items',
            productSku: 'N/A',
            outletName: tx.outlets?.name || 'Unknown',
            cashierName: tx.cashier?.name || 'Unknown',
            date: tx.created_at,
            quantity: 0,
            revenue: 0,
            status: tx.status,
            totalAmount: tx.total_amount,
            createdAt: tx.created_at,
          })
        }
      })

      return flatTransactions
    }),

  /**
   * Export report data — plan-gated, uses SQL RPC for aggregation
   */
  exportReport: protectedProcedure
    .input(z.object({
      outletId: z.string().uuid().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const { data: userData } = await supabase
        .from('users')
        .select('plan')
        .eq('id', ctx.userId)
        .single()

      const limits = getLimits(userData?.plan ?? 'free')
      if (!limits.canExport) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Fitur export tersedia mulai plan Starter. Upgrade untuk menggunakan fitur ini.',
        })
      }

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const outletIds = await getTenantOutletIds(ownerId, input.outletId)
      if (outletIds.length === 0) return { salesTrend: [], topProducts: [] }

      const now = new Date()
      const { startTs, endTs } = buildDateRange(input.days, now)

      const [trendRows, topRows] = await Promise.all([
        rpcSalesTrend({ p_outlet_ids: outletIds, p_start_date: startTs, p_end_date: endTs }),
        rpcTopProducts({ p_outlet_ids: outletIds, p_start_date: startTs, p_end_date: endTs, p_limit: 10 }),
      ])

      // Fill gaps so every day in range appears (even with 0 revenue)
      const trendMap: Record<string, { date: string; revenue: number; itemsSold: number }> = {}
      if (input.days > 0) {
        const start = new Date(now)
        start.setDate(start.getDate() - (input.days - 1))
        for (let i = 0; i < input.days; i++) {
          const d = new Date(start)
          d.setDate(d.getDate() + i)
          const ds = d.toISOString().split('T')[0]
          trendMap[ds] = { date: ds, revenue: 0, itemsSold: 0 }
        }
      }

      trendRows.forEach(row => {
        const ds = row.sale_date
        if (!trendMap[ds]) trendMap[ds] = { date: ds, revenue: 0, itemsSold: 0 }
        trendMap[ds].revenue = Number(row.revenue) || 0
        trendMap[ds].itemsSold = Number(row.items_sold) || 0
      })

      return {
        salesTrend: Object.values(trendMap),
        topProducts: topRows.map(row => ({
          productId: row.product_id,
          productName: row.product_name || 'Unknown',
          productSku: row.product_sku || 'N/A',
          totalQuantity: Number(row.total_quantity) || 0,
          totalRevenue: Number(row.total_revenue) || 0,
        })),
      }
    }),
})
