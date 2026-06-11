export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  uniqueUsersCount: number;
}

export interface AuditFilterOptions {
  actions: string[];
  entityTypes: string[];
  users: Array<{ user_id: string; user_email: string }>;
}

export interface AuditRepository {
  findByUserIds(userIds: string[], filters?: AuditFilters): Promise<{ logs: AuditLogEntry[]; total: number }>;
  findById(id: string): Promise<AuditLogEntry | null>;
  getStatsByUserIds(userIds: string[], filters?: { dateFrom?: string; dateTo?: string }): Promise<AuditStats>;
  getFilterOptionsByUserIds(userIds: string[]): Promise<AuditFilterOptions>;
}
