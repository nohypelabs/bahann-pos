import { supabaseAdmin as supabase } from '../supabase/server';
import {
  type StockMovementRepository,
  type StockMovement,
  type StockMovementFilters,
} from '@/domain/repositories/StockMovementRepository';

export class SupabaseStockMovementRepository implements StockMovementRepository {
  async insert(movement: {
    product_id: string;
    outlet_id: string;
    user_id: string;
    movement_type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason?: string | null;
  }): Promise<void> {
    const { error } = await supabase.from('stock_movements').insert({
      product_id: movement.product_id,
      outlet_id: movement.outlet_id,
      user_id: movement.user_id,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      previous_stock: movement.previous_stock,
      new_stock: movement.new_stock,
      reason: movement.reason || null,
    });

    if (error) throw new Error(`Failed to insert stock movement: ${error.message}`);
  }

  async list(filters: StockMovementFilters): Promise<{ data: StockMovement[]; total: number }> {
    let query = supabase
      .from('stock_movements')
      .select(`
        id, movement_type, quantity, previous_stock, new_stock, reason, created_at,
        product:products(id, name, sku),
        outlet:outlets(id, name),
        user:users(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 50)
      .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

    if (filters.outletId) query = query.eq('outlet_id', filters.outletId);
    if (filters.productId) query = query.eq('product_id', filters.productId);

    if (filters.outletIds && filters.outletIds.length > 0) {
      query = query.in('outlet_id', filters.outletIds);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to fetch movements: ${error.message}`);

    return {
      data: (data || []) as unknown as StockMovement[],
      total: count || 0,
    };
  }
}
