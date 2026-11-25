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

  // Workshop
  INVALID_PLATE: 'INVALID_PLATE',
  INVALID_PHONE: 'INVALID_PHONE',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  NOT_A_MEMBER: 'NOT_A_MEMBER',
  VEHICLE_NOT_FOUND: 'VEHICLE_NOT_FOUND',
  MECHANIC_NOT_FOUND: 'MECHANIC_NOT_FOUND',
  VEHICLE_HAS_OPEN_NOTE: 'VEHICLE_HAS_OPEN_NOTE',
  SERVICE_ORDER_NOT_FOUND: 'SERVICE_ORDER_NOT_FOUND',
  SERVICE_ORDER_NOT_OPEN: 'SERVICE_ORDER_NOT_OPEN',
  CANCEL_REASON_REQUIRED: 'CANCEL_REASON_REQUIRED',
  INVALID_LOYALTY_CONFIG: 'INVALID_LOYALTY_CONFIG',
  VOUCHER_NOT_FOUND: 'VOUCHER_NOT_FOUND',
  VOUCHER_NOT_AVAILABLE: 'VOUCHER_NOT_AVAILABLE',
  VOUCHER_EXPIRED: 'VOUCHER_EXPIRED',
  VOUCHER_OTHER_CUSTOMER: 'VOUCHER_OTHER_CUSTOMER',
  VOUCHER_NEEDS_SERVICE: 'VOUCHER_NEEDS_SERVICE',

  // Manual discounts
  DISCOUNT_REASON_REQUIRED: 'DISCOUNT_REASON_REQUIRED',
  DISCOUNT_NOTE_REQUIRED: 'DISCOUNT_NOTE_REQUIRED',
  DISCOUNT_TOO_LARGE: 'DISCOUNT_TOO_LARGE',
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
  INVALID_PLATE: 'Nomor polisi tidak valid',
  INVALID_PHONE: 'Nomor HP tidak valid',
  CUSTOMER_NOT_FOUND: 'Pelanggan tidak ditemukan',
  ALREADY_MEMBER: 'Pelanggan ini sudah menjadi member',
  NOT_A_MEMBER: 'Fitur ini khusus untuk member',
  VEHICLE_NOT_FOUND: 'Kendaraan tidak ditemukan',
  MECHANIC_NOT_FOUND: 'Mekanik tidak ditemukan',
  VEHICLE_HAS_OPEN_NOTE: 'Kendaraan ini masih punya nota terbuka',
  SERVICE_ORDER_NOT_FOUND: 'Nota servis tidak ditemukan',
  SERVICE_ORDER_NOT_OPEN: 'Nota servis sudah dibayar atau dibatalkan',
  CANCEL_REASON_REQUIRED: 'Alasan pembatalan wajib diisi',
  INVALID_LOYALTY_CONFIG: 'Pengaturan program loyalitas tidak valid',
  VOUCHER_NOT_FOUND: 'Voucher tidak ditemukan',
  VOUCHER_NOT_AVAILABLE: 'Voucher sudah dipakai atau dibatalkan',
  VOUCHER_EXPIRED: 'Voucher sudah kedaluwarsa',
  VOUCHER_OTHER_CUSTOMER: 'Voucher ini milik pelanggan lain',
  VOUCHER_NEEDS_SERVICE: 'Voucher servis gratis butuh minimal satu jasa servis di nota',
  DISCOUNT_REASON_REQUIRED: 'Pilih alasan diskon',
  DISCOUNT_NOTE_REQUIRED: 'Tulis keterangan alasan diskon',
  DISCOUNT_TOO_LARGE: 'Diskon melebihi total yang harus dibayar',
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
  INVALID_PLATE: 'Invalid plate number',
  INVALID_PHONE: 'Invalid phone number',
  CUSTOMER_NOT_FOUND: 'Customer not found',
  ALREADY_MEMBER: 'This customer is already a member',
  NOT_A_MEMBER: 'This is for members only',
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  MECHANIC_NOT_FOUND: 'Mechanic not found',
  VEHICLE_HAS_OPEN_NOTE: 'This vehicle already has an open service note',
  SERVICE_ORDER_NOT_FOUND: 'Service note not found',
  SERVICE_ORDER_NOT_OPEN: 'Service note is already paid or cancelled',
  CANCEL_REASON_REQUIRED: 'A cancellation reason is required',
  INVALID_LOYALTY_CONFIG: 'Invalid loyalty program settings',
  VOUCHER_NOT_FOUND: 'Voucher not found',
  VOUCHER_NOT_AVAILABLE: 'Voucher already used or void',
  VOUCHER_EXPIRED: 'Voucher has expired',
  VOUCHER_OTHER_CUSTOMER: 'This voucher belongs to another customer',
  VOUCHER_NEEDS_SERVICE: 'A free-service voucher needs at least one labour line',
  DISCOUNT_REASON_REQUIRED: 'Choose a reason for the discount',
  DISCOUNT_NOTE_REQUIRED: 'Describe the reason for the discount',
  DISCOUNT_TOO_LARGE: 'The discount is larger than the amount due',
};
