import { supabaseAdmin as supabase } from '../supabase/server';
import { type Tables, type TablesInsert } from '../database.types';
import { DailySale } from '@/domain/entities/DailySale';
import { DailySaleRepository } from '@/domain/repositories/DailySaleRepository';

type DailySaleRow = Tables<'daily_sales'>;

export class SupabaseDailySaleRepository implements DailySaleRepository {
  async save(sale: DailySale): Promise<void> {
    const row: TablesInsert<'daily_sales'> = {
      id: sale.id,
      product_id: sale.productId,
      outlet_id: sale.outletId,
      sale_date: sale.saleDate.toISOString().split('T')[0],
      quantity_sold: sale.quantitySold,
      revenue: sale.revenue,
    };

    const { error } = await supabase.from('daily_sales').insert(row);
    if (error) throw new Error(`Supabase insert error: ${error.message}`);
  }

  async getByDateRange(outletId: string, start: Date, end: Date): Promise<DailySale[]> {
    const { data, error } = await supabase
      .from('daily_sales')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('sale_date', start.toISOString().split('T')[0])
      .lte('sale_date', end.toISOString().split('T')[0])
      .order('sale_date', { ascending: true });

    if (error) throw new Error(`Supabase query error: ${error.message}`);

    return data.map((row) => ({
      id: row.id,
      productId: row.product_id!,
      outletId: row.outlet_id!,
      saleDate: new Date(row.sale_date),
      quantitySold: row.quantity_sold,
      revenue: row.revenue ?? 0,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    }));
  }
}
