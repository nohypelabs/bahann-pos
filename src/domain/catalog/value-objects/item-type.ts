/**
 * Item type classification within a business catalog.
 * Determines how an item behaves in stock tracking and pricing.
 */
export const ItemType = {
  /** Barang fisik dengan SKU — stok terlacak */
  PRODUCT: 'PRODUCT',
  /** Makanan / minuman — bahan baku atau untracked */
  MENU: 'MENU',
  /** Jasa / layanan — tanpa stok */
  SERVICE: 'SERVICE',
  /** Bundling produk/menu/jasa */
  PACKAGE: 'PACKAGE',
} as const;

export type ItemType = (typeof ItemType)[keyof typeof ItemType];

/** Ordered list for UI selectors */
export const ITEM_TYPES = Object.values(ItemType);

/** Human-readable labels (Indonesian) */
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  [ItemType.PRODUCT]: 'Produk Fisik',
  [ItemType.MENU]: 'Menu / Makanan',
  [ItemType.SERVICE]: 'Jasa / Layanan',
  [ItemType.PACKAGE]: 'Paket / Bundle',
};

/** Human-readable labels (English) */
export const ITEM_TYPE_LABELS_EN: Record<ItemType, string> = {
  [ItemType.PRODUCT]: 'Physical Product',
  [ItemType.MENU]: 'Menu / Food',
  [ItemType.SERVICE]: 'Service',
  [ItemType.PACKAGE]: 'Package / Bundle',
};
