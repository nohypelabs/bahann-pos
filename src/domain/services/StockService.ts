import type { Product } from '@/domain/entities/Product';
import { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior';
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException';

/** Result of a stock deduction attempt */
export interface DeductResult {
  /** Whether the deduction was successful (true for UNTRACKED items) */
  success: boolean;
  /** New stock level after deduction, or null for untracked items */
  newStockLevel: number | null;
}

/** Result of a stock check (without deduction) */
export interface StockCheckResult {
  /** Whether stock is sufficient for the requested quantity */
  available: boolean;
  /** Current stock level, or null for untracked items */
  currentStock: number | null;
}

/**
 * Domain service for stock deduction logic.
 * Pure functions — no side effects, no DB calls.
 * Actual DB persistence is handled by the repository layer.
 */
export const StockService = {
  /**
   * Check if stock is sufficient for a given quantity.
   * For UNTRACKED items, always returns available=true.
   */
  check(product: Product, currentStock: number | null, requestedQty: number): StockCheckResult {
    return StockService.checkBehavior(product.stockBehavior, currentStock, requestedQty);
  },

  /**
   * Same rule as check(), for callers that hold a persisted row rather than a
   * Product entity. Keeping both entry points here means the rule that decides
   * whether a sale may proceed lives in exactly one place.
   */
  checkBehavior(
    stockBehavior: StockBehavior,
    currentStock: number | null,
    requestedQty: number,
  ): StockCheckResult {
    if (stockBehavior === StockBehavior.UNTRACKED) {
      return { available: true, currentStock: null };
    }

    if (stockBehavior === StockBehavior.CONSUMED) {
      // CONSUMED items use recipe-based stock — always available at order time
      // Actual deduction happens at ingredient level
      return { available: true, currentStock: null };
    }

    // TRACKED: check actual stock
    const stock = currentStock ?? 0;
    return {
      available: stock >= requestedQty,
      currentStock: stock,
    };
  },

  /**
   * Deduct stock for a product.
   * Returns DeductResult — never throws for normal flow.
   *
   * - UNTRACKED → success=true, newStockLevel=null (bypass)
   * - CONSUMED → success=true, newStockLevel=null (recipe-based)
   * - TRACKED + sufficient → success=true, newStockLevel=current-qty
   * - TRACKED + insufficient → success=false, newStockLevel=current
   */
  deduct(product: Product, currentStock: number | null, quantity: number): DeductResult {
    return StockService.deductBehavior(product.stockBehavior, currentStock, quantity);
  },

  /** Same rule as deduct(), for callers that hold a persisted row. */
  deductBehavior(
    stockBehavior: StockBehavior,
    currentStock: number | null,
    quantity: number,
  ): DeductResult {
    if (stockBehavior === StockBehavior.UNTRACKED) {
      return { success: true, newStockLevel: null };
    }

    if (stockBehavior === StockBehavior.CONSUMED) {
      return { success: true, newStockLevel: null };
    }

    // TRACKED
    const stock = currentStock ?? 0;
    if (stock < quantity) {
      return { success: false, newStockLevel: stock };
    }

    return { success: true, newStockLevel: stock - quantity };
  },

  /**
   * Validate that a product can have stock deducted.
   * Throws DomainException if stock behavior is incompatible.
   */
  assertCanDeduct(product: Product): void {
    if (product.stockBehavior === StockBehavior.UNTRACKED) {
      throw new DomainException(
        DomainErrorCode.ITEM_UNTRACKED_NO_DEDUCT,
        `Item "${product.name}" does not track stock — deduction not applicable`,
      );
    }
  },
};
