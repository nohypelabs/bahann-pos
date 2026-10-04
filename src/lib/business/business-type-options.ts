import { BusinessType } from '@/domain/catalog/value-objects/business-type';

export interface BusinessTypeOption {
  type: BusinessType;
  icon: string;
  /** i18n key segment: `businessType.<key>.title` and `<key>.description` */
  key: string;
  /** Module keys this type enables; labels live under `businessType.module.<key>` */
  modules: string[];
}

/**
 * The single source for the business-type picker.
 *
 * The setup and register screens each carried their own copy of this list with
 * inline Indonesian and English strings, so adding a type to the domain would not
 * have shown up in either. Both now map over this, and every label comes from i18n.
 */
export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  { type: BusinessType.RETAIL, icon: '🏪', key: 'retail', modules: ['inventory'] },
  { type: BusinessType.FNB, icon: '🍜', key: 'fnb', modules: ['recipe'] },
  { type: BusinessType.SERVICE, icon: '💼', key: 'service', modules: ['appointment'] },
  { type: BusinessType.HYBRID, icon: '🧩', key: 'hybrid', modules: ['inventory', 'recipe'] },
];
