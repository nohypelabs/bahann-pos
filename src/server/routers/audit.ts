/**
 * Audit Logs Router
 * Handles viewing and filtering audit trail for compliance
 */

import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { TRPCError } from '@trpc/server'

export const auditRouter = router({
  /**
   * Get audit logs with filtering and pagination
   */
  getLogs: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        searchQuery: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'estimated' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (input.userId) query = query.eq('user_id', input.userId)
      if (input.action) query = query.eq('action', input.action)
      if (input.entityType) query = query.eq('entity_type', input.entityType)
      if (input.dateFrom) query = query.gte('created_at', input.dateFrom)
      if (input.dateTo) query = query.lte('created_at', input.dateTo)

      // Search in user_email or entity_id
      if (input.searchQuery) {
        query = query.or(
          `user_email.ilike.%${input.searchQuery}%,entity_id.eq.${input.searchQuery}`
        )
      }

      // Pagination
      query = query.range(input.offset, input.offset + input.limit - 1)

      const { data, count, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch audit logs: ${error.message}`,
        })
      }

      return {
        logs: data || [],
        total: count || 0,
      }
    }),

  /**
   * Get audit log by ID with full details
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audit log not found',
        })
      }

      return data
    }),

  /**
   * Get summary statistics for audit logs
   */
  getStats: adminProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      let query = supabase
        .from('audit_logs')
        .select('action, entity_type, user_id')

      if (input?.dateFrom) query = query.gte('created_at', input.dateFrom)
      if (input?.dateTo) query = query.lte('created_at', input.dateTo)

      const { data, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch audit stats: ${error.message}`,
        })
      }

      // Aggregate stats
      const stats = {
        totalLogs: data?.length || 0,
        byAction: {} as Record<string, number>,
        byEntityType: {} as Record<string, number>,
        uniqueUsers: new Set<string>(),
      }

      data?.forEach((log) => {
        // Count by action
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1

        // Count by entity type
        stats.byEntityType[log.entity_type] =
          (stats.byEntityType[log.entity_type] || 0) + 1

        // Unique users
        stats.uniqueUsers.add(log.user_id)
      })

      return {
        totalLogs: stats.totalLogs,
        byAction: stats.byAction,
        byEntityType: stats.byEntityType,
        uniqueUsersCount: stats.uniqueUsers.size,
      }
    }),

  /**
   * Get distinct values for filters
   */
  getFilterOptions: adminProcedure.query(async () => {
    // Get distinct actions
    const { data: actions } = await supabase
      .from('audit_logs')
      .select('action')
      .order('action')

    // Get distinct entity types
    const { data: entityTypes } = await supabase
      .from('audit_logs')
      .select('entity_type')
      .order('entity_type')

    // Get distinct users
    const { data: users } = await supabase
      .from('audit_logs')
      .select('user_id, user_email')
      .order('user_email')

    return {
      actions: [...new Set(actions?.map((a) => a.action) || [])],
      entityTypes: [...new Set(entityTypes?.map((e) => e.entity_type) || [])],
      users: users || [],
    }
  }),
})
