import type { ItemType } from '@/domain/catalog/value-objects/item-type';
import type { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import type { PricingModel } from '@/domain/catalog/value-objects/pricing-model';
import type { PricingTier } from '@/domain/catalog/value-objects/pricing-model';
import { StockBehavior as StockBehaviorEnum } from '@/domain/catalog/value-objects/stock-behavior';

export type Product = {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category?: string;
  price?: number;
  createdAt: Date;
  /** Item type classification (PRODUCT, MENU, SERVICE, PACKAGE) */
  itemType: ItemType;
  /** Stock tracking behavior (TRACKED, UNTRACKED, CONSUMED) */
  stockBehavior: StockBehavior;
  /** Pricing model (FIXED, TIERED, TIME_BASED) */
  pricingModel: PricingModel;
  /** Tiered pricing structure — only for TIERED model */
  pricingTiers?: PricingTier[];
  /** Duration in minutes — only for TIME_BASED model */
  durationMinutes?: number;
};

/**
 * Check if this product's stock should be deducted during transactions.
 * UNTRACKED items (services, standard menu) bypass stock deduction.
 */
export function canDeductStock(product: Product): boolean {
  return product.stockBehavior === StockBehaviorEnum.TRACKED;
}
