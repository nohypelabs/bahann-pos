import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { getUserOutletIds, getTenantOutletIds } from '@/server/lib/tenant'
import { getLimits } from '@/lib/plans'
import { getRedisClient } from '@/lib/redis-upstash'
import { container } from '@/infra/container'

const DASHBOARD_CACHE_TTL = 120 // 2 minutes

function dashKey(type: string, tenantId: string, outletId: string | undefined, suffix: string) {
  return `dash:${type}:${tenantId}:${outletId ?? 'all'}:${suffix}`
}

async function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const redis = getRedisClient()
  if (redis) {
    try {
      const cached = await redis.get<string>(key)
      if (cached != null) return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T
    } catch { /* cache miss — fall through */ }
  }
  const result = await fetcher()
  if (redis) {
    try { await redis.setex(key, ttl, JSON.stringify(result)) } catch { /* non-fatal */ }
  }
  return result
}

/**
 * Resolve outlet IDs based on user's RBAC scope.
 * If specificOutletId provided, verify access.
 * Otherwise return all accessible outlets.
 */
async function resolveOutletIds(userId: string, tenantId: string, specificOutletId?: string): Promise<string[]> {
  if (specificOutletId) {
    // Verify user has access to this specific outlet
    const userOutlets = await getUserOutletIds(userId, tenantId)
    if (!userOutlets.includes(specificOutletId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Outlet not accessible' })
    }
    return [specificOutletId]
  }
  // Return all outlets user can access (RBAC-aware)
  return getUserOutletIds(userId, tenantId)
}

export const dashboardRouter = router({
  getStats: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        days: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('stats', tenantId, input?.outletId, `${input?.days ?? 'all'}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
        return useCase.getStats(outletIds, tenantId, input?.days)
      })
    }),

  getSalesTrend: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        days: z.number().default(7),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const days = input?.days ?? 7
      const tenantId = ctx.session.tenantId!
      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('trend', tenantId, input?.outletId, `${days}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
        return useCase.getSalesTrend(outletIds, days)
      })
    }),

  getTopProducts: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(5),
        days: z.number().default(7),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const days = input?.days ?? 7
      const limit = input?.limit || 5
      const tenantId = ctx.session.tenantId!
      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('top', tenantId, input?.outletId, `${days}:${limit}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
        return useCase.getTopProducts(outletIds, days, limit)
      })
    }),

  getLowStock: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        threshold: z.number().default(10),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const threshold = input?.threshold || 10
      const today = new Date().toISOString().split('T')[0]
      const tenantId = ctx.session.tenantId!
      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('low', tenantId, input?.outletId, `${threshold}:${today}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL * 2, async () => {
        const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
        return useCase.getLowStock(outletIds, threshold)
      })
    }),

  getRecentTransactions: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(10),
        days: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const limit = input?.limit || 10
      const days = input?.days
      const tenantId = ctx.session.tenantId!
      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('recent', tenantId, input?.outletId, `${limit}:${days ?? 'all'}`)
      return withCache(cacheKey, 30, async () => {
        const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
        return useCase.getRecentTransactions(outletIds, limit, days)
      })
    }),

  exportReport: protectedProcedure
    .input(z.object({
      outletId: z.string().uuid().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input.outletId)
      const plan = await container.userRepository().getPlan(ctx.userId)
      const useCase = container.dashboardUseCase()
      const result = await useCase.exportReport(outletIds, ctx.userId, plan, input.days)

      if (!result.allowed) {
        throw new TRPCError({ code: 'FORBIDDEN', message: result.message })
      }

      return { salesTrend: result.salesTrend, topProducts: result.topProducts }
    }),
})
