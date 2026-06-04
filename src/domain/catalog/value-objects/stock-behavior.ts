/**
 * Stock tracking behavior for catalog items.
 * Controls how (and whether) stock is deducted during transactions.
 */
export const StockBehavior = {
  /** Potong stok kaku per transaksi — perilaku retail standar */
  TRACKED: 'TRACKED',
  /** Abaikan pengecekan stok — untuk service & menu standar */
  UNTRACKED: 'UNTRACKED',
  /** Mengurangi stok bahan baku via resep — advanced FNB */
  CONSUMED: 'CONSUMED',
} as const;

export type StockBehavior = (typeof StockBehavior)[keyof typeof StockBehavior];

/** Ordered list for UI selectors */
export const STOCK_BEHAVIORS = Object.values(StockBehavior);

/** Human-readable labels (Indonesian) */
export const STOCK_BEHAVIOR_LABELS: Record<StockBehavior, string> = {
  [StockBehavior.TRACKED]: 'Stok Terlacak',
  [StockBehavior.UNTRACKED]: 'Tanpa Stok',
  [StockBehavior.CONSUMED]: 'Stok Bahan Baku (Resep)',
};

/** Human-readable labels (English) */
export const STOCK_BEHAVIOR_LABELS_EN: Record<StockBehavior, string> = {
  [StockBehavior.TRACKED]: 'Tracked Stock',
  [StockBehavior.UNTRACKED]: 'No Stock Tracking',
  [StockBehavior.CONSUMED]: 'Recipe-Based Stock',
};
