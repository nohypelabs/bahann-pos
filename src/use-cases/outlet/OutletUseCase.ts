import { OutletRepository, OutletRecord, OutletListParams } from '@/domain/repositories/OutletRepository';
import { getLimits, isUnlimited } from '@/lib/plans';

export class OutletUseCase {
  constructor(private readonly outletRepo: OutletRepository) {}

  async listByOwner(ownerId: string, params?: OutletListParams): Promise<{ outlets: OutletRecord[]; total: number }> {
    return this.outletRepo.findByOwnerId(ownerId, params);
  }

  async getById(id: string, ownerId: string | null): Promise<OutletRecord> {
    if (ownerId) {
      const outlet = await this.outletRepo.findByIdAndOwner(id, ownerId);
      if (!outlet) throw new Error('Outlet tidak ditemukan');
      return outlet;
    }
    const outlet = await this.outletRepo.findById(id);
    if (!outlet) throw new Error('Outlet tidak ditemukan');
    return outlet;
  }

  async create(name: string, ownerId: string, userPlan: string): Promise<OutletRecord> {
    const limits = getLimits(userPlan);
    if (!isUnlimited(limits.maxOutlets)) {
      const count = await this.outletRepo.countByOwnerId(ownerId);
      if (count >= limits.maxOutlets) {
        throw new Error(`Plan kamu hanya mendukung ${limits.maxOutlets} outlet. Upgrade untuk menambah lebih banyak.`);
      }
    }
    return this.outletRepo.create({ name, ownerId });
  }

  async update(id: string, name: string, ownerId: string): Promise<OutletRecord> {
    await this.assertOwnership(id, ownerId);
    return this.outletRepo.update(id, { name });
  }

  async delete(id: string, ownerId: string): Promise<OutletRecord> {
    await this.assertOwnership(id, ownerId);
    const outlet = await this.outletRepo.findById(id);
    await this.outletRepo.delete(id);
    if (!outlet) throw new Error('Outlet tidak ditemukan');
    return outlet;
  }

  private async assertOwnership(outletId: string, ownerId: string): Promise<void> {
    const outlet = await this.outletRepo.findByIdAndOwner(outletId, ownerId);
    if (!outlet) {
      throw new Error('Access denied: resource belongs to a different tenant');
    }
  }
}
