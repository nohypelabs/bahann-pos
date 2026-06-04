import type { BusinessType } from '@/domain/catalog/value-objects/business-type';
import { BusinessType as BT } from '@/domain/catalog/value-objects/business-type';

export class BusinessProfile {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly businessType: BusinessType,
    public readonly enabledModules: string[],
    public readonly createdAt: Date,
  ) {}

  /**
   * Create a BusinessProfile with defaults based on business type.
   * ID is generated via crypto.randomUUID() — not delegated to DB.
   */
  static createDefaults(userId: string, businessType: BusinessType): BusinessProfile {
    const defaults = BUSINESS_TYPE_DEFAULTS[businessType];
    return new BusinessProfile(
      crypto.randomUUID(),
      userId,
      businessType,
      [...defaults.modules],
      new Date(),
    );
  }
}

/** Default configuration per business type */
export const BUSINESS_TYPE_DEFAULTS: Record<
  BusinessType,
  { modules: string[]; defaultItemType: string; defaultStockBehavior: string }
> = {
  [BT.FNB]: {
    modules: ['recipe'],
    defaultItemType: 'MENU',
    defaultStockBehavior: 'UNTRACKED',
  },
  [BT.RETAIL]: {
    modules: ['inventory'],
    defaultItemType: 'PRODUCT',
    defaultStockBehavior: 'TRACKED',
  },
  [BT.SERVICE]: {
    modules: ['appointment'],
    defaultItemType: 'SERVICE',
    defaultStockBehavior: 'UNTRACKED',
  },
  [BT.HYBRID]: {
    modules: ['inventory', 'recipe'],
    defaultItemType: 'PRODUCT',
    defaultStockBehavior: 'TRACKED',
  },
};
