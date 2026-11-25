import {
  UserManagementRepository, UserRecord, BillingRecord,
  UserPermissions,
} from '@/domain/repositories/UserManagementRepository';
import { OutletRepository } from '@/domain/repositories/OutletRepository';

export class UserManagementUseCase {
  constructor(
    private readonly userRepo: UserManagementRepository,
    private readonly outletRepo: OutletRepository,
  ) {}

  async getById(id: string, tenantId: string, requesterId: string, requesterRole?: string): Promise<UserRecord> {
    if (id !== requesterId && requesterRole !== 'admin' && requesterRole !== 'super_admin') {
      throw new Error('You can only view your own profile');
    }
    const user = await this.userRepo.findInTenant(id, tenantId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async getMyPermissions(userId: string): Promise<{ permissions: Record<string, unknown>; role: string }> {
    return this.userRepo.getPermissions(userId);
  }

  async updatePermissions(userId: string, tenantId: string, permissions: UserPermissions): Promise<{ before: Record<string, unknown>; after: Record<string, unknown> }> {
    const currentUser = await this.userRepo.findInTenant(userId, tenantId);
    if (!currentUser) throw new Error('User not found');
    const currentPermissions = currentUser.permissions ?? {};
    const updatedPermissions = { ...currentPermissions, ...permissions };
    await this.userRepo.updatePermissions(userId, tenantId, updatedPermissions);
    return { before: currentPermissions, after: updatedPermissions };
  }

  async listAllAdmins(): Promise<UserRecord[]> {
    return this.userRepo.listAdmins();
  }

  async updatePlan(
    userId: string,
    plan: string,
    amount: number,
    note: string | undefined,
    changedBy: string,
  ): Promise<{ before: { plan: string; email: string; name: string }; after: { plan: string } }> {
    const before = await this.userRepo.findById(userId);
    if (!before) throw new Error('User not found');

    await this.userRepo.updatePlan(userId, plan);
    await this.userRepo.insertBillingRecord({
      userId,
      plan,
      previousPlan: before.plan ?? 'free',
      amount,
      note,
      isTrial: false,
      changedBy,
    });

    return {
      before: { plan: before.plan ?? 'free', email: before.email, name: before.name },
      after: { plan },
    };
  }

  async getBillingHistory(userId: string): Promise<BillingRecord[]> {
    return this.userRepo.getBillingHistory(userId);
  }

  async checkPermission(userId: string, permission: string, role?: string): Promise<boolean> {
    if (role === 'admin' || role === 'super_admin') return true;
    try {
      const data = await this.userRepo.getPermissions(userId);
      return !!data.permissions[permission];
    } catch {
      return false;
    }
  }
}
