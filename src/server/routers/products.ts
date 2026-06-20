import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { assertProductBelongsToTenant } from '@/server/lib/tenant'
import { DomainException } from '@/domain/errors/DomainException'
import { ITEM_TYPES } from '@/domain/catalog/value-objects/item-type'
import { STOCK_BEHAVIORS } from '@/domain/catalog/value-objects/stock-behavior'
import { PRICING_MODELS } from '@/domain/catalog/value-objects/pricing-model'

export const productsRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        itemType: z.enum(ITEM_TYPES as [string, ...string[]]).optional(),
        stockBehavior: z.enum(STOCK_BEHAVIORS as [string, ...string[]]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const useCase = container.listProductsUseCase()
      return useCase.execute({
        filters: {
          search: input?.search,
          category: input?.category,
          itemType: input?.itemType,
          stockBehavior: input?.stockBehavior,
          tenantId,
        },
        page: input?.page,
        limit: input?.limit,
      })
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ownerId = ctx.session.tenantId!

      const productRepo = container.productRepo()
      const data = await productRepo.getById(input.id, ownerId ?? undefined)

      if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Produk tidak ditemukan' })
      return data
    }),

  create: adminProcedure
    .input(
      z.object({
        sku: z.string().min(1),
        barcode: z.string().optional(),
        name: z.string().min(1),
        category: z.string().optional(),
        price: z.number().positive().optional(),
        itemType: z.enum(ITEM_TYPES as [string, ...string[]]).default('PRODUCT'),
        stockBehavior: z.enum(STOCK_BEHAVIORS as [string, ...string[]]).default('TRACKED'),
        pricingModel: z.enum(PRICING_MODELS as [string, ...string[]]).default('FIXED'),
        pricingTiers: z.array(z.object({
          minQuantity: z.number().positive(),
          pricePerUnit: z.number().positive(),
        })).optional(),
        durationMinutes: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const useCase = container.createProductUseCase()

      try {
        const data = await useCase.execute({
          ...input,
          ownerId: ctx.userId,
          tenantId: ctx.session.tenantId!,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'CREATE',
          entityType: 'product',
          entityId: data.id,
          changes: { created: input },
          metadata: { sku: input.sku, name: input.name },
        })

        return data
      } catch (err) {
        if (err instanceof DomainException) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message })
        }
        throw err
      }
    }),

  bulkCreate: adminProcedure
    .input(
      z.object({
        products: z.array(
          z.object({
            sku: z.string().min(1),
            barcode: z.string().optional(),
            name: z.string().min(1),
            category: z.string().optional(),
            price: z.number().positive().optional(),
          })
        ).min(1).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const productRepo = container.productRepo()
      const rows = input.products.map((p) => ({
        sku: p.sku,
        barcode: p.barcode || null,
        name: p.name,
        category: p.category || null,
        price: p.price || null,
        ownerId: ctx.userId,
        tenantId: ctx.session.tenantId!,
        itemType: 'PRODUCT',
        stockBehavior: 'TRACKED',
        pricingModel: 'FIXED',
      }))

      const { inserted, skipped } = await productRepo.bulkUpsert(rows)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'product',
        entityId: 'bulk',
        changes: { bulk_import: { count: inserted, skipped: skipped.length } },
        metadata: { inserted, skipped: skipped.length },
      })

      return { inserted, skipped }
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        sku: z.string().min(1),
        barcode: z.string().optional(),
        name: z.string().min(1),
        category: z.string().optional(),
        price: z.number().positive().optional(),
        itemType: z.enum(ITEM_TYPES as [string, ...string[]]).optional(),
        stockBehavior: z.enum(STOCK_BEHAVIORS as [string, ...string[]]).optional(),
        pricingModel: z.enum(PRICING_MODELS as [string, ...string[]]).optional(),
        pricingTiers: z.array(z.object({
          minQuantity: z.number().positive(),
          pricePerUnit: z.number().positive(),
        })).optional(),
        durationMinutes: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProductBelongsToTenant(input.id, ctx.userId)

      const productRepo = container.productRepo()
      const oldData = await productRepo.getById(input.id)
      const useCase = container.updateProductUseCase()

      try {
        const data = await useCase.execute(input)

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'UPDATE',
          entityType: 'product',
          entityId: input.id,
          changes: {
            before: oldData,
            after: { sku: input.sku, barcode: input.barcode, name: input.name, category: input.category, price: input.price },
          },
          metadata: { sku: input.sku, name: input.name },
        })

        return data
      } catch (err) {
        if (err instanceof DomainException) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message })
        }
        throw err
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await assertProductBelongsToTenant(input.id, ctx.userId)

      const useCase = container.deleteProductUseCase()

      try {
        const productData = await useCase.execute(input)

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'DELETE',
          entityType: 'product',
          entityId: input.id,
          changes: { deleted: productData },
          metadata: { sku: productData?.sku, name: productData?.name },
        })

        return { success: true }
      } catch (err) {
        if (err instanceof Error && err.message.includes('transaction record')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message })
        }
        throw err
      }
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const ownerId = ctx.session.tenantId!

    const productRepo = container.productRepo()
    const categories = await productRepo.getCategories(ownerId ?? undefined)
    return categories
  }),

  batchUpdateCategory: adminProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).min(1),
        category: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productIds, category } = input
      const tenantId = ctx.session.tenantId!

      const productRepo = container.productRepo()
      const products = await productRepo.getByIds(productIds, tenantId)

      if (products.length !== productIds.length) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: some products belong to a different tenant' })
      }

      await productRepo.batchUpdateCategory(productIds, category || null)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'product',
        entityId: 'batch',
        changes: { productIds, newCategory: category },
        metadata: { count: productIds.length, category },
      })

      return { success: true, count: productIds.length }
    }),

  batchDelete: adminProcedure
    .input(z.object({ productIds: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { productIds } = input
      const tenantId = ctx.session.tenantId!

      const productRepo = container.productRepo()
      const productsData = await productRepo.getByIds(productIds, tenantId)

      if (productsData.length !== productIds.length) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: some products belong to a different tenant' })
      }

      const txCounts = await productRepo.countTransactionsByProducts(productIds)
      const referencedIds = new Set<string>()
      txCounts.forEach((_, key) => referencedIds.add(key))
      const deletableIds = productIds.filter((id) => !referencedIds.has(id))
      const skippedProducts = productsData.filter((p) => referencedIds.has(p.id))

      if (deletableIds.length === 0) {
        return {
          success: false,
          count: 0,
          skippedCount: skippedProducts.length,
          skippedNames: skippedProducts.map((p) => p.name),
        }
      }

      await productRepo.batchDelete(deletableIds)

      const deletedProducts = productsData.filter((p) => deletableIds.includes(p.id))

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'product',
        entityId: 'batch',
        changes: { deleted: deletedProducts },
        metadata: {
          count: deletableIds.length,
          productNames: deletedProducts.map((p) => p.name).join(', '),
        },
      })

      return {
        success: true,
        count: deletableIds.length,
        skippedCount: skippedProducts.length,
        skippedNames: skippedProducts.map((p) => p.name),
      }
    }),
})
