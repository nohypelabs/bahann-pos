import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { container } from '@/infra/container'
import { assertOutletBelongsToTenant, getTenantOutletIds } from '@/server/lib/tenant'

export const stockRouter = router({
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
      const tenantId = ctx.session.tenantId!
      if (tenantId) await assertOutletBelongsToTenant(ctx.userId, tenantId, input.outletId)

      const useCase = container.adjustStockUseCase()
      await useCase.execute({
        ...input,
        userId: ctx.userId,
        tenantId,
      })

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
      const tenantId = ctx.session.tenantId!
      if (tenantId) await assertOutletBelongsToTenant(ctx.userId, tenantId, input.outletId)

      const useCase = container.listStockUseCase()
      return useCase.getLatest(input.outletId, input.productId)
    }),

  getInventoryList: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const ownerId = ctx.session.tenantId!

      const useCase = container.listStockUseCase()
      return useCase.getInventoryList(ownerId ?? undefined, input?.outletId)
    }),

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
      const ownerId = ctx.session.tenantId!

      let outletIds: string[] | undefined
      if (ownerId) {
        outletIds = await getTenantOutletIds(ownerId)
      }

      const useCase = container.listStockUseCase()
      return useCase.getMovements({
        outletId: input?.outletId,
        productId: input?.productId,
        outletIds: outletIds && outletIds.length > 0 ? outletIds : undefined,
        limit: input?.limit,
        offset: input?.offset,
      })
    }),
})
