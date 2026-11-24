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
import { supabaseAdmin } from '@/infra/supabase/server'
import { formatSku, internalBarcode, skuPrefix } from '@/domain/catalog/productCodes'

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
        /** The whole matching catalogue instead of one page (ignores page and limit). */
        all: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const useCase = container.listProductsUseCase()
      const filters = {
        search: input?.search,
        category: input?.category,
        itemType: input?.itemType,
        stockBehavior: input?.stockBehavior,
        tenantId,
      }
      if (input?.all) return useCase.executeAll(filters)
      return useCase.execute({ filters, page: input?.page, limit: input?.limit })
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
        costPrice: z.number().nonnegative().nullable().optional(),
        itemType: z.enum(ITEM_TYPES as [string, ...string[]]).default('PRODUCT'),
        stockBehavior: z.enum(STOCK_BEHAVIORS as [string, ...string[]]).default('TRACKED'),
        pricingModel: z.enum(PRICING_MODELS as [string, ...string[]]).default('FIXED'),
        pricingTiers: z.array(z.object({
          minQuantity: z.number().positive(),
          pricePerUnit: z.number().positive(),
        })).optional(),
        durationMinutes: z.number().positive().optional(),
        imageUrl: z.string().optional().nullable(),
        image_url: z.string().optional().nullable(),
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
        costPrice: z.number().nonnegative().nullable().optional(),
        itemType: z.enum(ITEM_TYPES as [string, ...string[]]).optional(),
        stockBehavior: z.enum(STOCK_BEHAVIORS as [string, ...string[]]).optional(),
        pricingModel: z.enum(PRICING_MODELS as [string, ...string[]]).optional(),
        pricingTiers: z.array(z.object({
          minQuantity: z.number().positive(),
          pricePerUnit: z.number().positive(),
        })).optional(),
        durationMinutes: z.number().positive().optional(),
        imageUrl: z.string().optional().nullable(),
        image_url: z.string().optional().nullable(),
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
            after: { sku: input.sku, barcode: input.barcode, name: input.name, category: input.category, price: input.price, costPrice: input.costPrice },
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

  /**
   * A fresh SKU (category prefix + running number) or in-store EAN-13 barcode
   * for the product form. Numbers come from a per-tenant counter, so two people
   * never get the same one; a number taken by a hand-typed code is skipped.
   */
  generateCode: adminProcedure
    .input(z.object({ kind: z.enum(['sku', 'barcode']), category: z.string().max(100).optional() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session!.tenantId!
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data, error } = await supabaseAdmin.rpc('next_product_codes', { p_tenant_id: tenantId, p_kind: input.kind, p_count: 1 })
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        const n = Number((data as number[])[0])
        const code = input.kind === 'sku' ? formatSku(skuPrefix(input.category), n) : internalBarcode(n)
        const { count } = await supabaseAdmin
          .from('products').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).eq(input.kind, code)
        if (!count) return { code }
      }
      throw new TRPCError({ code: 'CONFLICT', message: 'No free code after 10 attempts' })
    }),

  /**
   * Gives products without a barcode an in-store EAN-13, in one database
   * transaction. Without a selection it covers every item except services, which
   * are never scanned; selected products get one whatever their type.
   */
  assignMissingBarcodes: adminProcedure
    .input(z.object({ productIds: z.array(z.string().uuid()).max(5000).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session!.tenantId!
      let productIds = input?.productIds
      if (!productIds) {
        const { data: rows, error: listError } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .neq('item_type', 'SERVICE')
          .or('barcode.is.null,barcode.eq.')
          .limit(5000)
        if (listError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: listError.message })
        productIds = (rows ?? []).map((r) => r.id as string)
        if (productIds.length === 0) return { count: 0, assigned: [] }
      }
      const { data, error } = await supabaseAdmin.rpc('assign_missing_barcodes', {
        p_tenant_id: tenantId,
        p_product_ids: productIds,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const assigned = (data ?? []) as { product_id: string; barcode: string }[]

      await createAuditLog({
        userId: ctx.userId!,
        userEmail: ctx.session!.email || 'unknown',
        action: 'UPDATE',
        entityType: 'product',
        entityId: 'bulk',
        metadata: { action: 'assign_missing_barcodes', count: assigned.length },
      })
      return { count: assigned.length, assigned }
    }),

  /** Name, codes and price of the given products, for printing labels. */
  getForLabels: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('id, name, sku, barcode, price')
        .eq('tenant_id', ctx.session.tenantId!)
        .in('id', input.ids)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string, sku: p.sku as string, barcode: (p.barcode as string | null) ?? null, price: Number(p.price ?? 0) }))
    }),
})
