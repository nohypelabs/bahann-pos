import { PricingService } from '@/domain/services/PricingService';
import { PricingModel } from '@/domain/catalog/value-objects/pricing-model';
import { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { ItemType } from '@/domain/catalog/value-objects/item-type';
import { DomainException } from '@/domain/errors/DomainException';
import type { Product } from '@/domain/entities/Product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    sku: 'SKU-1',
    name: 'Test Product',
    price: 10000,
    createdAt: new Date(),
    itemType: ItemType.PRODUCT,
    stockBehavior: StockBehavior.TRACKED,
    pricingModel: PricingModel.FIXED,
    ...overrides,
  };
}

describe('PricingService', () => {
  describe('calculateFixed', () => {
    it('should return unitPrice × quantity', () => {
      const product = makeProduct({ price: 5000 });

      const result = PricingService.calculateFixed(product, 3);

      expect(result).toEqual({
        unitPrice: 5000,
        total: 15000,
        pricingModel: PricingModel.FIXED,
      });
    });

    it('should throw INVALID_PRICE when price is undefined', () => {
      const product = makeProduct({ price: undefined });

      expect(() => PricingService.calculateFixed(product, 1)).toThrow(DomainException);
      expect(() => PricingService.calculateFixed(product, 1)).toThrow(/tidak memiliki harga/);
    });

    it('should throw INVALID_PRICE when price is null', () => {
      const product = makeProduct({ price: null as unknown as undefined });

      expect(() => PricingService.calculateFixed(product, 1)).toThrow(DomainException);
    });

    it('should handle quantity of 1', () => {
      const product = makeProduct({ price: 8000 });

      const result = PricingService.calculateFixed(product, 1);

      expect(result.total).toBe(8000);
      expect(result.unitPrice).toBe(8000);
    });
  });

  describe('calculateTiered', () => {
    it('should match the correct tier based on quantity', () => {
      const product = makeProduct({
        pricingModel: PricingModel.TIERED,
        pricingTiers: [
          { minQuantity: 1, pricePerUnit: 10000 },
          { minQuantity: 10, pricePerUnit: 8000 },
          { minQuantity: 50, pricePerUnit: 6000 },
        ],
      });

      const result = PricingService.calculateTiered(product, 15);

      expect(result.unitPrice).toBe(8000);
      expect(result.total).toBe(120000);
      expect(result.appliedTier).toEqual({ minQuantity: 10, pricePerUnit: 8000 });
      expect(result.pricingModel).toBe(PricingModel.TIERED);
    });

    it('should pick highest matching tier when quantity exceeds multiple tiers', () => {
      const product = makeProduct({
        pricingModel: PricingModel.TIERED,
        pricingTiers: [
          { minQuantity: 1, pricePerUnit: 10000 },
          { minQuantity: 10, pricePerUnit: 8000 },
          { minQuantity: 50, pricePerUnit: 6000 },
        ],
      });

      const result = PricingService.calculateTiered(product, 100);

      expect(result.unitPrice).toBe(6000);
      expect(result.appliedTier?.minQuantity).toBe(50);
    });

    it('should fall back to base price when quantity is below all tiers', () => {
      const product = makeProduct({
        price: 12000,
        pricingModel: PricingModel.TIERED,
        pricingTiers: [
          { minQuantity: 5, pricePerUnit: 10000 },
          { minQuantity: 20, pricePerUnit: 8000 },
        ],
      });

      const result = PricingService.calculateTiered(product, 2);

      expect(result.unitPrice).toBe(12000);
      expect(result.total).toBe(24000);
      expect(result.appliedTier).toBeUndefined();
    });

    it('should fall back to base price when no tiers defined', () => {
      const product = makeProduct({ price: 9000, pricingModel: PricingModel.TIERED, pricingTiers: [] });

      const result = PricingService.calculateTiered(product, 5);

      expect(result.unitPrice).toBe(9000);
      expect(result.total).toBe(45000);
    });

    it('should throw when no tiers and base price is missing', () => {
      const product = makeProduct({ price: undefined, pricingModel: PricingModel.TIERED, pricingTiers: [] });

      expect(() => PricingService.calculateTiered(product, 1)).toThrow(DomainException);
    });
  });

  describe('calculateTimeBased', () => {
    it('should return basePrice × durationMinutes', () => {
      const product = makeProduct({ price: 500, pricingModel: PricingModel.TIME_BASED });

      const result = PricingService.calculateTimeBased(product, 60);

      expect(result).toEqual({
        unitPrice: 500,
        total: 30000,
        pricingModel: PricingModel.TIME_BASED,
      });
    });

    it('should throw MISSING_DURATION when duration is undefined', () => {
      const product = makeProduct({ pricingModel: PricingModel.TIME_BASED });

      expect(() => PricingService.calculateTimeBased(product, undefined)).toThrow(DomainException);
    });

    it('should throw MISSING_DURATION when duration is zero', () => {
      const product = makeProduct({ pricingModel: PricingModel.TIME_BASED });

      expect(() => PricingService.calculateTimeBased(product, 0)).toThrow(DomainException);
    });

    it('should throw MISSING_DURATION when duration is negative', () => {
      const product = makeProduct({ pricingModel: PricingModel.TIME_BASED });

      expect(() => PricingService.calculateTimeBased(product, -10)).toThrow(DomainException);
    });

    it('should throw INVALID_PRICE when price is missing', () => {
      const product = makeProduct({ price: undefined, pricingModel: PricingModel.TIME_BASED });

      expect(() => PricingService.calculateTimeBased(product, 30)).toThrow(DomainException);
    });
  });

  describe('calculatePrice (dispatcher)', () => {
    it('should dispatch to FIXED for fixed products', () => {
      const product = makeProduct({ pricingModel: PricingModel.FIXED, price: 3000 });

      const result = PricingService.calculatePrice(product, 2);

      expect(result.pricingModel).toBe(PricingModel.FIXED);
      expect(result.total).toBe(6000);
    });

    it('should dispatch to TIERED for tiered products', () => {
      const product = makeProduct({
        pricingModel: PricingModel.TIERED,
        pricingTiers: [{ minQuantity: 1, pricePerUnit: 7000 }],
      });

      const result = PricingService.calculatePrice(product, 3);

      expect(result.pricingModel).toBe(PricingModel.TIERED);
      expect(result.total).toBe(21000);
    });

    it('should dispatch to TIME_BASED for time-based products', () => {
      const product = makeProduct({ pricingModel: PricingModel.TIME_BASED, price: 200 });

      const result = PricingService.calculatePrice(product, 1, 45);

      expect(result.pricingModel).toBe(PricingModel.TIME_BASED);
      expect(result.total).toBe(9000);
    });
  });

  describe('getDisplayPrice', () => {
    it('should return lowest tier price for TIERED products', () => {
      const product = makeProduct({
        pricingModel: PricingModel.TIERED,
        pricingTiers: [
          { minQuantity: 1, pricePerUnit: 10000 },
          { minQuantity: 10, pricePerUnit: 7000 },
        ],
      });

      expect(PricingService.getDisplayPrice(product)).toBe(7000);
    });

    it('should return base price for FIXED products', () => {
      const product = makeProduct({ price: 15000 });

      expect(PricingService.getDisplayPrice(product)).toBe(15000);
    });

    it('should return 0 when price is undefined', () => {
      const product = makeProduct({ price: undefined });

      expect(PricingService.getDisplayPrice(product)).toBe(0);
    });
  });
});
