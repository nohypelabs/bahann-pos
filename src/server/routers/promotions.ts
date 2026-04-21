/**
 * Promotions Router
 * Handles discount codes and promotions
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'

export const promotionsRouter = router({
  /**
   * Validate and apply promotion
   */
  validate: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        cartTotal: z.number(),
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            quantity: z.number(),
            unitPrice: z.number(),
          })
        ),
        userId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { data: promo, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', input.code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !promo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid promotion code',
        })
      }

      // Check validity period
      const now = new Date()
      if (promo.start_date && new Date(promo.start_date) > now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Promotion has not started yet',
        })
      }
      if (promo.end_date && new Date(promo.end_date) < now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Promotion has expired',
        })
      }

      // Check usage limits
      if (promo.max_uses && promo.uses_count >= promo.max_uses) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Promotion usage limit reached',
        })
      }

      // Check per-customer usage limit
      if (input.userId && promo.max_uses_per_customer) {
        const { count } = await supabase
          .from('promotion_usage')
          .select('*', { count: 'estimated', head: true })
          .eq('promotion_id', promo.id)
          .eq('user_id', input.userId)

        if (count && count >= promo.max_uses_per_customer) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You have reached the usage limit for this promotion',
          })
        }
      }

      // Check minimum purchase
      if (promo.min_purchase && input.cartTotal < promo.min_purchase) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum purchase of ${promo.min_purchase} required`,
        })
      }

      // Calculate discount based on type
      let discountAmount = 0

      if (promo.type === 'fixed') {
        discountAmount = promo.discount_amount || 0
      } else if (promo.type === 'percentage') {
        discountAmount = (input.cartTotal * (promo.discount_percentage || 0)) / 100
        if (promo.max_discount && discountAmount > promo.max_discount) {
          discountAmount = promo.max_discount
        }
      }

      // Ensure discount doesn't exceed cart total
      if (discountAmount > input.cartTotal) {
        discountAmount = input.cartTotal
      }

      return {
        valid: true,
        discountAmount,
        promoId: promo.id,
        promoName: promo.name,
        promoCode: promo.code,
      }
    }),

  /**
   * Record promotion usage (called after transaction is created)
   */
  recordUsage: protectedProcedure
    .input(
      z.object({
        promotionId: z.string().uuid(),
        transactionId: z.string().uuid(),
        discountApplied: z.number(),
        userId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Increment promotion uses_count
      const { error: updateError } = await supabase.rpc('increment_promotion_uses', {
        promo_id: input.promotionId,
      })

      // If the RPC doesn't exist, do it manually
      if (updateError) {
        const { data: promo } = await supabase
          .from('promotions')
          .select('uses_count')
          .eq('id', input.promotionId)
          .single()

        if (promo) {
          await supabase
            .from('promotions')
            .update({ uses_count: promo.uses_count + 1 })
            .eq('id', input.promotionId)
        }
      }

      // Record usage
      const { error } = await supabase.from('promotion_usage').insert({
        promotion_id: input.promotionId,
        transaction_id: input.transactionId,
        user_id: input.userId,
        discount_applied: input.discountApplied,
      })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to record promotion usage: ${error.message}`,
        })
      }

      return { success: true }
    }),

  /**
   * Create promotion (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(3).max(50),
        name: z.string().min(3),
        description: z.string().optional(),
        type: z.enum(['fixed', 'percentage', 'buy_x_get_y']),
        discountAmount: z.number().optional(),
        discountPercentage: z.number().min(0).max(100).optional(),
        minPurchase: z.number().optional(),
        maxDiscount: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        maxUses: z.number().optional(),
        maxUsesPerCustomer: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          code: input.code.toUpperCase(),
          name: input.name,
          description: input.description,
          type: input.type,
          discount_amount: input.discountAmount,
          discount_percentage: input.discountPercentage,
          min_purchase: input.minPurchase,
          max_discount: input.maxDiscount,
          start_date: input.startDate,
          end_date: input.endDate,
          max_uses: input.maxUses,
          max_uses_per_customer: input.maxUsesPerCustomer,
          created_by: ctx.userId,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create promotion: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'promotion',
        entityId: data.id,
        changes: { promotion: data },
      })

      return data
    }),

  /**
   * Update promotion (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isActive: z.boolean().optional(),
        endDate: z.string().optional(),
        maxUses: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input

      const { data, error } = await supabase
        .from('promotions')
        .update({
          is_active: updates.isActive,
          end_date: updates.endDate,
          max_uses: updates.maxUses,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update promotion: ${error.message}`,
        })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'promotion',
        entityId: id,
        changes: { updates },
      })

      return data
    }),

  /**
   * List all promotions
   */
  list: protectedProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      let query = supabase
        .from('promotions')
        .select('*, created_by_user:users!created_by (id, name)')
        .order('created_at', { ascending: false })

      if (input.activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch promotions: ${error.message}`,
        })
      }

      return data || []
    }),

  /**
   * Get promotion by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, created_by_user:users!created_by (id, name)')
        .eq('id', input.id)
        .single()

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Promotion not found',
        })
      }

      return data
    }),

  /**
   * Get promotion usage stats
   */
  getUsageStats: adminProcedure
    .input(z.object({ promotionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data: usage, error } = await supabase
        .from('promotion_usage')
        .select('*, transactions (total_amount, created_at)')
        .eq('promotion_id', input.promotionId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch usage stats: ${error.message}`,
        })
      }

      const totalDiscount = (usage || []).reduce(
        (sum, u) => sum + u.discount_applied,
        0
      )
      const totalRevenue = (usage || []).reduce(
        (sum, u) => sum + (u.transactions?.total_amount || 0),
        0
      )

      return {
        usage: usage || [],
        totalUses: usage?.length || 0,
        totalDiscount,
        totalRevenue,
      }
    }),
})
