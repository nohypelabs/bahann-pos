import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped context for authenticated requests.
 *
 * Two things need to know who is *really* acting, but neither has access to the
 * tRPC context:
 *
 *  1. Audit attribution — `audit_logs.tenant_id` is NOT NULL and `createAuditLog`
 *     had no way to know the tenant, so every insert failed silently and the whole
 *     audit trail stayed empty. It also needs the real actor while a superadmin is
 *     impersonating, and `audit_logs` is immutable (038_audit_inventory_hardening)
 *     so the value must be right at insert time.
 *
 *  2. Outlet scope — the tenant principal being impersonated may have no
 *     `user_role_assignments` rows (legacy admin accounts often do not), which
 *     would make the application look empty. Acting as the tenant admin means
 *     tenant-wide scope.
 *
 * The tRPC layer runs the resolver inside this context so neither concern needs an
 * extra argument threaded through ~48 call sites.
 */
export interface RequestAuditContext {
  /** Tenant the request acts within. Null for platform events without one. */
  tenantId: string | null;
  /** The real actor: the session user, or the superadmin while impersonating. */
  actorUserId: string;
  /** Set only while a superadmin is impersonating a tenant. */
  impersonationId: string | null;
}

const storage = new AsyncLocalStorage<RequestAuditContext>();

export function runWithRequestContext<T>(context: RequestAuditContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestAuditContext | undefined {
  return storage.getStore();
}
