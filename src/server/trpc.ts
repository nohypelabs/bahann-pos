import { initTRPC, TRPCError } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { verifyJWT, JWTPayload } from '@/lib/jwt'
import { parseAuthCookieFromHeader } from '@/lib/cookies'
import { logger } from '@/lib/logger'
import { getTenantId, userHasPermission } from '@/server/lib/tenant'
import { appErrorToTrpcCode } from '@/server/lib/errors'
import { AppError } from '@/shared/exceptions/AppError'
import { parseImpersonationCookieFromHeader } from '@/lib/impersonation/sessionCookie'
import { runWithRequestContext } from '@/lib/impersonation/requestContext'
import { container } from '@/infra/container'

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
  /** True while a superadmin is acting as a tenant admin. */
  impersonating?: boolean
  /** The superadmin behind the session. Equals userId when not impersonating. */
  impersonatorId?: string
  /** Kept so audit entries written when exiting can name the real actor. */
  impersonatorEmail?: string
  impersonationId?: string
  impersonationReason?: string
  impersonationExpiresAt?: string
  /** Display name of the impersonated tenant, for the persistent banner. */
  impersonationTenantName?: string
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

      // The signed JWT is the single source of truth for session data.
      // No external session store is consulted here, so an unreachable cache
      // or session backend can never lock users out of the application.
      session = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        outletId: decoded.outletId,
        tenantId: decoded.tenantId,
      }

      // Older tokens may not carry a tenant; fall back to a database lookup.
      if (!session.tenantId) {
        session.tenantId = await getTenantId(decoded.userId) ?? undefined
      }

      // Superadmin impersonation ("masuk sebagai tenant").
      //
      // This is a reversible overlay on top of the JWT: the token keeps the
      // superadmin as the immutable root identity, so removing the cookie restores
      // them instantly and the refresh flow needs no special case. Every value
      // below comes from the database, never from the cookie.
      if (session.role === 'super_admin') {
        const impersonationId = parseImpersonationCookieFromHeader(cookieHeader)
        if (impersonationId) {
          try {
            const active = await container.impersonationRepo().findActiveContextById(
              impersonationId,
              new Date().toISOString(),
            )

            // Only the superadmin who opened the session may use it.
            if (active && active.impersonatorId === session.userId) {
              session.impersonating = true
              session.impersonatorId = session.userId
              session.impersonatorEmail = session.email
              session.impersonationId = active.id
              session.impersonationReason = active.reason
              session.impersonationExpiresAt = active.expiresAt
              session.impersonationTenantName = active.tenantName
              session.userId = active.targetUserId
              session.tenantId = active.tenantId
              session.outletId = active.targetOutletId ?? undefined
              session.name = active.targetUserName
              session.email = active.targetUserEmail
              // Act as the tenant admin. `superAdminProcedure` re-reads the role
              // from the database by userId, so it needs its own guard — a
              // tenant's owner may itself be the platform superadmin.
              session.role = 'admin'
              userId = active.targetUserId
            }
          } catch (error) {
            // Never let this lock the superadmin out: fall back to their own
            // identity and log it.
            logger.error('Failed to resolve impersonation session', { error, impersonationId })
          }
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

/**
 * Translates domain AppError into the matching TRPCError for every procedure.
 *
 * Use cases sit outside the tRPC layer and throw AppError, which tRPC would
 * otherwise report as INTERNAL_SERVER_ERROR (HTTP 500) — so an ordinary "wrong
 * password" surfaced as a server fault for clients and for Sentry. Mapping it once
 * here means no individual procedure can forget to do it.
 *
 * Anything that is not an AppError passes through untouched, so genuine bugs keep
 * being reported as internal errors.
 */
const mapDomainErrors = t.middleware(async ({ next }) => {
  const result = await next()

  if (!result.ok && result.error.cause instanceof AppError) {
    const appError = result.error.cause
    throw new TRPCError({
      code: appErrorToTrpcCode(appError.statusCode),
      message: appError.message,
      cause: appError,
    })
  }

  return result
})

/**
 * Publishes the request's audit context (tenant, real actor, impersonation) to
 * AsyncLocalStorage, so createAuditLog and getUserOutletIds can use it without
 * every call site threading it through. Applies to every authenticated request.
 */
const withRequestContext = t.middleware(({ ctx, next }) => {
  const { session } = ctx
  if (!session?.userId) return next()

  return runWithRequestContext(
    {
      tenantId: session.tenantId ?? null,
      actorUserId: session.impersonatorId ?? session.userId,
      impersonationId: session.impersonationId ?? null,
    },
    () => next(),
  )
})

export const publicProcedure = t.procedure.use(mapDomainErrors).use(withRequestContext)

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
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
export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
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
export const superAdminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' })
  }

  // Platform surfaces stay closed while acting as a tenant. This is not redundant
  // with the role lookup below: the owner of a tenant can itself be the platform
  // superadmin, so that lookup would still return 'super_admin' for such a session.
  if (ctx.session?.impersonating) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Not available while impersonating a tenant. Exit impersonation first.',
    })
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
export const outletScopedProcedure = publicProcedure.use(async ({ ctx, next }) => {
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
