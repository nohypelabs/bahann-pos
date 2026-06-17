export type DailyStock = {
  id: string;
  tenantId: string;
  productId: string;
  outletId: string;
  stockDate: Date;        // Stock date (e.g., 2025-09-01)
  stockAwal: number;      // Initial stock for the day
  stockIn: number;        // Stock received during the day
  stockOut: number;       // Stock out (usually = sales)
  stockAkhir: number;     // Final stock = initial + in - out
  createdAt: Date;
};