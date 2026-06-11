import {
  AuditRepository, AuditLogEntry, AuditFilters,
  AuditStats, AuditFilterOptions,
} from '@/domain/repositories/AuditRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabaseAuditRepository implements AuditRepository {
  async findByUserIds(userIds: string[], filters?: AuditFilters): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'estimated' })
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.action) query = query.eq('action', filters.action);
    if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

    if (filters?.searchQuery) {
      query = query.or(
        `user_email.ilike.%${filters.searchQuery}%,entity_id.eq.${filters.searchQuery}`,
      );
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

    return { logs: (data as AuditLogEntry[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as AuditLogEntry;
  }

  async getStatsByUserIds(userIds: string[], filters?: { dateFrom?: string; dateTo?: string }): Promise<AuditStats> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('action, entity_type, user_id')
      .in('user_id', userIds);

    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch audit stats: ${error.message}`);

    const byAction: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    for (const log of data ?? []) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1;
      uniqueUsers.add(log.user_id);
    }

    return {
      totalLogs: data?.length ?? 0,
      byAction,
      byEntityType,
      uniqueUsersCount: uniqueUsers.size,
    };
  }

  async getFilterOptionsByUserIds(userIds: string[]): Promise<AuditFilterOptions> {
    const [{ data: actions }, { data: entityTypes }, { data: users }] = await Promise.all([
      supabaseAdmin.from('audit_logs').select('action').in('user_id', userIds).order('action'),
      supabaseAdmin.from('audit_logs').select('entity_type').in('user_id', userIds).order('entity_type'),
      supabaseAdmin.from('audit_logs').select('user_id, user_email').in('user_id', userIds).order('user_email'),
    ]);

    return {
      actions: [...new Set(actions?.map(a => a.action) ?? [])],
      entityTypes: [...new Set(entityTypes?.map(e => e.entity_type) ?? [])],
      users: (users as AuditFilterOptions['users']) ?? [],
    };
  }
}
