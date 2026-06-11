export interface StockAlert {
  id: string;
  product_id: string;
  outlet_id: string;
  alert_type: string;
  current_stock: number;
  reorder_point: number;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface StockAlertWithJoins extends StockAlert {
  product: { id: string; name: string; sku: string; category: string | null } | null;
  outlet: { id: string; name: string; address: string | null } | null;
  acknowledged_by_user?: { id: string; name: string } | null;
}

export interface AlertSummary {
  total: number;
  outOfStock: number;
  lowStock: number;
  reorderSuggested: number;
}

export interface StockAlertFilters {
  outletId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface StockData {
  product_id: string;
  outlet_id: string;
  current_stock: number;
  reorder_point: number;
}

export interface StockAlertRepository {
  findActiveByOutletIds(outletIds: string[], outletId?: string): Promise<StockAlertWithJoins[]>;
  acknowledge(id: string, userId: string): Promise<void>;
  acknowledgeByProduct(productId: string, outletIds: string[], outletId?: string): Promise<void>;
  findByOutletIds(outletIds: string[], filters?: StockAlertFilters): Promise<{ alerts: StockAlertWithJoins[]; total: number }>;
  getSummaryByOutletIds(outletIds: string[], outletId?: string): Promise<AlertSummary>;
  insertAlerts(alerts: StockData[]): Promise<void>;
  findExistingUnacknowledgedKeys(): Promise<Set<string>>;
  getLatestStockForOutlets(outletIds: string[]): Promise<StockData[]>;
  updateReorderSettings(productId: string, updates: { reorderPoint?: number; reorderQuantity?: number; leadTimeDays?: number }): Promise<void>;
  getProductOwnerId(productId: string): Promise<string | null>;
}
