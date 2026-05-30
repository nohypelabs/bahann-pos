import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { RecordDailySaleUseCase } from '@/use-cases/sale/RecordDailySaleUseCase'
import { SupabaseDailySaleRepository } from '@/infra/repositories/SupabaseDailySaleRepository'
import { assertOutletBelongsToTenant } from '@/server/lib/tenant'
import { getTenantOwnerId } from '@/server/lib/tenant'
import { TRPCError } from '@trpc/server'

const salesRepository = new SupabaseDailySaleRepository()

const offlineTransactionItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().positive(),
  total: z.number().nonnegative().optional(),
})

const offlineTransactionSchema = z.object({
  transactionId: z.string().min(1),
  outletId: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(offlineTransactionItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  paymentMethod: z.enum(['cash', 'debit', 'credit', 'qris']),
  amountPaid: z.number().nonnegative(),
  change: z.number().optional(),
  notes: z.string().optional(),
  timestamp: z.number().optional(),
})

export const salesRouter = router({
  record: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        outletId: z.string().uuid(),
        saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        quantitySold: z.number().min(1),
        unitPrice: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (ownerId) await assertOutletBelongsToTenant(input.outletId, ownerId)

      const useCase = new RecordDailySaleUseCase(salesRepository)
      await useCase.execute(input)
      return { success: true }
    }),

  recordOffline: protectedProcedure
    .input(offlineTransactionSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Offline replay must belong to the authenticated user',
        })
      }

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (ownerId) await assertOutletBelongsToTenant(input.outletId, ownerId)

      const saleDate = new Date(input.timestamp ?? Date.now()).toISOString().split('T')[0]
      const useCase = new RecordDailySaleUseCase(salesRepository)

      for (const item of input.items) {
        await useCase.execute({
          productId: item.productId,
          outletId: input.outletId,
          saleDate,
          quantitySold: item.quantity,
          unitPrice: item.unitPrice,
        })
      }

      return {
        success: true,
        transactionId: input.transactionId,
        recordedItems: input.items.length,
      }
    }),

  getByDateRange: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (ownerId) await assertOutletBelongsToTenant(input.outletId, ownerId)

      const sales = await salesRepository.getByDateRange(
        input.outletId,
        new Date(input.startDate),
        new Date(input.endDate)
      )
      return sales
    }),
})
