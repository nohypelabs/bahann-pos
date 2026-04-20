import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { RecordDailyStockUseCase } from '@/use-cases/stock/RecordDailyStockUseCase'
import { SupabaseDailyStockRepository } from '@/infra/repositories/SupabaseDailyStockRepository'

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
    .mutation(async ({ input }) => {
      const useCase = new RecordDailyStockUseCase(stockRepository)
      await useCase.execute(input)
      return { success: true }
    }),

  /**
   * Get latest stock for a product
   */
  getLatest: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        outletId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const stock = await stockRepository.getLatestByProduct(
        input.outletId,
        input.productId
      )
      return stock
    }),

  /**
   * Get inventory list with current stock quantities
   */
  getInventoryList: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      // Get all products with their latest stock per outlet
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

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
})
