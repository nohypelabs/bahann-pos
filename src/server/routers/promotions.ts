/**
 * Promotions Router
 * Handles discount codes and promotions
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { getTenantOwnerId } from '@/server/lib/tenant'
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
    .mutation(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      const uc = container.promotionUseCase()

      try {
        return await uc.validate({
          code: input.code,
          cartTotal: input.cartTotal,
          userId: input.userId,
        }, ownerId ?? '')
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('Invalid')) throw new TRPCError({ code: 'NOT_FOUND', message: msg })
        throw new TRPCError({ code: 'BAD_REQUEST', message: msg })
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
      const uc = container.promotionUseCase()
      try {
        await uc.recordUsage(input)
        return { success: true }
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }
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
      const uc = container.promotionUseCase()
      let data
      try {
        data = await uc.create({ ...input, createdBy: ctx.userId })
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
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
      const uc = container.promotionUseCase()
      const { id, ...updates } = input
      let data
      try {
        data = await uc.update(id, updates)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
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
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      const uc = container.promotionUseCase()
      try {
        return await uc.list(ownerId, { activeOnly: input.activeOnly })
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }
    }),

  /**
   * Get promotion by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      const uc = container.promotionUseCase()
      try {
        return await uc.getById(input.id, ownerId)
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Promotion not found' })
      }
    }),

  /**
   * Get promotion usage stats
   */
  getUsageStats: adminProcedure
    .input(z.object({ promotionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const uc = container.promotionUseCase()
      try {
        return await uc.getUsageStats(input.promotionId)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }
    }),
})
