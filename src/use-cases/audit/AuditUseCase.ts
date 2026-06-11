import { AuditRepository, AuditLogEntry, AuditFilters, AuditStats, AuditFilterOptions } from '@/domain/repositories/AuditRepository';
import { OutletRepository } from '@/domain/repositories/OutletRepository';
import { supabaseAdmin } from '@/infra/supabase/server';

export class AuditUseCase {
  constructor(
    private readonly auditRepo: AuditRepository,
    private readonly outletRepo: OutletRepository,
  ) {}

  async getTenantUserIds(userId: string, role: string | undefined, outletId: string | undefined): Promise<string[]> {
    const ownerId = await this.getTenantOwnerId(userId, role, outletId);
    if (!ownerId) return [];
    const outletIds = await this.outletRepo.findIdsByOwnerId(ownerId);
    const { data: users } = await supabaseAdmin.from('users').select('id').in('outlet_id', outletIds);
    const userIds = users?.map(u => u.id) ?? [];
    if (!userIds.includes(ownerId)) userIds.push(ownerId);
    return userIds;
  }

  async getLogs(tenantUserIds: string[], filters?: AuditFilters): Promise<{ logs: AuditLogEntry[]; total: number }> {
    if (tenantUserIds.length === 0) return { logs: [], total: 0 };
    return this.auditRepo.findByUserIds(tenantUserIds, filters);
  }

  async getById(id: string, tenantUserIds: string[]): Promise<AuditLogEntry> {
    const log = await this.auditRepo.findById(id);
    if (!log || !tenantUserIds.includes(log.user_id)) throw new Error('Audit log not found');
    return log;
  }

  async getStats(tenantUserIds: string[], filters?: { dateFrom?: string; dateTo?: string }): Promise<AuditStats> {
    if (tenantUserIds.length === 0) {
      return { totalLogs: 0, byAction: {}, byEntityType: {}, uniqueUsersCount: 0 };
    }
    return this.auditRepo.getStatsByUserIds(tenantUserIds, filters);
  }

  async getFilterOptions(tenantUserIds: string[]): Promise<AuditFilterOptions> {
    if (tenantUserIds.length === 0) {
      return { actions: [], entityTypes: [], users: [] };
    }
    return this.auditRepo.getFilterOptionsByUserIds(tenantUserIds);
  }

  private async getTenantOwnerId(userId: string, role: string | undefined, outletId: string | undefined): Promise<string | null> {
    if (role === 'admin' || role === 'super_admin') return userId;
    if (outletId) {
      const { data } = await supabaseAdmin.from('outlets').select('owner_id').eq('id', outletId).single();
      return data?.owner_id ?? null;
    }
    const { data } = await supabaseAdmin.from('outlets').select('id').eq('owner_id', userId).limit(1);
    return data && data.length > 0 ? userId : null;
  }
}
