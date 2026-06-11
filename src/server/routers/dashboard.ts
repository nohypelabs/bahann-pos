import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { getTenantOwnerId, getTenantOutletIds } from '@/server/lib/tenant'
import { getLimits } from '@/lib/plans'
import { getRedisClient } from '@/lib/redis-upstash'
import { container } from '@/infra/container'

const DASHBOARD_CACHE_TTL = 120 // 2 minutes

function dashKey(type: string, ownerId: string, outletId: string | undefined, suffix: string) {
  return `dash:${type}:${ownerId}:${outletId ?? 'all'}:${suffix}`
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

async function resolveOutletIds(ownerId: string, specificOutletId?: string): Promise<string[]> {
  if (specificOutletId) {
    const outlet = await container.outletRepo().findByIdAndOwner(specificOutletId, ownerId)
    return outlet ? [outlet.id] : []
  }
  return getTenantOutletIds(ownerId)
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
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('stats', ownerId, input?.outletId, `${input?.days ?? 'all'}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await resolveOutletIds(ownerId, input?.outletId)
        return useCase.getStats(outletIds, ownerId, input?.days)
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
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('trend', ownerId, input?.outletId, `${days}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await resolveOutletIds(ownerId, input?.outletId)
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
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('top', ownerId, input?.outletId, `${days}:${limit}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL, async () => {
        const outletIds = await resolveOutletIds(ownerId, input?.outletId)
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

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('low', ownerId, input?.outletId, `${threshold}:${today}`)
      return withCache(cacheKey, DASHBOARD_CACHE_TTL * 2, async () => {
        const outletIds = await resolveOutletIds(ownerId, input?.outletId)
        return useCase.getLowStock(outletIds, threshold)
      })
    }),

  getRecentTransactions: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const limit = input?.limit || 10

      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const useCase = container.dashboardUseCase()
      const cacheKey = dashKey('recent', ownerId, input?.outletId, `${limit}`)
      return withCache(cacheKey, 30, async () => {
        const outletIds = await resolveOutletIds(ownerId, input?.outletId)
        return useCase.getRecentTransactions(outletIds, limit)
      })
    }),

  exportReport: protectedProcedure
    .input(z.object({
      outletId: z.string().uuid().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Tenant not found' })

      const outletIds = await resolveOutletIds(ownerId, input.outletId)

      const plan = await container.userRepository().getPlan(ctx.userId)

      const useCase = container.dashboardUseCase()
      const result = await useCase.exportReport(outletIds, ctx.userId, plan, input.days)

      if (!result.allowed) {
        throw new TRPCError({ code: 'FORBIDDEN', message: result.message })
      }

      return { salesTrend: result.salesTrend, topProducts: result.topProducts }
    }),
})
