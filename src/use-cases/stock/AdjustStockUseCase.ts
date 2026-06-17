import { DailyStockRepository } from '@/domain/repositories/DailyStockRepository';
import { StockMovementRepository } from '@/domain/repositories/StockMovementRepository';
import { DailyStock } from '@/domain/entities/DailyStock';

export interface AdjustStockInput {
  tenantId: string;
  productId: string;
  outletId: string;
  stockDate: string;
  stockAwal: number;
  stockIn: number;
  stockOut: number;
  stockAkhir: number;
  userId: string;
}

export class AdjustStockUseCase {
  constructor(
    private readonly dailyStockRepo: DailyStockRepository,
    private readonly stockMovementRepo: StockMovementRepository,
  ) {}

  async execute(input: AdjustStockInput): Promise<void> {
    if (input.stockAkhir !== input.stockAwal + input.stockIn - input.stockOut) {
      throw new Error('Final stock does not match calculation: initial + in - out');
    }

    const prevStock = await this.dailyStockRepo.getLatestByProduct(input.outletId, input.productId);
    const previousStock = prevStock?.stockAkhir ?? input.stockAwal;

    const stock: DailyStock = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      productId: input.productId,
      outletId: input.outletId,
      stockDate: new Date(input.stockDate),
      stockAwal: input.stockAwal,
      stockIn: input.stockIn,
      stockOut: input.stockOut,
      stockAkhir: input.stockAkhir,
      createdAt: new Date(),
    };

    await this.dailyStockRepo.save(stock);

    const netChange = input.stockIn - input.stockOut;
    if (netChange !== 0) {
      const movementType = netChange > 0 ? 'IN' : 'OUT';
      await this.stockMovementRepo.insert({
        product_id: input.productId,
        outlet_id: input.outletId,
        user_id: input.userId,
        movement_type: movementType,
        quantity: Math.abs(netChange),
        previous_stock: previousStock,
        new_stock: input.stockAkhir,
      });
    }
  }
}
