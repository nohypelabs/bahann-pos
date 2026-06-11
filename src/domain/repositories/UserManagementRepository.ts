export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  outlet_id: string | null;
  permissions: Record<string, unknown> | null;
  plan: string | null;
  created_at: string;
}

export interface BillingRecord {
  id: string;
  plan: string;
  previous_plan: string;
  amount: number;
  note: string | null;
  is_trial: boolean;
  created_at: string;
}

export interface UserPermissions {
  canVoidTransactions?: boolean;
  canGiveDiscount?: boolean;
  maxDiscountPercent?: number;
  canCloseDay?: boolean;
  canManageUsers?: boolean;
  canEditPrices?: boolean;
  canManagePromotions?: boolean;
  canViewReports?: boolean;
  canManageInventory?: boolean;
}

export interface UserManagementRepository {
  findByOutletIds(outletIds: string[], ownerId: string): Promise<UserRecord[]>;
  findById(id: string): Promise<UserRecord | null>;
  getPlan(userId: string): Promise<string>;
  countByRoleAndOutletIds(role: string, outletIds: string[]): Promise<number>;
  updatePermissions(userId: string, permissions: Record<string, unknown>): Promise<void>;
  getPermissions(userId: string): Promise<{ permissions: Record<string, unknown>; role: string }>;
  updateRole(userId: string, role: string): Promise<void>;
  listAdmins(): Promise<UserRecord[]>;
  updatePlan(userId: string, plan: string): Promise<void>;
  insertBillingRecord(data: {
    userId: string;
    plan: string;
    previousPlan: string;
    amount: number;
    note?: string;
    isTrial: boolean;
    changedBy: string;
  }): Promise<void>;
  getBillingHistory(userId: string): Promise<BillingRecord[]>;
  createCashier(data: {
    email: string;
    name: string;
    passwordHash: string;
    whatsappNumber: string;
    outletId: string;
  }): Promise<UserRecord>;
  emailExists(email: string): Promise<boolean>;
}
