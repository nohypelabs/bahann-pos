import { createHash } from 'node:crypto'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { getUserOutletIds } from '@/server/lib/tenant'
import { getLimits } from '@/lib/plans'
import { getRedisClient } from '@/lib/redis-upstash'
import { container } from '@/infra/container'
import { businessDate } from '@/lib/business/timezone'
import { loadDashboardOverview } from '@/infra/repositories/SupabaseDashboardOverview'

const DASHBOARD_CACHE_TTL = 120 // 2 minutes

/**
 * Keyed on the outlets actually read, resolved for the caller before the cache is
 * consulted: a cashier never gets an admin's all-outlet figures, and never fills
 * the admin's entry with their own.
 */
function dashKey(type: string, tenantId: string, outletIds: string[], suffix: string) {
  const scope = createHash('sha1').update([...outletIds].sort().join(',')).digest('hex').slice(0, 16)
  return `dash:${type}:${tenantId}:${scope}:${suffix}`
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
  /**
   * Everything the dashboard cards and charts show for the last `days` business days, with
   * the period before it for the change figures. Built from completed sales only.
   */
  getOverview: protectedProcedure
    .input(z.object({ outletId: z.string().uuid().optional(), days: z.number().int().min(1).max(90).default(7) }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input.outletId)
      const cacheKey = dashKey('overview', tenantId, outletIds, `${input.days}:${businessDate()}`)
      return withCache(cacheKey, 60, () => loadDashboardOverview(tenantId, outletIds, input.days))
    }),

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
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
      const cacheKey = dashKey('stats', tenantId, outletIds, `${input?.days ?? 'all'}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
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
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
      const cacheKey = dashKey('trend', tenantId, outletIds, `${days}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
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
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
      const cacheKey = dashKey('top', tenantId, outletIds, `${days}:${limit}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
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
      const today = businessDate()
      const tenantId = ctx.session.tenantId!
      const useCase = container.dashboardUseCase()
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
      const cacheKey = dashKey('low', tenantId, outletIds, `${threshold}:${today}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL * 2, async () => {
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
      const outletIds = await resolveOutletIds(ctx.userId, tenantId, input?.outletId)
      const cacheKey = dashKey('recent', tenantId, outletIds, `${limit}:${days ?? 'all'}`)
      return withCache(cacheKey, 30, async () => {
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
