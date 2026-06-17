import { initTRPC, TRPCError } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { verifyJWT, JWTPayload } from '@/lib/jwt'
import { getRedisClient } from '@/lib/redis-upstash'
import { parseAuthCookieFromHeader } from '@/lib/cookies'
import { logger } from '@/lib/logger'
import { getTenantId, userHasPermission } from '@/server/lib/tenant'

/**
 * Session data interface
 */
export interface SessionData extends JWTPayload {
  userId: string
  email: string
  name: string
  role?: string
  outletId?: string
  tenantId?: string
}

/**
 * tRPC Context
 * Contains user session and request info
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  // Get token from httpOnly cookie (primary method)
  const cookieHeader = opts.req.headers.get('cookie')
  let token = parseAuthCookieFromHeader(cookieHeader)

  // Fallback: Check Authorization header (for API compatibility during migration)
  if (!token) {
    token = opts.req.headers.get('authorization')?.replace('Bearer ', '') || null
  }

  let userId: string | null = null
  let session: SessionData | null = null

  if (token) {
    try {
      const decoded = verifyJWT(token)
      userId = decoded.userId

      // Try to get session from Redis (optional)
      const redis = getRedisClient()
      if (redis) {
        try {
          const sessionData = await redis.get<SessionData>(`session:${userId}`)
          if (sessionData) {
            session = sessionData
          }
        } catch (error) {
          // Continue without Redis session, JWT is enough
          logger.debug('Failed to get session from Redis', { error })
        }
      }

      // If no Redis session, create a minimal session from JWT
      if (!session) {
        session = {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          outletId: decoded.outletId,
          tenantId: decoded.tenantId,
        }
      }

      // Ensure tenantId is populated
      if (session && !session.tenantId) {
        session.tenantId = await getTenantId(userId) ?? undefined
      }
    } catch (error) {
      // Invalid token, continue as unauthenticated
      logger.debug('Token verification failed', { error })
    }
  }

  return {
    userId,
    session,
    req: opts.req,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

/**
 * Initialize tRPC with context and transformer
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      session: ctx.session,
    },
  })
})

/**
 * Admin procedure - requires authentication AND admin-level role
 * Checks via RBAC: OWNER or ADMIN_TENANT role
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  // Legacy role check for backward compatibility
  const legacyAdmin = ctx.session.role === 'admin' || ctx.session.role === 'super_admin'

  // RBAC check: user has tenant-level access
  const tenantId = ctx.session.tenantId
  let rbacAdmin = false
  if (tenantId) {
    rbacAdmin = await userHasPermission(ctx.userId, tenantId, 'settings.manage')
  }

  if (!legacyAdmin && !rbacAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource. Admin role required.',
    })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      session: ctx.session,
    },
  })
})

/**
 * Super admin procedure - platform operator only
 */
export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' })
  }

  // Read role fresh from DB — not from JWT (JWT role may be stale after promotion)
  const { supabaseAdmin } = await import('@/infra/supabase/server')
  const { data } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', ctx.userId)
    .single()

  if (data?.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Super admin only' })
  }

  return next({ ctx: { ...ctx, userId: ctx.userId, session: ctx.session } })
})

/**
 * Permission-based middleware using RBAC
 * @param permissionKey - The permission key (e.g., 'pos.transaction.void.approve')
 * @param outletIdExtractor - Optional function to extract outletId from input
 */
export const requirePermission = (
  permissionKey: string,
  outletIdExtractor?: (input: any) => string | undefined,
) => {
  return t.middleware(async ({ ctx, next, getRawInput }) => {
    if (!ctx.userId || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      })
    }

    const tenantId = ctx.session.tenantId
    if (!tenantId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tenant associated with this account',
      })
    }

    // Legacy admin bypass
    if (ctx.session.role === 'admin' || ctx.session.role === 'super_admin') {
      return next({ ctx: { ...ctx, tenantId } })
    }

    // Extract outletId from input if provided
    const rawInput = await getRawInput()
    const outletId = outletIdExtractor ? outletIdExtractor(rawInput) : undefined

    // Check permission via RBAC
    const hasPermission = await userHasPermission(
      ctx.userId,
      tenantId,
      permissionKey,
      outletId,
    )

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permissionKey}`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        tenantId,
      },
    })
  })
}

/**
 * Outlet-scoped procedure - requires user to have access to the specified outlet
 */
export const outletScopedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  const tenantId = ctx.session.tenantId
  if (!tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No tenant associated with this account',
    })
  }

  return next({
    ctx: {
      ...ctx,
      tenantId,
    },
  })
})
