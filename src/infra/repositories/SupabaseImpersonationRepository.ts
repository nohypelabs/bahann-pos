import { supabaseAdmin as supabase } from '../supabase/server';
import type {
  ActiveImpersonation,
  ImpersonationHistoryEntry,
  ImpersonationRepository,
  ImpersonationSessionRow,
  ListImpersonationParams,
  StartImpersonationInput,
  TenantAdminTarget,
} from '@/domain/repositories/ImpersonationRepository';

interface RawSessionRow {
  id: string;
  impersonator_id: string;
  tenant_id: string;
  target_user_id: string;
  reason: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  end_reason: string | null;
}

interface RawContextRow extends RawSessionRow {
  target: { id: string; name: string; email: string; outlet_id: string | null; is_suspended: boolean } | null;
  tenant: { name: string } | null;
}

interface RawHistoryRow extends RawSessionRow {
  tenant: { name: string } | null;
  impersonator: { name: string; email: string } | null;
  target: { name: string; email: string } | null;
}

function toSessionRow(row: RawSessionRow): ImpersonationSessionRow {
  return {
    id: row.id,
    impersonatorId: row.impersonator_id,
    tenantId: row.tenant_id,
    targetUserId: row.target_user_id,
    reason: row.reason,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    endedAt: row.ended_at,
    endReason: row.end_reason,
  };
}

export class SupabaseImpersonationRepository implements ImpersonationRepository {
  async findTenantAdmin(tenantId: string): Promise<TenantAdminTarget | null> {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, owner_user_id')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError) throw new Error(tenantError.message);
    if (!tenant) return null;

    const { data: candidates, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, outlet_id')
      .eq('tenant_id', tenantId)
      .eq('is_suspended', false)
      // A tenant owner may also be the platform superadmin (the self-registered
      // owner model), so both roles are valid principals to act as.
      .in('role', ['admin', 'super_admin']);

    if (userError) throw new Error(userError.message);
    if (!candidates || candidates.length === 0) return null;

    const ownerId = (tenant as { owner_user_id: string | null }).owner_user_id;
    const chosen = candidates.find((c) => c.id === ownerId) ?? candidates[0];

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      userId: chosen.id,
      userName: chosen.name,
      userEmail: chosen.email,
      userRole: chosen.role,
      outletId: chosen.outlet_id ?? null,
    };
  }

  async findActiveByImpersonator(impersonatorId: string, now: string): Promise<ImpersonationSessionRow | null> {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .select('id, impersonator_id, tenant_id, target_user_id, reason, started_at, expires_at, ended_at, end_reason')
      .eq('impersonator_id', impersonatorId)
      .is('ended_at', null)
      .gt('expires_at', now)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toSessionRow(data as RawSessionRow) : null;
  }

  async findActiveContextById(id: string, now: string): Promise<ActiveImpersonation | null> {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .select(`
        id,
        impersonator_id,
        tenant_id,
        target_user_id,
        reason,
        started_at,
        expires_at,
        ended_at,
        end_reason,
        target:users!impersonation_sessions_target_user_id_fkey(id, name, email, outlet_id, is_suspended),
        tenant:tenants!impersonation_sessions_tenant_id_fkey(name)
      `)
      .eq('id', id)
      .is('ended_at', null)
      .gt('expires_at', now)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as unknown as RawContextRow;
    // A deactivated or deleted target revokes the borrowed access immediately.
    if (!row.target || row.target.is_suspended) return null;

    return {
      id: row.id,
      impersonatorId: row.impersonator_id,
      tenantId: row.tenant_id,
      tenantName: row.tenant?.name ?? 'Unknown',
      targetUserId: row.target.id,
      targetUserName: row.target.name,
      targetUserEmail: row.target.email,
      targetOutletId: row.target.outlet_id ?? null,
      reason: row.reason,
      expiresAt: row.expires_at,
    };
  }

  async findById(id: string): Promise<ImpersonationSessionRow | null> {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .select('id, impersonator_id, tenant_id, target_user_id, reason, started_at, expires_at, ended_at, end_reason')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? toSessionRow(data as RawSessionRow) : null;
  }

  async create(input: StartImpersonationInput & { targetUserId: string }): Promise<ImpersonationSessionRow> {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .insert({
        impersonator_id: input.impersonatorId,
        tenant_id: input.tenantId,
        target_user_id: input.targetUserId,
        reason: input.reason,
        expires_at: input.expiresAt,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      })
      .select('id, impersonator_id, tenant_id, target_user_id, reason, started_at, expires_at, ended_at, end_reason')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create impersonation session: ${error?.message ?? 'no row returned'}`);
    }

    return toSessionRow(data as RawSessionRow);
  }

  async end(id: string, endedBy: string, endReason?: string): Promise<void> {
    const { error } = await supabase
      .from('impersonation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        ended_by: endedBy,
        end_reason: endReason ?? null,
      })
      .eq('id', id)
      .is('ended_at', null);

    if (error) throw new Error(error.message);
  }

  async endAllForImpersonator(impersonatorId: string, endedBy: string, endReason?: string): Promise<number> {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        ended_by: endedBy,
        end_reason: endReason ?? null,
      })
      .eq('impersonator_id', impersonatorId)
      .is('ended_at', null)
      .select('id');

    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async listHistory(params: ListImpersonationParams): Promise<{
    sessions: ImpersonationHistoryEntry[];
    total: number;
  }> {
    let query = supabase
      .from('impersonation_sessions')
      .select(
        `
        id,
        impersonator_id,
        tenant_id,
        target_user_id,
        reason,
        started_at,
        expires_at,
        ended_at,
        end_reason,
        tenant:tenants!impersonation_sessions_tenant_id_fkey(name),
        impersonator:users!impersonation_sessions_impersonator_id_fkey(name, email),
        target:users!impersonation_sessions_target_user_id_fkey(name, email)
      `,
        { count: 'exact' },
      )
      .order('started_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as RawHistoryRow[];
    const actionCounts = await this.countActionsBySession(rows.map((r) => r.id));

    return {
      sessions: rows.map((row) => ({
        ...toSessionRow(row),
        tenantName: row.tenant?.name ?? 'Unknown',
        impersonatorName: row.impersonator?.name ?? 'Unknown',
        impersonatorEmail: row.impersonator?.email ?? 'Unknown',
        targetUserName: row.target?.name ?? 'Unknown',
        targetUserEmail: row.target?.email ?? 'Unknown',
        actionCount: actionCounts[row.id] ?? 0,
      })),
      total: count ?? 0,
    };
  }

  /** How many audited actions were performed inside each session. */
  private async countActionsBySession(sessionIds: string[]): Promise<Record<string, number>> {
    if (sessionIds.length === 0) return {};

    const { data, error } = await supabase
      .from('audit_logs')
      .select('impersonation_id')
      .in('impersonation_id', sessionIds)
      // The start/end markers share the session id but are not actions performed
      // inside it, so they must not inflate the count.
      .not('action', 'in', '(IMPERSONATE_START,IMPERSONATE_END)');

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ impersonation_id: string | null }>) {
      if (!row.impersonation_id) continue;
      counts[row.impersonation_id] = (counts[row.impersonation_id] ?? 0) + 1;
    }
    return counts;
  }
}
