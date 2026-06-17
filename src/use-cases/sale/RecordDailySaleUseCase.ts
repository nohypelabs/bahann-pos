import { DailySale } from '@/domain/entities/DailySale';
import { DailySaleRepository } from '@/domain/repositories/DailySaleRepository';

export type RecordDailySaleInput = {
  tenantId: string;
  productId: string;
  outletId: string;
  saleDate: string; // ISO string
  quantitySold: number;
  unitPrice: number;
};

export class RecordDailySaleUseCase {
  constructor(private readonly repo: DailySaleRepository) {}

  async execute(input: RecordDailySaleInput): Promise<void> {
    const { tenantId, productId, outletId, saleDate, quantitySold, unitPrice } = input;
    const sale: DailySale = {
      id: crypto.randomUUID(),
      tenantId,
      productId,
      outletId,
      saleDate: new Date(saleDate),
      quantitySold,
      revenue: quantitySold * unitPrice,
      createdAt: new Date(),
    };

    await this.repo.save(sale);
  }
}