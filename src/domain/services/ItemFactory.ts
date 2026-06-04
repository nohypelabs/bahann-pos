import type { Product } from '@/domain/entities/Product';
import type { ItemType } from '@/domain/catalog/value-objects/item-type';
import { ItemType as IT } from '@/domain/catalog/value-objects/item-type';
import type { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { StockBehavior as SB } from '@/domain/catalog/value-objects/stock-behavior';
import type { PricingModel } from '@/domain/catalog/value-objects/pricing-model';
import { PricingModel as PM, type PricingTier } from '@/domain/catalog/value-objects/pricing-model';
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException';

interface CreateItemInput {
  sku: string;
  name: string;
  category?: string;
  price?: number;
  barcode?: string;
  itemType: ItemType;
  stockBehavior: StockBehavior;
  pricingModel: PricingModel;
  pricingTiers?: PricingTier[];
  durationMinutes?: number;
}

/**
 * Factory for creating Product entities with validation.
 * Single entry point — enforces valid state combinations.
 */
export const ItemFactory = {
  create(input: CreateItemInput): Product {
    // Validate state combinations
    ItemFactory.validateCombo(input.itemType, input.stockBehavior, input.pricingModel);

    // Validate pricing tiers
    if (input.pricingModel === PM.TIERED) {
      if (!input.pricingTiers || input.pricingTiers.length === 0) {
        throw new DomainException(
          DomainErrorCode.MISSING_PRICING_TIERS,
          `Pricing tiers are required when using tiered pricing for "${input.name}"`,
        );
      }
    }

    // Validate duration
    if (input.pricingModel === PM.TIME_BASED) {
      if (!input.durationMinutes || input.durationMinutes <= 0) {
        throw new DomainException(
          DomainErrorCode.MISSING_DURATION,
          `Duration (minutes) is required when using time-based pricing for "${input.name}"`,
        );
      }
    }

    return {
      id: crypto.randomUUID(),
      sku: input.sku,
      barcode: input.barcode,
      name: input.name,
      category: input.category,
      price: input.price,
      createdAt: new Date(),
      itemType: input.itemType,
      stockBehavior: input.stockBehavior,
      pricingModel: input.pricingModel,
      pricingTiers: input.pricingTiers,
      durationMinutes: input.durationMinutes,
    };
  },

  /**
   * Validate that the item type + stock behavior + pricing model combination is valid.
   * Throws DomainException with descriptive code on invalid combos.
   */
  validateCombo(itemType: ItemType, stockBehavior: StockBehavior, pricingModel: PricingModel): void {
    // SERVICE items cannot have tracked stock
    if (itemType === IT.SERVICE && stockBehavior === SB.TRACKED) {
      throw new DomainException(
        DomainErrorCode.INVALID_ITEM_TYPE_STOCK_COMBO,
        'Service items cannot have tracked stock — use UNTRACKED instead',
      );
    }

    // PRODUCT items cannot use CONSUMED stock behavior (that's for recipes)
    if (itemType === IT.PRODUCT && stockBehavior === SB.CONSUMED) {
      throw new DomainException(
        DomainErrorCode.INVALID_ITEM_TYPE_STOCK_COMBO,
        'Physical products cannot use consumed stock behavior — use TRACKED instead',
      );
    }

    // SERVICE items cannot use TIERED pricing (doesn't make sense for services)
    if (itemType === IT.SERVICE && pricingModel === PM.TIERED) {
      throw new DomainException(
        DomainErrorCode.INVALID_ITEM_TYPE_PRICING_COMBO,
        'Service items cannot use tiered pricing — use FIXED or TIME_BASED instead',
      );
    }

    // MENU items cannot use TIME_BASED pricing (food isn't rented by time)
    if (itemType === IT.MENU && pricingModel === PM.TIME_BASED) {
      throw new DomainException(
        DomainErrorCode.INVALID_ITEM_TYPE_PRICING_COMBO,
        'Menu items cannot use time-based pricing — use FIXED or TIERED instead',
      );
    }

    // PACKAGE items cannot use CONSUMED stock
    if (itemType === IT.PACKAGE && stockBehavior === SB.CONSUMED) {
      throw new DomainException(
        DomainErrorCode.INVALID_ITEM_TYPE_STOCK_COMBO,
        'Package items cannot use consumed stock behavior',
      );
    }
  },
};
