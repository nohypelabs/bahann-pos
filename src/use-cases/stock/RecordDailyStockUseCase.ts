import { DailyStock } from '@/domain/entities/DailyStock';
import { DailyStockRepository } from '@/domain/repositories/DailyStockRepository';

export type RecordDailyStockInput = {
  tenantId: string;
  productId: string;
  outletId: string;
  stockDate: string; // ISO string (YYYY-MM-DD)
  stockAwal: number;
  stockIn: number;
  stockOut: number;
  stockAkhir: number;
};

export class RecordDailyStockUseCase {
  constructor(private readonly repo: DailyStockRepository) {}

  async execute(input: RecordDailyStockInput): Promise<void> {
    const { tenantId, productId, outletId, stockDate, stockAwal, stockIn, stockOut, stockAkhir } = input;

    // Business logic validation
    if (stockAkhir !== stockAwal + stockIn - stockOut) {
      throw new Error('Final stock does not match calculation: initial + in - out');
    }

    const stock: DailyStock = {
      id: crypto.randomUUID(),
      tenantId,
      productId,
      outletId,
      stockDate: new Date(stockDate),
      stockAwal,
      stockIn,
      stockOut,
      stockAkhir,
      createdAt: new Date(),
    };

    await this.repo.save(stock);
  }
}