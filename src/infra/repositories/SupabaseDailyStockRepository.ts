import { supabaseAdmin as supabase } from '../supabase/server';
import { type Tables, type TablesInsert } from '../database.types';
import { DailyStock } from '@/domain/entities/DailyStock';
import { DailyStockRepository } from '@/domain/repositories/DailyStockRepository';

type DailyStockRow = Tables<'daily_stock'>;

export class SupabaseDailyStockRepository implements DailyStockRepository {
  async save(stock: DailyStock): Promise<void> {
    const row: TablesInsert<'daily_stock'> = {
      id: stock.id,
      product_id: stock.productId,
      outlet_id: stock.outletId,
      stock_date: stock.stockDate.toISOString().split('T')[0],
      stock_awal: stock.stockAwal,
      stock_in: stock.stockIn,
      stock_out: stock.stockOut,
      stock_akhir: stock.stockAkhir,
    };

    const { error } = await supabase.from('daily_stock').insert(row);
    if (error) throw new Error(`Supabase insert error: ${error.message}`);
  }

  async getLatestByProduct(outletId: string, productId: string): Promise<DailyStock | null> {
    const { data, error } = await supabase
      .from('daily_stock')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('product_id', productId)
      .order('stock_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      productId: data.product_id!,
      outletId: data.outlet_id!,
      stockDate: new Date(data.stock_date),
      stockAwal: data.stock_awal ?? 0,
      stockIn: data.stock_in ?? 0,
      stockOut: data.stock_out ?? 0,
      stockAkhir: data.stock_akhir ?? 0,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
  }

  async getByDate(outletId: string, productId: string, date: Date): Promise<DailyStock | null> {
    const { data, error } = await supabase
      .from('daily_stock')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('product_id', productId)
      .eq('stock_date', date.toISOString().split('T')[0])
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      productId: data.product_id!,
      outletId: data.outlet_id!,
      stockDate: new Date(data.stock_date),
      stockAwal: data.stock_awal ?? 0,
      stockIn: data.stock_in ?? 0,
      stockOut: data.stock_out ?? 0,
      stockAkhir: data.stock_akhir ?? 0,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
  }
}
