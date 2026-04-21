import { initTRPC, TRPCError } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { verifyJWT, JWTPayload } from '@/lib/jwt'
import { getRedisClient } from '@/lib/redis-upstash'
import { parseAuthCookieFromHeader } from '@/lib/cookies'
import { logger } from '@/lib/logger'

/**
 * Session data interface
 */
export interface SessionData extends JWTPayload {
  userId: string
  email: string
  name: string
  role?: string
  outletId?: string
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
          const sessionData = await redis.get(`session:${userId}`)
          if (sessionData) {
            session = JSON.parse(sessionData)
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
        }
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
 * Admin procedure - requires authentication AND admin role
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  // Check if user has admin role (super_admin inherits all admin rights)
  if (ctx.session.role !== 'admin' && ctx.session.role !== 'super_admin') {
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
 * Super admin procedure - requires authentication AND super_admin role.
 * Super admin is the platform operator (not a tenant/warung owner).
 * Set via: node scripts/set-super-admin.js
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
 * Create a middleware that checks for specific permission
 * @param permission - The permission key to check (e.g., 'canVoidTransactions')
 */
export const requirePermission = (permission: string) => {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      })
    }

    // Admins and super_admin have all permissions
    if (ctx.session.role === 'admin' || ctx.session.role === 'super_admin') {
      return next()
    }

    // Check if user has the specific permission
    const { data: user } = await (await import('@/infra/supabase/client')).supabase
      .from('users')
      .select('permissions')
      .eq('id', ctx.userId)
      .single()

    const permissions = user?.permissions || {}

    if (!permissions[permission]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission}`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        permissions,
      },
    })
  })
}
