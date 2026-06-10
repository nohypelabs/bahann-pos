import type { Product } from '@/domain/entities/Product';
import type { PricingTier } from '@/domain/catalog/value-objects/pricing-model';
import { PricingModel } from '@/domain/catalog/value-objects/pricing-model';
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException';

/** Result of a price calculation */
export interface PriceResult {
  /** Resolved unit price (after tier/time calculation) */
  unitPrice: number;
  /** Total = unitPrice × quantity (or unitPrice × duration for TIME_BASED) */
  total: number;
  /** The applied tier (only for TIERED model) */
  appliedTier?: PricingTier;
  /** Which pricing model was used */
  pricingModel: string;
}

/**
 * Domain service for pricing logic.
 * Pure functions — no side effects.
 */
export const PricingService = {
  /**
   * Calculate price for a product given quantity (and optionally duration).
   *
   * - FIXED → basePrice × quantity
   * - TIERED → find best tier, fallback to base price
   * - TIME_BASED → basePrice × duration (in minutes)
   */
  calculatePrice(
    product: Product,
    quantity: number,
    durationMinutes?: number,
  ): PriceResult {
    switch (product.pricingModel) {
      case PricingModel.FIXED:
        return PricingService.calculateFixed(product, quantity);

      case PricingModel.TIERED:
        return PricingService.calculateTiered(product, quantity);

      case PricingModel.TIME_BASED:
        return PricingService.calculateTimeBased(product, durationMinutes);

      default:
        // Fallback to fixed for unknown models
        return PricingService.calculateFixed(product, quantity);
    }
  },

  /**
   * FIXED pricing: unitPrice × quantity
   */
  calculateFixed(product: Product, quantity: number): PriceResult {
    if (product.price === undefined || product.price === null) {
      throw new DomainException(
        DomainErrorCode.INVALID_PRICE,
        `Produk "${product.name}" tidak memiliki harga. Silakan atur harga terlebih dahulu.`,
      );
    }
    const unitPrice = product.price;
    return {
      unitPrice,
      total: unitPrice * quantity,
      pricingModel: PricingModel.FIXED,
    };
  },

  /**
   * TIERED pricing: find the tier with highest minQuantity <= quantity.
   * If no tier matches, fallback to base price.
   * Tier 0 (minQuantity: 1) should always exist as the default.
   */
  calculateTiered(product: Product, quantity: number): PriceResult {
    const tiers = product.pricingTiers;
    if (!tiers || tiers.length === 0) {
      // No tiers defined — fallback to base price
      return PricingService.calculateFixed(product, quantity);
    }

    // Sort tiers descending by minQuantity, pick highest that fits
    const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
    const matched = sorted.find((tier) => quantity >= tier.minQuantity);

    if (!matched) {
      // Quantity below all tiers — use base price
      if (product.price === undefined || product.price === null) {
        throw new DomainException(
          DomainErrorCode.INVALID_PRICE,
          `Produk "${product.name}" tidak memiliki harga dasar untuk tiered pricing.`,
        );
      }
      const unitPrice = product.price;
      return {
        unitPrice,
        total: unitPrice * quantity,
        pricingModel: PricingModel.TIERED,
      };
    }

    return {
      unitPrice: matched.pricePerUnit,
      total: matched.pricePerUnit * quantity,
      appliedTier: matched,
      pricingModel: PricingModel.TIERED,
    };
  },

  /**
   * TIME_BASED pricing: basePrice × duration (in minutes)
   * Duration must be provided; throws if missing.
   */
  calculateTimeBased(product: Product, durationMinutes?: number): PriceResult {
    if (durationMinutes === undefined || durationMinutes === null || durationMinutes <= 0) {
      throw new DomainException(
        DomainErrorCode.MISSING_DURATION,
        `Duration (in minutes) is required for time-based pricing on "${product.name}"`,
      );
    }

    if (product.price === undefined || product.price === null) {
      throw new DomainException(
        DomainErrorCode.INVALID_PRICE,
        `Produk "${product.name}" tidak memiliki harga per-menit untuk time-based pricing.`,
      );
    }
    const unitPrice = product.price;
    return {
      unitPrice,
      total: unitPrice * durationMinutes,
      pricingModel: PricingModel.TIME_BASED,
    };
  },

  /**
   * Get the effective display price for a product.
   * For TIERED, returns the lowest tier price (or base price).
   * For TIME_BASED, returns the per-minute rate.
   * For FIXED, returns the base price.
   */
  getDisplayPrice(product: Product): number {
    if (product.pricingModel === PricingModel.TIERED && product.pricingTiers?.length) {
      const lowest = [...product.pricingTiers].sort(
        (a, b) => a.pricePerUnit - b.pricePerUnit,
      )[0];
      return lowest.pricePerUnit;
    }
    return product.price ?? 0;
  },
};
