import { AdminRepository } from '@/domain/repositories/AdminRepository';

interface ResetAllDataOptions {
  keepOutlets: boolean;
  keepUsers: boolean;
}

export class ResetAllDataUseCase {
  constructor(private readonly adminRepo: AdminRepository) {}

  async execute(ownerId: string, options: ResetAllDataOptions): Promise<Record<string, number>> {
    const outletIds = await this.adminRepo.getTenantOutletIds(ownerId);
    const userIds = await this.adminRepo.getTenantUserIds(outletIds, ownerId);

    const counts: Record<string, number> = {};

    if (userIds.length > 0) {
      counts.auditLogs = await this.adminRepo.deleteAuditLogs(userIds);
    }

    if (outletIds.length > 0) {
      counts.stockAlerts = await this.adminRepo.deleteStockAlerts(outletIds);
      counts.cashSessions = await this.adminRepo.deleteCashSessions(outletIds);

      const txIds = await this.adminRepo.getTenantTransactionIds(outletIds);
      if (txIds.length > 0) {
        counts.transactionItems = await this.adminRepo.deleteTransactionItems(txIds);
      }

      counts.transactions = await this.adminRepo.deleteTransactions(outletIds);
      counts.dailySales = await this.adminRepo.deleteDailySales(outletIds);
      counts.dailyStock = await this.adminRepo.deleteDailyStock(outletIds);
    }

    counts.promotions = await this.adminRepo.deletePromotions(ownerId);

    const productIds = await this.adminRepo.getTenantProductIds(ownerId);
    if (productIds.length > 0) {
      counts.products = await this.adminRepo.deleteProducts(ownerId);
    }

    if (!options.keepOutlets && outletIds.length > 0) {
      counts.outlets = await this.adminRepo.deleteOutlets(ownerId);
    }

    return counts;
  }
}
