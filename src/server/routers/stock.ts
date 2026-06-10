import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { RecordDailyStockUseCase } from '@/use-cases/stock/RecordDailyStockUseCase'
import { SupabaseDailyStockRepository } from '@/infra/repositories/SupabaseDailyStockRepository'
import { getTenantOwnerId, assertOutletBelongsToTenant } from '@/server/lib/tenant'

const stockRepository = new SupabaseDailyStockRepository()

interface StockRecord {
  outlet_id: string
  stock_date: string
  stock_akhir: number
  outlets?: { name: string } | null
}

export const stockRouter = router({
  /**
   * Record daily stock movement
   */
  record: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        outletId: z.string().uuid(),
        stockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        stockAwal: z.number(),
        stockIn: z.number(),
        stockOut: z.number(),
        stockAkhir: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (ownerId) await assertOutletBelongsToTenant(input.outletId, ownerId)

      // Get previous stock for audit trail
      const prevStock = await stockRepository.getLatestByProduct(input.outletId, input.productId)
      const previousStock = prevStock?.stockAkhir ?? input.stockAwal

      const useCase = new RecordDailyStockUseCase(stockRepository)
      await useCase.execute(input)

      // Record stock movement for audit trail
      const netChange = input.stockIn - input.stockOut
      if (netChange !== 0) {
        const movementType = netChange > 0 ? 'IN' : 'OUT'
        await supabase.from('stock_movements').insert({
          product_id: input.productId,
          outlet_id: input.outletId,
          user_id: ctx.userId,
          movement_type: movementType,
          quantity: Math.abs(netChange),
          previous_stock: previousStock,
          new_stock: input.stockAkhir,
          reason: null,
        })
      }

      return { success: true }
    }),

  getLatest: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        outletId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (ownerId) await assertOutletBelongsToTenant(input.outletId, ownerId)

      const stock = await stockRepository.getLatestByProduct(
        input.outletId,
        input.productId
      )
      return stock
    }),

  getInventoryList: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)

      let productQuery = supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (ownerId) productQuery = productQuery.eq('owner_id', ownerId)

      const { data: products, error: productsError } = await productQuery

      if (productsError) {
        throw new Error(`Failed to fetch products: ${productsError.message}`)
      }

      // For each product, get latest stock
      const inventoryList = await Promise.all(
        (products || []).map(async (product) => {
          let stockQuery = supabase
            .from('daily_stock')
            .select('outlet_id, stock_akhir, stock_date, outlets(name)')
            .eq('product_id', product.id)

          if (input?.outletId) {
            stockQuery = stockQuery.eq('outlet_id', input.outletId)
          }

          const { data: stockRecords } = await stockQuery

          // Group by outlet and get latest for each
          const stockByOutlet = ((stockRecords || []) as unknown as StockRecord[]).reduce((acc: StockRecord[], record: StockRecord) => {
            const existing = acc.find(r => r.outlet_id === record.outlet_id)
            if (!existing || new Date(record.stock_date) > new Date(existing.stock_date)) {
              return [...acc.filter(r => r.outlet_id !== record.outlet_id), record]
            }
            return acc
          }, [])

          // Calculate total stock across all outlets
          const totalStock = stockByOutlet.reduce((sum, record) => sum + (record.stock_akhir || 0), 0)

          return {
            id: product.id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            price: product.price,
            currentStock: totalStock,
            stockByOutlet: (stockByOutlet as StockRecord[]).map((record: StockRecord) => ({
              outletId: record.outlet_id,
              outletName: record.outlets?.name || 'Unknown',
              stock: record.stock_akhir || 0,
              lastUpdated: record.stock_date,
            })),
          }
        })
      )

      return inventoryList
    }),

  /**
   * Get stock movement history with user/product/outlet details
   */
  getMovements: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        productId: z.string().uuid().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)

      let query = supabase
        .from('stock_movements')
        .select(`
          id, movement_type, quantity, previous_stock, new_stock, reason, created_at,
          product:products(id, name, sku),
          outlet:outlets(id, name),
          user:users(id, name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(input?.limit ?? 50)
        .range(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 50) - 1)

      if (input?.outletId) query = query.eq('outlet_id', input.outletId)
      if (input?.productId) query = query.eq('product_id', input.productId)

      // Tenant scoping: only show movements for tenant's outlets
      if (ownerId) {
        const { data: tenantOutlets } = await supabase
          .from('outlets')
          .select('id')
          .eq('owner_id', ownerId)
        const outletIds = (tenantOutlets || []).map(o => o.id)
        if (outletIds.length > 0) {
          query = query.in('outlet_id', outletIds)
        }
      }

      const { data, error, count } = await query
      if (error) throw new Error(`Failed to fetch movements: ${error.message}`)

      return {
        movements: data || [],
        total: count || 0,
      }
    }),
})
