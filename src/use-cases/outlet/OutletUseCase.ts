import { OutletRepository, OutletRecord, OutletListParams } from '@/domain/repositories/OutletRepository';
import { getLimits, isUnlimited } from '@/lib/plans';

export class OutletUseCase {
  constructor(private readonly outletRepo: OutletRepository) {}

  async listByOwner(tenantId: string, params?: OutletListParams): Promise<{ outlets: OutletRecord[]; total: number }> {
    return this.outletRepo.findByOwnerId(tenantId, params);
  }

  async getById(id: string, tenantId: string | null): Promise<OutletRecord> {
    if (tenantId) {
      const outlet = await this.outletRepo.findByIdAndOwner(id, tenantId);
      if (!outlet) throw new Error('Outlet tidak ditemukan');
      return outlet;
    }
    const outlet = await this.outletRepo.findById(id);
    if (!outlet) throw new Error('Outlet tidak ditemukan');
    return outlet;
  }

  async create(name: string, ownerId: string, tenantId: string, userPlan: string): Promise<OutletRecord> {
    const limits = getLimits(userPlan);
    if (!isUnlimited(limits.maxOutlets)) {
      const count = await this.outletRepo.countByOwnerId(tenantId);
      if (count >= limits.maxOutlets) {
        throw new Error(`Plan kamu hanya mendukung ${limits.maxOutlets} outlet. Upgrade untuk menambah lebih banyak.`);
      }
    }
    return this.outletRepo.create({ name, ownerId, tenantId });
  }

  async update(id: string, name: string, tenantId: string): Promise<OutletRecord> {
    await this.assertOwnership(id, tenantId);
    return this.outletRepo.update(id, { name });
  }

  async delete(id: string, tenantId: string): Promise<OutletRecord> {
    await this.assertOwnership(id, tenantId);
    const outlet = await this.outletRepo.findById(id);
    await this.outletRepo.delete(id);
    if (!outlet) throw new Error('Outlet tidak ditemukan');
    return outlet;
  }

  private async assertOwnership(outletId: string, tenantId: string): Promise<void> {
    const outlet = await this.outletRepo.findByIdAndOwner(outletId, tenantId);
    if (!outlet) {
      throw new Error('Access denied: resource belongs to a different tenant');
    }
  }
}
