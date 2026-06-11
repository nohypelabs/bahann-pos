import {
  UserManagementRepository, UserRecord, BillingRecord,
  UserPermissions,
} from '@/domain/repositories/UserManagementRepository';
import { OutletRepository } from '@/domain/repositories/OutletRepository';
import { getLimits, isUnlimited } from '@/lib/plans';
import bcrypt from 'bcryptjs';

export class UserManagementUseCase {
  constructor(
    private readonly userRepo: UserManagementRepository,
    private readonly outletRepo: OutletRepository,
  ) {}

  async listByTenant(ownerId: string): Promise<UserRecord[]> {
    const outletIds = await this.outletRepo.findIdsByOwnerId(ownerId);
    return this.userRepo.findByOutletIds(outletIds, ownerId);
  }

  async getById(id: string, requesterId: string, requesterRole?: string): Promise<UserRecord> {
    if (id !== requesterId && requesterRole !== 'admin' && requesterRole !== 'super_admin') {
      throw new Error('You can only view your own profile');
    }
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async getMyPermissions(userId: string): Promise<{ permissions: Record<string, unknown>; role: string }> {
    return this.userRepo.getPermissions(userId);
  }

  async createCashier(
    ownerId: string,
    input: { name: string; email: string; password: string; whatsappNumber: string; outletId: string },
    userPlan: string,
  ): Promise<UserRecord> {
    const limits = getLimits(userPlan);
    if (!isUnlimited(limits.maxCashiers)) {
      const outletIds = await this.outletRepo.findIdsByOwnerId(ownerId);
      const count = await this.userRepo.countByRoleAndOutletIds('user', outletIds);
      if (count >= limits.maxCashiers) {
        throw new Error(`Plan kamu hanya mendukung ${limits.maxCashiers} kasir. Upgrade untuk menambah lebih banyak.`);
      }
    }

    const outlet = await this.outletRepo.findByIdAndOwner(input.outletId, ownerId);
    if (!outlet) throw new Error('Outlet tidak ditemukan atau bukan milik Anda');

    if (await this.userRepo.emailExists(input.email)) {
      throw new Error('Email sudah digunakan');
    }

    const passwordHash = await bcrypt.hash(input.password, 8);
    return this.userRepo.createCashier({
      email: input.email,
      name: input.name,
      passwordHash,
      whatsappNumber: input.whatsappNumber,
      outletId: input.outletId,
    });
  }

  async updatePermissions(userId: string, permissions: UserPermissions): Promise<{ before: Record<string, unknown>; after: Record<string, unknown> }> {
    const currentUser = await this.userRepo.findById(userId);
    const currentPermissions = currentUser?.permissions ?? {};
    const updatedPermissions = { ...currentPermissions, ...permissions };
    await this.userRepo.updatePermissions(userId, updatedPermissions);
    return { before: currentPermissions, after: updatedPermissions };
  }

  async updateRole(userId: string, role: string): Promise<{ before: string; after: string }> {
    const currentUser = await this.userRepo.findById(userId);
    await this.userRepo.updateRole(userId, role);
    return { before: currentUser?.role ?? '', after: role };
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
