import { type ProductRepository, type ProductRow } from '@/domain/repositories/ProductRepository';
import { ItemFactory } from '@/domain/services/ItemFactory';
import type { ItemType } from '@/domain/catalog/value-objects/item-type';
import type { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import type { PricingModel } from '@/domain/catalog/value-objects/pricing-model';

export interface CreateProductInput {
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  price?: number;
  ownerId: string;
  tenantId: string;
  itemType: string;
  stockBehavior: string;
  pricingModel: string;
  pricingTiers?: Array<{ minQuantity: number; pricePerUnit: number }>;
  durationMinutes?: number;
  imageUrl?: string | null;
  image_url?: string | null;
}

export class CreateProductUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  async execute(input: CreateProductInput): Promise<ProductRow> {
    ItemFactory.validateCombo(
      input.itemType as ItemType,
      input.stockBehavior as StockBehavior,
      input.pricingModel as PricingModel,
    );

    return this.productRepo.create({
      sku: input.sku,
      barcode: input.barcode || null,
      name: input.name,
      category: input.category || null,
      price: input.price || null,
      ownerId: input.ownerId,
      tenantId: input.tenantId,
      itemType: input.itemType,
      stockBehavior: input.stockBehavior,
      pricingModel: input.pricingModel,
      pricingTiers: input.pricingTiers ? JSON.stringify(input.pricingTiers) : null,
      durationMinutes: input.durationMinutes || null,
      imageUrl: input.imageUrl ?? input.image_url ?? null,
    });
  }
}
