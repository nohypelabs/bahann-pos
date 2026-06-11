export interface AdminRepository {
  getTenantOutletIds(ownerId: string): Promise<string[]>;
  getTenantUserIds(outletIds: string[], ownerId: string): Promise<string[]>;
  getTenantProductIds(ownerId: string): Promise<string[]>;
  getTenantTransactionIds(outletIds: string[]): Promise<string[]>;
  deleteAuditLogs(userIds: string[]): Promise<number>;
  deleteStockAlerts(outletIds: string[]): Promise<number>;
  deleteCashSessions(outletIds: string[]): Promise<number>;
  deleteTransactionItems(txIds: string[]): Promise<number>;
  deleteTransactions(outletIds: string[]): Promise<number>;
  deleteDailySales(outletIds: string[]): Promise<number>;
  deleteDailyStock(outletIds: string[]): Promise<number>;
  deletePromotions(ownerId: string): Promise<number>;
  deleteProducts(ownerId: string): Promise<number>;
  deleteOutlets(ownerId: string): Promise<number>;
}
