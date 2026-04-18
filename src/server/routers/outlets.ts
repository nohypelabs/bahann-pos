import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { getTenantOwnerId, assertOutletBelongsToTenant } from '@/server/lib/tenant'
import { getLimits, isUnlimited } from '@/lib/plans'

export const outletsRouter = router({
  /**
   * Get all outlets scoped to the current user's tenant
   */
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
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
        .from('outlets')
        .select('*', { count: 'exact', head: true })

      // Build data query
      let dataQuery = supabase
        .from('outlets')
        .select('*')
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1)

      // Scope to tenant when owner is known
      if (ownerId) {
        countQuery = countQuery.eq('owner_id', ownerId)
        dataQuery = dataQuery.eq('owner_id', ownerId)
      }

      // Apply search filter
      if (input?.search) {
        const searchFilter = `name.ilike.%${input.search}%,address.ilike.%${input.search}%`
        countQuery = countQuery.or(searchFilter)
        dataQuery = dataQuery.or(searchFilter)
      }

      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
        countQuery,
        dataQuery,
      ])

      if (countError) throw new Error(`Failed to count outlets: ${countError.message}`)
      if (dataError) throw new Error(`Failed to fetch outlets: ${dataError.message}`)

      return {
        outlets: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }
    }),

  /**
   * Get outlet by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) throw new Error(`Failed to fetch outlet: ${error.message}`)
      return data
    }),

  /**
   * Create new outlet - ADMIN ONLY
   */
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { data: userData } = await supabase
        .from('users')
        .select('plan')
        .eq('id', ctx.userId)
        .single()

      const limits = getLimits(userData?.plan ?? 'free')

      if (!isUnlimited(limits.maxOutlets)) {
        const { count } = await supabase
          .from('outlets')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', ctx.userId)

        if ((count ?? 0) >= limits.maxOutlets) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Plan kamu hanya mendukung ${limits.maxOutlets} outlet. Upgrade untuk menambah lebih banyak.`,
          })
        }
      }

      const { data, error } = await supabase
        .from('outlets')
        .insert({
          name: input.name,
          owner_id: ctx.userId,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create outlet: ${error.message}`)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'outlet',
        entityId: data.id,
        changes: { created: input },
        metadata: { name: input.name },
      })

      return data
    }),

  /**
   * Update outlet - ADMIN ONLY
   */
  update: adminProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      await assertOutletBelongsToTenant(input.id, ctx.userId)

      const { data: oldData } = await supabase
        .from('outlets')
        .select('*')
        .eq('id', input.id)
        .single()

      const { data, error } = await supabase
        .from('outlets')
        .update({ name: input.name })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update outlet: ${error.message}`)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'outlet',
        entityId: input.id,
        changes: { before: oldData, after: { name: input.name } },
        metadata: { name: input.name },
      })

      return data
    }),

  /**
   * Delete outlet - ADMIN ONLY
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await assertOutletBelongsToTenant(input.id, ctx.userId)

      const { data: outletData } = await supabase
        .from('outlets')
        .select('*')
        .eq('id', input.id)
        .single()

      const { error } = await supabase
        .from('outlets')
        .delete()
        .eq('id', input.id)

      if (error) throw new Error(`Failed to delete outlet: ${error.message}`)

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'outlet',
        entityId: input.id,
        changes: { deleted: outletData },
        metadata: { name: outletData?.name },
      })

      return { success: true }
    }),
})
