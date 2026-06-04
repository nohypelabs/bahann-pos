/**
 * Pricing model for catalog items.
 * Determines how the unit price is calculated at checkout.
 */
export const PricingModel = {
  /** Harga tunggal / flat */
  FIXED: 'FIXED',
  /** Harga grosir berdasarkan rentang kuantitas */
  TIERED: 'TIERED',
  /** Harga sewa / durasi (per menit/jam) */
  TIME_BASED: 'TIME_BASED',
} as const;

export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel];

/** Ordered list for UI selectors */
export const PRICING_MODELS = Object.values(PricingModel);

/** Human-readable labels (Indonesian) */
export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  [PricingModel.FIXED]: 'Harga Tetap',
  [PricingModel.TIERED]: 'Harga Grosir (Tiered)',
  [PricingModel.TIME_BASED]: 'Harga Per Durasi',
};

/** Human-readable labels (English) */
export const PRICING_MODEL_LABELS_EN: Record<PricingModel, string> = {
  [PricingModel.FIXED]: 'Fixed Price',
  [PricingModel.TIERED]: 'Tiered / Wholesale',
  [PricingModel.TIME_BASED]: 'Time-Based Pricing',
};

/** Pricing tier structure for TIERED model */
export interface PricingTier {
  /** Minimum quantity to activate this tier */
  minQuantity: number;
  /** Price per unit at this tier */
  pricePerUnit: number;
}
