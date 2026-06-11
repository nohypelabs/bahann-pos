export interface GlobalStats {
  totalTenants: number;
  totalUsers: number;
  totalOutlets: number;
  totalProducts: number;
  suspendedTenants: number;
  totalRevenue: number;
  newTenantsThisMonth: number;
  totalTransactions: number;
  planDistribution: Record<string, number>;
}

export interface TenantListParams {
  search?: string;
  plan?: string;
  suspended?: boolean;
  limit: number;
  offset: number;
}

export interface TenantSummary {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_trial: boolean;
  is_suspended: boolean;
  created_at: string;
  email_verified_at: string | null;
  outletCount: number;
  userCount: number;
}

export interface TenantDetail {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_trial: boolean;
  is_suspended: boolean;
  created_at: string;
  email_verified_at: string | null;
  whatsapp_number: string | null;
  outlets: TenantOutlet[];
  users: TenantUser[];
  stats: TenantStats;
  billing: BillingEntry[];
}

export interface TenantOutlet {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface TenantStats {
  transactionCount: number;
  totalRevenue: number;
  productCount: number;
  outletCount: number;
  userCount: number;
}

export interface BillingEntry {
  id: string;
  plan: string;
  previous_plan: string | null;
  amount: number;
  note: string | null;
  is_trial: boolean;
  created_at: string;
}

export interface GrowthEntry {
  date: string;
  newTenants: number;
  totalTenants: number;
}

export interface PlatformRepository {
  getGlobalStats(): Promise<GlobalStats>;
  listTenants(params: TenantListParams): Promise<{ tenants: TenantSummary[]; total: number }>;
  getTenantDetail(tenantId: string): Promise<TenantDetail>;
  suspendTenant(tenantId: string, suspend: boolean): Promise<void>;
  getGrowthChart(days: number): Promise<GrowthEntry[]>;
  getSettings(): Promise<Record<string, string>>;
  updateSettings(entries: Array<{ key: string; value: string; updatedBy: string }>): Promise<void>;
  uploadQris(base64: string, fileName: string, userId: string): Promise<string>;
}
