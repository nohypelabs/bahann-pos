export type DailySale = {
  id: string;
  tenantId: string;
  productId: string;
  outletId: string;
  saleDate: Date;
  quantitySold: number;
  revenue: number;
  createdAt: Date;
};
