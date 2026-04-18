import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { getTenantOwnerId } from '@/server/lib/tenant'
import { getLimits } from '@/lib/plans'

export const dashboardRouter = router({
  /**
   * Get dashboard statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const today = new Date().toISOString().split('T')[0]
      const startDate = input?.startDate || today
      const endDate = input?.endDate || today

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)

      // Get total products scoped to tenant
      let productsQuery = supabase.from('products').select('*', { count: 'exact', head: true })
      if (ownerId) productsQuery = productsQuery.eq('owner_id', ownerId)
      const { count: totalProducts } = await productsQuery

      // Get total outlets scoped to tenant
      let outletsQuery = supabase.from('outlets').select('*', { count: 'exact', head: true })
      if (ownerId) outletsQuery = outletsQuery.eq('owner_id', ownerId)
      const { count: totalOutlets } = await outletsQuery

      // Get sales from transactions table (more reliable than daily_sales)
      let transactionsQuery = supabase
        .from('transactions')
        .select('total_amount, created_at, transaction_items(quantity)')
        .eq('status', 'completed')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)

      if (input?.outletId) {
        transactionsQuery = transactionsQuery.eq('outlet_id', input.outletId)
      }

      const { data: transactions } = await transactionsQuery

      const totalRevenue = transactions?.reduce((sum, tx) => sum + (tx.total_amount || 0), 0) || 0
      const totalItemsSold = transactions?.reduce((sum, tx) => {
        return sum + (tx.transaction_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
      }, 0) || 0

      // Get low stock items (stock < 10)
      let stockQuery = supabase
        .from('daily_stock')
        .select('product_id, stock_akhir, stock_date')
        .eq('stock_date', today)
        .lt('stock_akhir', 10)

      if (input?.outletId) {
        stockQuery = stockQuery.eq('outlet_id', input.outletId)
      }

      const { data: lowStockData, count: lowStockCount } = await stockQuery

      return {
        totalProducts: totalProducts || 0,
        totalOutlets: totalOutlets || 0,
        totalRevenue,
        totalItemsSold,
        lowStockCount: lowStockCount || 0,
        transactionCount: transactions?.length || 0,
      }
    }),

  /**
   * Get sales trend (last 7 days) - from transactions table
   */
  getSalesTrend: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        days: z.number().default(7),
      }).optional()
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 7
      const endDate = new Date()

      // Query from transactions table
      let query = supabase
        .from('transactions')
        .select('created_at, total_amount, transaction_items(quantity)')
        .eq('status', 'completed')
        .lte('created_at', `${endDate.toISOString().split('T')[0]}T23:59:59`)
        .order('created_at', { ascending: true })

      if (days > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (days - 1))
        query = query.gte('created_at', `${startDate.toISOString().split('T')[0]}T00:00:00`)
      }

      if (input?.outletId) {
        query = query.eq('outlet_id', input.outletId)
      }

      const { data: transactions } = await query

      // Group by date
      const trendMap: Record<string, { date: string; revenue: number; itemsSold: number }> = {}

      // Pre-initialize all dates for fixed ranges so gaps show as 0
      if (days > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (days - 1))
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + i)
          const dateStr = date.toISOString().split('T')[0]
          trendMap[dateStr] = { date: dateStr, revenue: 0, itemsSold: 0 }
        }
      }

      // Fill with actual data from transactions
      transactions?.forEach((tx: any) => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0]
        if (!trendMap[txDate]) {
          trendMap[txDate] = { date: txDate, revenue: 0, itemsSold: 0 }
        }
        trendMap[txDate].revenue += tx.total_amount || 0
        // Sum all items quantity
        const itemsCount = tx.transaction_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0
        trendMap[txDate].itemsSold += itemsCount
      })

      return Object.values(trendMap)
    }),

  /**
   * Get top selling products - from transactions table
   */
  getTopProducts: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(5),
        days: z.number().default(7),
      }).optional()
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 7
      const limit = input?.limit || 5

      const endDate = new Date()

      // Query from transactions table with transaction_items
      let query = supabase
        .from('transactions')
        .select(`
          transaction_items (
            product_id,
            product_name,
            product_sku,
            quantity,
            line_total
          )
        `)
        .eq('status', 'completed')
        .lte('created_at', `${endDate.toISOString().split('T')[0]}T23:59:59`)

      if (days > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (days - 1))
        query = query.gte('created_at', `${startDate.toISOString().split('T')[0]}T00:00:00`)
      }

      if (input?.outletId) {
        query = query.eq('outlet_id', input.outletId)
      }

      const { data: transactions } = await query

      // Group by product
      const productMap: Record<string, {
        productId: string
        productName: string
        productSku: string
        totalQuantity: number
        totalRevenue: number
      }> = {}

      // Flatten transaction_items and aggregate by product
      transactions?.forEach((tx: any) => {
        tx.transaction_items?.forEach((item: any) => {
          if (!productMap[item.product_id]) {
            productMap[item.product_id] = {
              productId: item.product_id,
              productName: item.product_name || 'Unknown',
              productSku: item.product_sku || 'N/A',
              totalQuantity: 0,
              totalRevenue: 0,
            }
          }
          productMap[item.product_id].totalQuantity += item.quantity || 0
          productMap[item.product_id].totalRevenue += item.line_total || 0
        })
      })

      // Sort and limit
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, limit)

      return topProducts
    }),

  /**
   * Get low stock products (OPTIMIZED - using JOIN to avoid N+1)
   */
  getLowStock: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        threshold: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const today = new Date().toISOString().split('T')[0]
      const threshold = input?.threshold || 10

      // OPTIMIZED: Use JOIN to fetch all data in a single query
      let query = supabase
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
        .order('stock_akhir', { ascending: true })

      if (input?.outletId) {
        query = query.eq('outlet_id', input.outletId)
      }

      const { data: stockData } = await query

      if (!stockData || stockData.length === 0) return []

      // Map the joined data
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
    }),

  /**
   * Get recent transactions (MIGRATED - using transactions table for reliability)
   */
  getRecentTransactions: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 10

      // Query from transactions table with JOIN to get all related data
      let query = supabase
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
        .order('created_at', { ascending: false })
        .limit(limit)

      if (input?.outletId) {
        query = query.eq('outlet_id', input.outletId)
      }

      const { data: transactions } = await query

      if (!transactions || transactions.length === 0) return []

      // Map transactions to flat format for compatibility with existing UI
      // Each transaction item becomes a separate row
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
          // Transaction without items (shouldn't happen, but handle gracefully)
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
   * Export report data — plan-gated at server level
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

      const days = input.days
      const endDate = new Date()

      // Sales trend
      let trendQuery = supabase
        .from('transactions')
        .select('created_at, total_amount, transaction_items(quantity)')
        .eq('status', 'completed')
        .lte('created_at', `${endDate.toISOString().split('T')[0]}T23:59:59`)
        .order('created_at', { ascending: true })

      if (days > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (days - 1))
        trendQuery = trendQuery.gte('created_at', `${startDate.toISOString().split('T')[0]}T00:00:00`)
      }
      if (input.outletId) trendQuery = trendQuery.eq('outlet_id', input.outletId)

      const { data: transactions } = await trendQuery
      const trendMap: Record<string, { date: string; revenue: number; itemsSold: number }> = {}

      if (days > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (days - 1))
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate)
          d.setDate(d.getDate() + i)
          const ds = d.toISOString().split('T')[0]
          trendMap[ds] = { date: ds, revenue: 0, itemsSold: 0 }
        }
      }

      transactions?.forEach((tx: any) => {
        const ds = new Date(tx.created_at).toISOString().split('T')[0]
        if (!trendMap[ds]) trendMap[ds] = { date: ds, revenue: 0, itemsSold: 0 }
        trendMap[ds].revenue += tx.total_amount || 0
        trendMap[ds].itemsSold += tx.transaction_items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0
      })

      const salesTrend = Object.values(trendMap)

      // Top products
      let prodQuery = supabase
        .from('transactions')
        .select('transaction_items(product_id, product_name, product_sku, quantity, line_total)')
        .eq('status', 'completed')

      if (days > 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - (days - 1))
        prodQuery = prodQuery.gte('created_at', startDate.toISOString())
      }
      if (input.outletId) prodQuery = prodQuery.eq('outlet_id', input.outletId)

      const { data: prodTxs } = await prodQuery
      const productMap: Record<string, any> = {}
      prodTxs?.forEach((tx: any) => {
        tx.transaction_items?.forEach((item: any) => {
          if (!item.product_id) return
          if (!productMap[item.product_id]) {
            productMap[item.product_id] = { productId: item.product_id, productName: item.product_name || 'Unknown', productSku: item.product_sku || 'N/A', totalQuantity: 0, totalRevenue: 0 }
          }
          productMap[item.product_id].totalQuantity += item.quantity || 0
          productMap[item.product_id].totalRevenue += item.line_total || 0
        })
      })

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10)

      return { salesTrend, topProducts }
    }),
})
