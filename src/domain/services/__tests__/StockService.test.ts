import { StockService } from '@/domain/services/StockService';
import { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { ItemType } from '@/domain/catalog/value-objects/item-type';
import { PricingModel } from '@/domain/catalog/value-objects/pricing-model';
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

describe('StockService', () => {
  describe('check', () => {
    it('should return available=true for TRACKED item with sufficient stock', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.check(product, 10, 5);

      expect(result).toEqual({ available: true, currentStock: 10 });
    });

    it('should return available=false for TRACKED item with insufficient stock', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.check(product, 3, 5);

      expect(result).toEqual({ available: false, currentStock: 3 });
    });

    it('should return available=true with currentStock=null for UNTRACKED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.UNTRACKED });

      const result = StockService.check(product, null, 999);

      expect(result).toEqual({ available: true, currentStock: null });
    });

    it('should return available=true with currentStock=null for CONSUMED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.CONSUMED });

      const result = StockService.check(product, null, 10);

      expect(result).toEqual({ available: true, currentStock: null });
    });

    it('should treat null currentStock as 0 for TRACKED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.check(product, null, 1);

      expect(result).toEqual({ available: false, currentStock: 0 });
    });
  });

  describe('deduct', () => {
    it('should deduct stock for TRACKED item with sufficient stock', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.deduct(product, 10, 3);

      expect(result).toEqual({ success: true, newStockLevel: 7 });
    });

    it('should return success=false for TRACKED item with insufficient stock', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.deduct(product, 2, 5);

      expect(result).toEqual({ success: false, newStockLevel: 2 });
    });

    it('should bypass deduction for UNTRACKED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.UNTRACKED });

      const result = StockService.deduct(product, null, 999);

      expect(result).toEqual({ success: true, newStockLevel: null });
    });

    it('should bypass deduction for CONSUMED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.CONSUMED });

      const result = StockService.deduct(product, null, 5);

      expect(result).toEqual({ success: true, newStockLevel: null });
    });

    it('should treat null currentStock as 0 for TRACKED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.deduct(product, null, 1);

      expect(result).toEqual({ success: false, newStockLevel: 0 });
    });

    it('should deduct exact stock amount (to zero)', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      const result = StockService.deduct(product, 5, 5);

      expect(result).toEqual({ success: true, newStockLevel: 0 });
    });
  });

  describe('assertCanDeduct', () => {
    it('should not throw for TRACKED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.TRACKED });

      expect(() => StockService.assertCanDeduct(product)).not.toThrow();
    });

    it('should not throw for CONSUMED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.CONSUMED });

      expect(() => StockService.assertCanDeduct(product)).not.toThrow();
    });

    it('should throw ITEM_UNTRACKED_NO_DEDUCT for UNTRACKED item', () => {
      const product = makeProduct({ stockBehavior: StockBehavior.UNTRACKED, name: 'Jasa Cuci' });

      expect(() => StockService.assertCanDeduct(product)).toThrow(DomainException);
      expect(() => StockService.assertCanDeduct(product)).toThrow(/does not track stock/);
    });
  });
});
