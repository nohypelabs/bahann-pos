/**
 * Domain-specific exception with machine-readable error codes.
 * Use for business rule violations (invariant enforcement).
 *
 * In tRPC routers, catch DomainException and map to TRPCError(BAD_REQUEST).
 */
export class DomainException extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    Object.setPrototypeOf(this, DomainException.prototype);
  }
}

/** Machine-readable domain error codes */
export const DomainErrorCode = {
  // Stock errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  ITEM_UNTRACKED_NO_DEDUCT: 'ITEM_UNTRACKED_NO_DEDUCT',
  ITEM_CONSUMED_NO_RECIPE: 'ITEM_CONSUMED_NO_RECIPE',

  // Validation errors
  INVALID_ITEM_TYPE_STOCK_COMBO: 'INVALID_ITEM_TYPE_STOCK_COMBO',
  INVALID_ITEM_TYPE_PRICING_COMBO: 'INVALID_ITEM_TYPE_PRICING_COMBO',
  INVALID_STOCK_BEHAVIOR: 'INVALID_STOCK_BEHAVIOR',
  MISSING_PRICING_TIERS: 'MISSING_PRICING_TIERS',
  MISSING_DURATION: 'MISSING_DURATION',
  INVALID_PRICE: 'INVALID_PRICE',

  // Business profile
  BUSINESS_PROFILE_NOT_FOUND: 'BUSINESS_PROFILE_NOT_FOUND',
  BUSINESS_PROFILE_ALREADY_EXISTS: 'BUSINESS_PROFILE_ALREADY_EXISTS',

  // Item
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  ITEM_TYPE_MISMATCH: 'ITEM_TYPE_MISMATCH',
} as const;

export type DomainErrorCode = (typeof DomainErrorCode)[keyof typeof DomainErrorCode];

/**
 * Map DomainErrorCode to user-friendly Indonesian message.
 * For i18n, use the code as key and look up in locale files.
 */
export const DOMAIN_ERROR_MESSAGES_ID: Record<DomainErrorCode, string> = {
  INSUFFICIENT_STOCK: 'Stok tidak mencukupi',
  ITEM_UNTRACKED_NO_DEDUCT: 'Item ini tidak memiliki stok yang perlu dikurangi',
  ITEM_CONSUMED_NO_RECIPE: 'Item ini memerlukan resep untuk mengurangi bahan baku',
  INVALID_ITEM_TYPE_STOCK_COMBO: 'Kombinasi tipe item dan perilaku stok tidak valid',
  INVALID_ITEM_TYPE_PRICING_COMBO: 'Kombinasi tipe item dan model harga tidak valid',
  INVALID_STOCK_BEHAVIOR: 'Perilaku stok tidak valid',
  MISSING_PRICING_TIERS: 'Harga tier wajib diisi untuk model harga grosir',
  MISSING_DURATION: 'Durasi wajib diisi untuk model harga per waktu',
  INVALID_PRICE: 'Harga produk belum diatur',
  BUSINESS_PROFILE_NOT_FOUND: 'Profil bisnis tidak ditemukan',
  BUSINESS_PROFILE_ALREADY_EXISTS: 'Profil bisnis sudah ada',
  ITEM_NOT_FOUND: 'Item tidak ditemukan',
  ITEM_TYPE_MISMATCH: 'Tipe item tidak sesuai',
};

export const DOMAIN_ERROR_MESSAGES_EN: Record<DomainErrorCode, string> = {
  INSUFFICIENT_STOCK: 'Insufficient stock',
  ITEM_UNTRACKED_NO_DEDUCT: 'This item has no stock to deduct',
  ITEM_CONSUMED_NO_RECIPE: 'This item requires a recipe to deduct ingredients',
  INVALID_ITEM_TYPE_STOCK_COMBO: 'Invalid item type and stock behavior combination',
  INVALID_ITEM_TYPE_PRICING_COMBO: 'Invalid item type and pricing model combination',
  INVALID_STOCK_BEHAVIOR: 'Invalid stock behavior',
  MISSING_PRICING_TIERS: 'Pricing tiers are required for tiered pricing model',
  MISSING_DURATION: 'Duration is required for time-based pricing model',
  INVALID_PRICE: 'Product price is not set',
  BUSINESS_PROFILE_NOT_FOUND: 'Business profile not found',
  BUSINESS_PROFILE_ALREADY_EXISTS: 'Business profile already exists',
  ITEM_NOT_FOUND: 'Item not found',
  ITEM_TYPE_MISMATCH: 'Item type mismatch',
};
