import { type ProductRepository, type ProductRow } from '@/domain/repositories/ProductRepository';
import { ItemFactory } from '@/domain/services/ItemFactory';
import type { ItemType } from '@/domain/catalog/value-objects/item-type';
import type { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import type { PricingModel } from '@/domain/catalog/value-objects/pricing-model';

export interface UpdateProductInput {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  price?: number;
  itemType?: string;
  stockBehavior?: string;
  pricingModel?: string;
  pricingTiers?: Array<{ minQuantity: number; pricePerUnit: number }>;
  durationMinutes?: number;
}

export class UpdateProductUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  async execute(input: UpdateProductInput): Promise<ProductRow> {
    if (input.itemType || input.stockBehavior || input.pricingModel) {
      const current = await this.productRepo.getById(input.id);
      if (!current) throw new Error('Product not found');

      ItemFactory.validateCombo(
        (input.itemType || current.item_type || 'PRODUCT') as ItemType,
        (input.stockBehavior || current.stock_behavior || 'TRACKED') as StockBehavior,
        (input.pricingModel || current.pricing_model || 'FIXED') as PricingModel,
      );
    }

    return this.productRepo.update(input.id, {
      sku: input.sku,
      barcode: input.barcode || null,
      name: input.name,
      category: input.category || null,
      price: input.price || null,
      itemType: input.itemType,
      stockBehavior: input.stockBehavior,
      pricingModel: input.pricingModel,
      pricingTiers: input.pricingTiers !== undefined
        ? input.pricingTiers ? JSON.stringify(input.pricingTiers) : null
        : undefined,
      durationMinutes: input.durationMinutes !== undefined
        ? input.durationMinutes || null
        : undefined,
    });
  }
}
