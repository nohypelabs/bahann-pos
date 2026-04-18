import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'

export const adminRouter = router({
  /**
   * Reset all operational data — for fresh customer setup.
   * Deletes in FK-safe order. Preserves users and outlets.
   */
  resetAllData: adminProcedure
    .input(
      z.object({
        confirmText: z.literal('RESET ALL DATA'),
        keepOutlets: z.boolean().default(true),
        keepUsers: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const counts: Record<string, number> = {}

      // 1. Audit logs (no FK deps on operational tables)
      const { count: auditCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
      await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.auditLogs = auditCount || 0

      // 2. Stock alerts
      const { count: alertCount } = await supabase
        .from('stock_alerts')
        .select('*', { count: 'exact', head: true })
      await supabase.from('stock_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.stockAlerts = alertCount || 0

      // 3. Cash sessions
      const { count: cashCount } = await supabase
        .from('cash_sessions')
        .select('*', { count: 'exact', head: true })
      await supabase.from('cash_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.cashSessions = cashCount || 0

      // 4. Transaction items (must go before transactions)
      const { count: txItemCount } = await supabase
        .from('transaction_items')
        .select('*', { count: 'exact', head: true })
      await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.transactionItems = txItemCount || 0

      // 5. Transactions
      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.transactions = txCount || 0

      // 6. Daily sales (table may not exist in all environments)
      try {
        const { count: salesCount } = await supabase
          .from('daily_sales')
          .select('*', { count: 'exact', head: true })
        if (salesCount) {
          await supabase.from('daily_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          counts.dailySales = salesCount
        }
      } catch {
        // table may not exist
      }

      // 7. Daily stock
      const { count: stockCount } = await supabase
        .from('daily_stock')
        .select('*', { count: 'exact', head: true })
      await supabase.from('daily_stock').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.dailyStock = stockCount || 0

      // 8. Promotions
      const { count: promoCount } = await supabase
        .from('promotions')
        .select('*', { count: 'exact', head: true })
      await supabase.from('promotions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      counts.promotions = promoCount || 0

      // 9. Products (now safe — no more transaction_items refs)
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (productError) throw new Error(`Failed to delete products: ${productError.message}`)
      counts.products = productCount || 0

      // 10. Outlets (optional)
      if (!input.keepOutlets) {
        const { count: outletCount } = await supabase
          .from('outlets')
          .select('*', { count: 'exact', head: true })
        await supabase.from('outlets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        counts.outlets = outletCount || 0
      }

      // Audit log the reset (written after clear so it's the first entry)
      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'auth',
        entityId: 'reset',
        changes: { reset: counts },
        metadata: {
          keepOutlets: input.keepOutlets,
          keepUsers: input.keepUsers,
          performedBy: ctx.session?.email,
        },
      })

      return { success: true, counts }
    }),
})
