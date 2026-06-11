export interface SalesSummary {
  totalRevenue: number;
  transactionCount: number;
  totalItemsSold: number;
}

export interface SalesTrendRow {
  saleDate: string;
  revenue: number;
  itemsSold: number;
}

export interface TopProductRow {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  productSku: string;
  productCategory: string | null;
  outletId: string;
  outletName: string;
  currentStock: number;
  date: string;
}

export interface RecentTransaction {
  id: string;
  transactionId: string;
  productName: string;
  productSku: string;
  outletName: string;
  cashierName: string;
  date: string;
  quantity: number;
  revenue: number;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface DashboardRepository {
  getSalesSummary(outletIds: string[], startDate: string, endDate: string): Promise<SalesSummary>;
  getSalesTrend(outletIds: string[], startDate: string, endDate: string): Promise<SalesTrendRow[]>;
  getTopProducts(outletIds: string[], startDate: string, endDate: string, limit: number): Promise<TopProductRow[]>;
  getLowStock(outletIds: string[], threshold: number): Promise<LowStockItem[]>;
  getRecentTransactions(outletIds: string[], limit: number): Promise<RecentTransaction[]>;
  getProductCount(ownerId: string): Promise<number>;
  getOutletCount(ownerId: string): Promise<number>;
}
