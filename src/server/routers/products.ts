import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { getTenantOwnerId, assertProductBelongsToTenant } from '@/server/lib/tenant'

export const productsRouter = router({
  /**
   * Get all products scoped to the current user's tenant
   */
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const page = input?.page || 1
      const limit = input?.limit || 50
      const offset = (page - 1) * limit

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)

      // Build count query
      let countQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Build data query
      let dataQuery = supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1)

      // Scope to tenant when owner is known
      if (ownerId) {
        countQuery = countQuery.eq('owner_id', ownerId)
        dataQuery = dataQuery.eq('owner_id', ownerId)
      }

      if (input?.search) {
        const searchFilter = `name.ilike.%${input.search}%,sku.ilike.%${input.search}%`
        countQuery = countQuery.or(searchFilter)
        dataQuery = dataQuery.or(searchFilter)
      }

      if (input?.category) {
        countQuery = countQuery.eq('category', input.category)
        dataQuery = dataQuery.eq('category', input.category)
      }

      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
        countQuery,
        dataQuery,
      ])

      if (countError) throw new Error(`Failed to count products: ${countError.message}`)
      if (dataError) throw new Error(`Failed to fetch products: ${dataError.message}`)

      return {
        products: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }),

  /**
   * Get product by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) throw new Error(`Failed to fetch product: ${error.message}`)
      return data
    }),

  /**
   * Create new product - ADMIN ONLY
   */
  create: adminProcedure
    .input(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        category: z.string().optional(),
        price: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          sku: input.sku,
          name: input.name,
          category: input.category || null,
          price: input.price || null,
          owner_id: ctx.userId,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create product: ${error.message}`)

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
    }),

  /**
   * Update product - ADMIN ONLY
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        sku: z.string().min(1),
        name: z.string().min(1),
        category: z.string().optional(),
        price: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProductBelongsToTenant(input.id, ctx.userId)

      const { data: oldData } = await supabase
        .from('products')
        .select('*')
        .eq('id', input.id)
        .single()

      const { data, error } = await supabase
        .from('products')
        .update({
          sku: input.sku,
          name: input.name,
          category: input.category || null,
          price: input.price || null,
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update product: ${error.message}`)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'product',
        entityId: input.id,
        changes: {
          before: oldData,
          after: { sku: input.sku, name: input.name, category: input.category, price: input.price },
        },
        metadata: { sku: input.sku, name: input.name },
      })

      return data
    }),

  /**
   * Delete product - ADMIN ONLY
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await assertProductBelongsToTenant(input.id, ctx.userId)

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', input.id)
        .single()

      const { count: txCount } = await supabase
        .from('transaction_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', input.id)

      if (txCount && txCount > 0) {
        throw new Error(`Cannot delete "${productData?.name}" — it has ${txCount} transaction record(s). Products with sales history cannot be deleted.`)
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', input.id)

      if (error) throw new Error(`Failed to delete product: ${error.message}`)

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
    }),

  /**
   * Get categories scoped to tenant
   */
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)

    let query = supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)

    if (ownerId) {
      query = query.eq('owner_id', ownerId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`)

    const categories = [...new Set(data.map((p) => p.category).filter(Boolean))]
    return categories as string[]
  }),

  /**
   * Batch update category - ADMIN ONLY
   */
  batchUpdateCategory: adminProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).min(1),
        category: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productIds, category } = input

      // Verify all products belong to this tenant
      const { data: products } = await supabase
        .from('products')
        .select('id, owner_id')
        .in('id', productIds)

      const unauthorized = products?.filter(p => p.owner_id !== ctx.userId) || []
      if (unauthorized.length > 0) {
        throw new Error('Access denied: some products belong to a different tenant')
      }

      const { error } = await supabase
        .from('products')
        .update({ category: category || null })
        .in('id', productIds)

      if (error) throw new Error(`Failed to batch update: ${error.message}`)

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

  /**
   * Batch delete products - ADMIN ONLY
   */
  batchDelete: adminProcedure
    .input(z.object({ productIds: z.array(z.string().uuid()).min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { productIds } = input

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      // Verify all products belong to this tenant
      const unauthorized = productsData?.filter(p => p.owner_id !== ctx.userId) || []
      if (unauthorized.length > 0) {
        throw new Error('Access denied: some products belong to a different tenant')
      }

      const { data: referencedItems } = await supabase
        .from('transaction_items')
        .select('product_id')
        .in('product_id', productIds)

      const referencedIds = new Set(referencedItems?.map(item => item.product_id) || [])
      const deletableIds = productIds.filter(id => !referencedIds.has(id))
      const skippedProducts = productsData?.filter(p => referencedIds.has(p.id)) || []

      if (deletableIds.length === 0) {
        return {
          success: false,
          count: 0,
          skippedCount: skippedProducts.length,
          skippedNames: skippedProducts.map(p => p.name),
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', deletableIds)

      if (error) throw new Error(`Failed to batch delete: ${error.message}`)

      const deletedProducts = productsData?.filter(p => deletableIds.includes(p.id)) || []

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'product',
        entityId: 'batch',
        changes: { deleted: deletedProducts },
        metadata: {
          count: deletableIds.length,
          productNames: deletedProducts.map(p => p.name).join(', '),
        },
      })

      return {
        success: true,
        count: deletableIds.length,
        skippedCount: skippedProducts.length,
        skippedNames: skippedProducts.map(p => p.name),
      }
    }),
})
