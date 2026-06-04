/**
 * Business type classification for tenant profiles.
 * Determines default item types, stock behavior, and enabled modules.
 */
export const BusinessType = {
  /** Warung, cafe, resto — menu-based, non-fixed stock */
  FNB: 'FNB',
  /** Toko, minimarket — product-based, fixed/tracked stock */
  RETAIL: 'RETAIL',
  /** Car wash, barbershop — service-based, no stock */
  SERVICE: 'SERVICE',
  /** Campuran ritel, makanan, dan jasa */
  HYBRID: 'HYBRID',
} as const;

export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

/** Ordered list for UI selectors */
export const BUSINESS_TYPES = Object.values(BusinessType);

/** Human-readable labels (Indonesian) */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.FNB]: 'Kuliner & FnB',
  [BusinessType.RETAIL]: 'Toko & Retail',
  [BusinessType.SERVICE]: 'Jasa & Layanan',
  [BusinessType.HYBRID]: 'Campuran (Hybrid)',
};

/** Human-readable labels (English) */
export const BUSINESS_TYPE_LABELS_EN: Record<BusinessType, string> = {
  [BusinessType.FNB]: 'Food & Beverage',
  [BusinessType.RETAIL]: 'Retail & Store',
  [BusinessType.SERVICE]: 'Service & Professional',
  [BusinessType.HYBRID]: 'Hybrid (Mixed)',
};
