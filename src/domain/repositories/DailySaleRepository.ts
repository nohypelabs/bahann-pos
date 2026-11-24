import { DailySale } from '../entities/DailySale';

export interface DailySaleRepository {
  save(sale: DailySale): Promise<void>;
  /**
   * Adds a sale to its product's row for the day (one row per product, outlet and
   * day). Negative quantity and revenue take a voided sale back out.
   */
  addToDay(sale: Pick<DailySale, 'tenantId' | 'productId' | 'outletId' | 'saleDate' | 'quantitySold' | 'revenue'>): Promise<void>;
  getByDateRange(outletId: string, start: Date, end: Date): Promise<DailySale[]>;
}
