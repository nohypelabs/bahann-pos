import type { BusinessType } from '@/domain/catalog/value-objects/business-type';
import { BusinessType as BT } from '@/domain/catalog/value-objects/business-type';
import type { ItemType } from '@/domain/catalog/value-objects/item-type';
import { ItemType as IT } from '@/domain/catalog/value-objects/item-type';
import type { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { StockBehavior as SB } from '@/domain/catalog/value-objects/stock-behavior';

/**
 * Strategy interface for business type configuration.
 * Each business type has its own defaults for item type, stock behavior, and modules.
 */
export interface IBusinessTypeStrategy {
  getDefaultItemType(): ItemType;
  getDefaultStockBehavior(): StockBehavior;
  getEnabledModules(): string[];
}

class FnbStrategy implements IBusinessTypeStrategy {
  getDefaultItemType(): ItemType { return IT.MENU; }
  getDefaultStockBehavior(): StockBehavior { return SB.UNTRACKED; }
  getEnabledModules(): string[] { return ['recipe']; }
}

class RetailStrategy implements IBusinessTypeStrategy {
  getDefaultItemType(): ItemType { return IT.PRODUCT; }
  getDefaultStockBehavior(): StockBehavior { return SB.TRACKED; }
  getEnabledModules(): string[] { return ['inventory']; }
}

class ServiceStrategy implements IBusinessTypeStrategy {
  getDefaultItemType(): ItemType { return IT.SERVICE; }
  getDefaultStockBehavior(): StockBehavior { return SB.UNTRACKED; }
  getEnabledModules(): string[] { return ['appointment']; }
}

class HybridStrategy implements IBusinessTypeStrategy {
  getDefaultItemType(): ItemType { return IT.PRODUCT; }
  getDefaultStockBehavior(): StockBehavior { return SB.TRACKED; }
  getEnabledModules(): string[] { return ['inventory', 'recipe']; }
}

/** Factory: get the strategy for a given business type */
export function createBusinessTypeStrategy(type: BusinessType): IBusinessTypeStrategy {
  switch (type) {
    case BT.FNB: return new FnbStrategy();
    case BT.RETAIL: return new RetailStrategy();
    case BT.SERVICE: return new ServiceStrategy();
    case BT.HYBRID: return new HybridStrategy();
    default: return new RetailStrategy();
  }
}
