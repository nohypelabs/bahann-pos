import {
  StockAlertRepository, StockAlertWithJoins,
  AlertSummary, StockAlertFilters, StockData,
} from '@/domain/repositories/StockAlertRepository';

export class StockAlertUseCase {
  constructor(private readonly alertRepo: StockAlertRepository) {}

  async getActive(tenantOutletIds: string[], outletId?: string): Promise<StockAlertWithJoins[]> {
    if (tenantOutletIds.length === 0) return [];
    return this.alertRepo.findActiveByOutletIds(tenantOutletIds, outletId);
  }

  async generate(tenantOutletIds: string[]): Promise<number> {
    if (tenantOutletIds.length === 0) return 0;

    const latestStock = await this.alertRepo.getLatestStockForOutlets(tenantOutletIds);
    const existingKeys = await this.alertRepo.findExistingUnacknowledgedKeys();

    const newAlerts: StockData[] = [];
    for (const stock of latestStock) {
      const key = `${stock.product_id}:${stock.outlet_id}`;
      if (existingKeys.has(key)) continue;
      if (stock.current_stock <= 0 || stock.current_stock <= stock.reorder_point) {
        newAlerts.push(stock);
      }
    }

    if (newAlerts.length > 0) {
      await this.alertRepo.insertAlerts(newAlerts);
    }

    return newAlerts.length;
  }

  async acknowledge(alertId: string, userId: string, tenantOutletIds: string[]): Promise<void> {
    const alerts = await this.alertRepo.findActiveByOutletIds(tenantOutletIds);
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    await this.alertRepo.acknowledge(alertId, userId);
  }

  async acknowledgeByProduct(productId: string, tenantOutletIds: string[], outletId?: string): Promise<void> {
    if (tenantOutletIds.length === 0) return;
    await this.alertRepo.acknowledgeByProduct(productId, tenantOutletIds, outletId);
  }

  async getHistory(tenantOutletIds: string[], filters?: StockAlertFilters): Promise<{ alerts: StockAlertWithJoins[]; total: number }> {
    if (tenantOutletIds.length === 0) return { alerts: [], total: 0 };
    return this.alertRepo.findByOutletIds(tenantOutletIds, filters);
  }

  async getSummary(tenantOutletIds: string[], outletId?: string): Promise<AlertSummary> {
    if (tenantOutletIds.length === 0) {
      return { total: 0, outOfStock: 0, lowStock: 0, reorderSuggested: 0 };
    }
    return this.alertRepo.getSummaryByOutletIds(tenantOutletIds, outletId);
  }

  async updateReorderSettings(
    productId: string,
    updates: { reorderPoint?: number; reorderQuantity?: number; leadTimeDays?: number },
    ownerId: string | null,
  ): Promise<void> {
    if (ownerId) {
      const productOwnerId = await this.alertRepo.getProductOwnerId(productId);
      if (!productOwnerId || productOwnerId !== ownerId) {
        throw new Error('Access denied');
      }
    }
    await this.alertRepo.updateReorderSettings(productId, updates);
  }
}
