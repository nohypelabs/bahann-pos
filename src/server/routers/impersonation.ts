import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog, extractRequestMetadata } from '@/lib/audit'
import {
  setImpersonationCookie,
  deleteImpersonationCookie,
} from '@/lib/impersonation/sessionCookie'

/**
 * Superadmin impersonation ("masuk sebagai tenant").
 *
 * The superadmin's own access token is never replaced — it stays the immutable
 * root identity — and an impersonation session is applied as a reversible
 * overlay. Removing the cookie returns the operator to their own account, so a
 * session can always be left and the token refresh flow needs no special case.
 */
export const impersonationRouter = router({
  /**
   * Enter one tenant's context as its admin.
   *
   * Only a platform superadmin can reach this, and never while already
   * impersonating — superAdminProcedure refuses impersonated sessions, which
   * also makes nested impersonation impossible.
   */
  start: superAdminProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        reason: z.string().trim().min(3).max(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const requestMeta = extractRequestMetadata(ctx.req.headers)

      const { session, target } = await container.startImpersonationUseCase().execute({
        impersonatorId: ctx.userId,
        tenantId: input.tenantId,
        reason: input.reason,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      })

      await setImpersonationCookie(session.id, new Date(session.expiresAt))

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session.email,
        actorUserId: ctx.userId,
        impersonationId: session.id,
        // Filed under the target tenant so the tenant's own audit view shows that
        // platform support entered its data.
        tenantId: target.tenantId,
        action: 'IMPERSONATE_START',
        entityType: 'impersonation',
        entityId: session.id,
        metadata: {
          tenantId: target.tenantId,
          tenantName: target.tenantName,
          targetUserId: target.userId,
          targetEmail: target.userEmail,
          reason: input.reason,
          expiresAt: session.expiresAt,
        },
        ...requestMeta,
      })

      return {
        success: true,
        tenantName: target.tenantName,
        targetName: target.userName,
        targetEmail: target.userEmail,
        expiresAt: session.expiresAt,
      }
    }),

  /**
   * Current impersonation state, used by the persistent banner. Reads the session
   * projection only — no extra query.
   */
  current: protectedProcedure.query(({ ctx }) => {
    const { impersonating, impersonationId, impersonationReason, impersonationExpiresAt, impersonationTenantName } =
      ctx.session

    if (!impersonating || !impersonationId) {
      return { impersonating: false as const }
    }

    return {
      impersonating: true as const,
      sessionId: impersonationId,
      tenantName: impersonationTenantName ?? 'Unknown',
      targetName: ctx.session.name,
      reason: impersonationReason ?? '',
      expiresAt: impersonationExpiresAt ?? null,
    }
  }),

  /**
   * Leave the impersonated tenant and return to the superadmin identity.
   *
   * Deliberately a protectedProcedure: superAdminProcedure is closed while
   * impersonating. The session id is taken from the already-validated session
   * projection, so a caller can only end a session the projection confirmed is
   * their own — the cookie value is never trusted directly.
   */
  end: protectedProcedure.mutation(async ({ ctx }) => {
    const { impersonationId, impersonatorId, impersonatorEmail, tenantId } = ctx.session
    const requestMeta = extractRequestMetadata(ctx.req.headers)

    if (!impersonationId || !impersonatorId) {
      // Not impersonating, or the session already expired: clear any leftover
      // cookie and succeed so the exit control always works.
      await deleteImpersonationCookie()
      return { success: true, impersonated: false }
    }

    await container.endImpersonationUseCase().execute({
      sessionId: impersonationId,
      endedBy: impersonatorId,
      endReason: 'exited_by_user',
    })

    await deleteImpersonationCookie()

    await createAuditLog({
      userId: impersonatorId,
      userEmail: impersonatorEmail ?? 'unknown',
      actorUserId: impersonatorId,
      impersonationId,
      tenantId: tenantId ?? null,
      action: 'IMPERSONATE_END',
      entityType: 'impersonation',
      entityId: impersonationId,
      metadata: {
        tenantId,
        targetUserId: ctx.userId,
        endReason: 'exited_by_user',
      },
      ...requestMeta,
    })

    return { success: true, impersonated: true }
  }),

  /**
   * Impersonation history for the platform view: who entered which tenant, why,
   * when, for how long, and how many actions they performed.
   */
  history: superAdminProcedure
    .input(
      z
        .object({
          tenantId: z.string().uuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return container.listImpersonationHistoryUseCase().execute({
        tenantId: input?.tenantId,
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      })
    }),
})
