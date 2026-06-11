import { ItemFactory } from '@/domain/services/ItemFactory';
import { ItemType } from '@/domain/catalog/value-objects/item-type';
import { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { PricingModel } from '@/domain/catalog/value-objects/pricing-model';
import { DomainException } from '@/domain/errors/DomainException';

const validInput = {
  sku: 'SKU-001',
  name: 'Produk Test',
  itemType: ItemType.PRODUCT,
  stockBehavior: StockBehavior.TRACKED,
  pricingModel: PricingModel.FIXED,
  price: 10000,
};

describe('ItemFactory', () => {
  describe('create', () => {
    it('should create a valid product with correct fields', () => {
      const product = ItemFactory.create(validInput);

      expect(product.sku).toBe('SKU-001');
      expect(product.name).toBe('Produk Test');
      expect(product.price).toBe(10000);
      expect(product.itemType).toBe(ItemType.PRODUCT);
      expect(product.stockBehavior).toBe(StockBehavior.TRACKED);
      expect(product.pricingModel).toBe(PricingModel.FIXED);
      expect(product.id).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
    });

    it('should create a TIERED product when pricingTiers are provided', () => {
      const input = {
        ...validInput,
        pricingModel: PricingModel.TIERED,
        pricingTiers: [{ minQuantity: 1, pricePerUnit: 10000 }],
      };

      const product = ItemFactory.create(input);

      expect(product.pricingModel).toBe(PricingModel.TIERED);
      expect(product.pricingTiers).toHaveLength(1);
    });

    it('should throw MISSING_PRICING_TIERS for TIERED model without tiers', () => {
      const input = {
        ...validInput,
        pricingModel: PricingModel.TIERED,
        pricingTiers: undefined,
      };

      expect(() => ItemFactory.create(input)).toThrow(DomainException);
      expect(() => ItemFactory.create(input)).toThrow(/tiers/i);
    });

    it('should throw MISSING_DURATION for TIME_BASED model without duration', () => {
      const input = {
        ...validInput,
        itemType: ItemType.SERVICE,
        stockBehavior: StockBehavior.UNTRACKED,
        pricingModel: PricingModel.TIME_BASED,
        durationMinutes: undefined,
      };

      expect(() => ItemFactory.create(input)).toThrow(DomainException);
      expect(() => ItemFactory.create(input)).toThrow(/duration/i);
    });

    it('should create a valid SERVICE with UNTRACKED stock and FIXED pricing', () => {
      const input = {
        ...validInput,
        itemType: ItemType.SERVICE,
        stockBehavior: StockBehavior.UNTRACKED,
        pricingModel: PricingModel.FIXED,
      };

      const product = ItemFactory.create(input);

      expect(product.itemType).toBe(ItemType.SERVICE);
      expect(product.stockBehavior).toBe(StockBehavior.UNTRACKED);
    });
  });

  describe('validateCombo', () => {
    it('should pass for valid PRODUCT + TRACKED + FIXED', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.PRODUCT, StockBehavior.TRACKED, PricingModel.FIXED),
      ).not.toThrow();
    });

    it('should pass for valid MENU + UNTRACKED + FIXED', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.MENU, StockBehavior.UNTRACKED, PricingModel.FIXED),
      ).not.toThrow();
    });

    it('should pass for valid SERVICE + UNTRACKED + TIME_BASED', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.SERVICE, StockBehavior.UNTRACKED, PricingModel.TIME_BASED),
      ).not.toThrow();
    });

    it('should throw for SERVICE + TRACKED (invalid stock behavior)', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.SERVICE, StockBehavior.TRACKED, PricingModel.FIXED),
      ).toThrow(DomainException);
    });

    it('should throw for PRODUCT + CONSUMED (invalid stock behavior)', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.PRODUCT, StockBehavior.CONSUMED, PricingModel.FIXED),
      ).toThrow(DomainException);
    });

    it('should throw for SERVICE + TIERED (invalid pricing model)', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.SERVICE, StockBehavior.UNTRACKED, PricingModel.TIERED),
      ).toThrow(DomainException);
    });

    it('should throw for MENU + TIME_BASED (invalid pricing model)', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.MENU, StockBehavior.UNTRACKED, PricingModel.TIME_BASED),
      ).toThrow(DomainException);
    });

    it('should throw for PACKAGE + CONSUMED (invalid stock behavior)', () => {
      expect(() =>
        ItemFactory.validateCombo(ItemType.PACKAGE, StockBehavior.CONSUMED, PricingModel.FIXED),
      ).toThrow(DomainException);
    });
  });
});
