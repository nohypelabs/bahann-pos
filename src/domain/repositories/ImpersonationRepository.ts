/**
 * Superadmin impersonation ("masuk sebagai tenant").
 *
 * A platform superadmin enters one tenant's context to support it. The
 * superadmin's own access token is never replaced — it stays the immutable root
 * identity — and an impersonation session row is applied as a reversible
 * projection on top of it.
 */

/** A tenant principal that a superadmin can act as. */
export interface TenantAdminTarget {
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  outletId: string | null;
}

/**
 * Everything needed to project a request as the impersonated tenant admin.
 * Resolved from the database on every request so a stale or tampered cookie
 * cannot widen access.
 */
export interface ActiveImpersonation {
  id: string;
  impersonatorId: string;
  tenantId: string;
  tenantName: string;
  targetUserId: string;
  targetUserName: string;
  targetUserEmail: string;
  targetOutletId: string | null;
  reason: string;
  expiresAt: string;
}

export interface ImpersonationSessionRow {
  id: string;
  impersonatorId: string;
  tenantId: string;
  targetUserId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  endReason: string | null;
}

/** A history row enriched with names, for the platform audit view. */
export interface ImpersonationHistoryEntry extends ImpersonationSessionRow {
  tenantName: string;
  impersonatorName: string;
  impersonatorEmail: string;
  targetUserName: string;
  targetUserEmail: string;
  /** How many audited actions were performed inside this session. */
  actionCount: number;
}

export interface StartImpersonationInput {
  impersonatorId: string;
  tenantId: string;
  reason: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListImpersonationParams {
  tenantId?: string;
  limit: number;
  offset: number;
}

export interface ImpersonationRepository {
  /**
   * Resolve the principal to act as for a tenant: its owner when that user is
   * still active, otherwise any active admin of the tenant. Returns null when
   * the tenant has no usable principal (impersonation is then refused rather
   * than silently doing nothing).
   */
  findTenantAdmin(tenantId: string): Promise<TenantAdminTarget | null>;

  /** The superadmin's currently open and unexpired session, if any. */
  findActiveByImpersonator(impersonatorId: string, now: string): Promise<ImpersonationSessionRow | null>;

  /** Look up a session by id for request projection (open and unexpired only). */
  findActiveContextById(id: string, now: string): Promise<ActiveImpersonation | null>;

  findById(id: string): Promise<ImpersonationSessionRow | null>;

  create(input: StartImpersonationInput & { targetUserId: string }): Promise<ImpersonationSessionRow>;

  /** Close a session. No-op when it is already closed. */
  end(id: string, endedBy: string, endReason?: string): Promise<void>;

  /** Close every open session for a superadmin (used on logout). */
  endAllForImpersonator(impersonatorId: string, endedBy: string, endReason?: string): Promise<number>;

  listHistory(params: ListImpersonationParams): Promise<{ sessions: ImpersonationHistoryEntry[]; total: number }>;
}
