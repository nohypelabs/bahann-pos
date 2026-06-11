export interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
  product?: { id: string; name: string; sku: string } | null;
  outlet?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string } | null;
}

export interface StockMovementFilters {
  outletId?: string;
  productId?: string;
  outletIds?: string[];
  limit?: number;
  offset?: number;
}

export interface StockMovementRepository {
  insert(movement: {
    product_id: string;
    outlet_id: string;
    user_id: string;
    movement_type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason?: string | null;
  }): Promise<void>;
  list(filters: StockMovementFilters): Promise<{ data: StockMovement[]; total: number }>;
}
