import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'

export const productsRouter = router({
  /**
   * Get all products with pagination
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
    .query(async ({ input }) => {
      const page = input?.page || 1
      const limit = input?.limit || 50
      const offset = (page - 1) * limit

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

      // Apply filters to both queries
      if (input?.search) {
        const searchFilter = `name.ilike.%${input.search}%,sku.ilike.%${input.search}%`
        countQuery = countQuery.or(searchFilter)
        dataQuery = dataQuery.or(searchFilter)
      }

      if (input?.category) {
        countQuery = countQuery.eq('category', input.category)
        dataQuery = dataQuery.eq('category', input.category)
      }

      // Execute both queries
      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
        countQuery,
        dataQuery,
      ])

      if (countError) {
        throw new Error(`Failed to count products: ${countError.message}`)
      }

      if (dataError) {
        throw new Error(`Failed to fetch products: ${dataError.message}`)
      }

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

      if (error) {
        throw new Error(`Failed to fetch product: ${error.message}`)
      }

      return data
    }),

  /**
   * Create new product - ADMIN ONLY (with Audit Logging)
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
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create product: ${error.message}`)
      }

      // Audit log
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
   * Update product - ADMIN ONLY (with Audit Logging)
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
      // Get old data for audit trail
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

      if (error) {
        throw new Error(`Failed to update product: ${error.message}`)
      }

      // Audit log with before/after comparison
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
   * Delete product - ADMIN ONLY (with Audit Logging)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get product data before deletion for audit trail
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', input.id)
        .single()

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new Error(`Failed to delete product: ${error.message}`)
      }

      // Audit log
      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'product',
        entityId: input.id,
        changes: { deleted: productData },
        metadata: {
          sku: productData?.sku,
          name: productData?.name,
        },
      })

      return { success: true }
    }),

  /**
   * Get categories
   */
  getCategories: protectedProcedure.query(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    // Get unique categories
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

      // Update all selected products
      const { error } = await supabase
        .from('products')
        .update({ category: category || null })
        .in('id', productIds)

      if (error) {
        throw new Error(`Failed to batch update: ${error.message}`)
      }

      // Audit log
      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'product',
        entityId: 'batch',
        changes: {
          productIds,
          newCategory: category,
        },
        metadata: {
          count: productIds.length,
          category,
        },
      })

      return { success: true, count: productIds.length }
    }),

  /**
   * Batch delete products - ADMIN ONLY
   */
  batchDelete: adminProcedure
    .input(
      z.object({
        productIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productIds } = input

      // Get product data before deletion for audit trail
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      // Delete all selected products
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', productIds)

      if (error) {
        throw new Error(`Failed to batch delete: ${error.message}`)
      }

      // Audit log
      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'product',
        entityId: 'batch',
        changes: {
          deleted: productsData,
        },
        metadata: {
          count: productIds.length,
          productNames: productsData?.map(p => p.name).join(', '),
        },
      })

      return { success: true, count: productIds.length }
    }),
})
