import { ProductRepository } from '@/domain/repositories/ProductRepository';
import { DailyStockRepository } from '@/domain/repositories/DailyStockRepository';
import { StockMovementRepository, StockMovement, StockMovementFilters } from '@/domain/repositories/StockMovementRepository';

interface StockRecord {
  outletId: string;
  outletName?: string;
  stockAkhir: number;
  stockDate: Date;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  price: number | null;
  currentStock: number;
  stockByOutlet: Array<{
    outletId: string;
    outletName: string;
    stock: number;
    lastUpdated: string;
  }>;
}

export class ListStockUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly dailyStockRepo: DailyStockRepository,
    private readonly stockMovementRepo: StockMovementRepository,
  ) {}

  async getLatest(outletId: string, productId: string) {
    return this.dailyStockRepo.getLatestByProduct(outletId, productId);
  }

  async getInventoryList(ownerId?: string, outletId?: string): Promise<InventoryItem[]> {
    const { data: products } = await this.productRepo.list(
      { ownerId },
      1,
      10000,
    );

    const inventoryList = await Promise.all(
      products.map(async (product) => {
        const stockRecords = await this.dailyStockRepo.getStockByProduct(product.id, outletId);

        const stockByOutlet = stockRecords.reduce(
          (acc: StockRecord[], record) => {
            const existing = acc.find((r) => r.outletId === record.outletId);
            if (!existing || record.stockDate > existing.stockDate) {
              return [...acc.filter((r) => r.outletId !== record.outletId), {
                outletId: record.outletId,
                outletName: record.outletName,
                stockAkhir: record.stockAkhir,
                stockDate: record.stockDate,
              }];
            }
            return acc;
          },
          [],
        );

        const totalStock = stockByOutlet.reduce(
          (sum, record) => sum + (record.stockAkhir || 0),
          0,
        );

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          price: product.price,
          currentStock: totalStock,
          stockByOutlet: stockByOutlet.map((record) => ({
            outletId: record.outletId,
            outletName: record.outletName || 'Unknown',
            stock: record.stockAkhir || 0,
            lastUpdated: record.stockDate.toISOString().split('T')[0],
          })),
        };
      }),
    );

    return inventoryList;
  }

  async getMovements(filters: StockMovementFilters): Promise<{ movements: StockMovement[]; total: number }> {
    const result = await this.stockMovementRepo.list(filters);
    return { movements: result.data, total: result.total };
  }
}
