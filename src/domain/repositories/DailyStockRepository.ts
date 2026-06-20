import { DailyStock } from '../entities/DailyStock';

export interface DailyStockWithOutlet extends DailyStock {
  outletName?: string;
}

export interface DailyStockRepository {
  save(stock: DailyStock): Promise<void>;
  getLatestByProduct(outletId: string, productId: string): Promise<DailyStock | null>;
  getByDate(outletId: string, productId: string, date: Date): Promise<DailyStock | null>;
  getStockByProduct(productId: string, outletId?: string, tenantId?: string): Promise<DailyStockWithOutlet[]>;
}
