import { supabaseAdmin as supabase } from '../supabase/server';
import { type Tables, type TablesInsert } from '../database.types';
import { DailyStock } from '@/domain/entities/DailyStock';
import { DailyStockRepository, type DailyStockWithOutlet } from '@/domain/repositories/DailyStockRepository';

type DailyStockRow = Tables<'daily_stock'>;

export class SupabaseDailyStockRepository implements DailyStockRepository {
  async save(stock: DailyStock): Promise<void> {
    const row: TablesInsert<'daily_stock'> = {
      id: stock.id,
      tenant_id: stock.tenantId,
      product_id: stock.productId,
      outlet_id: stock.outletId,
      stock_date: stock.stockDate.toISOString().split('T')[0],
      stock_awal: stock.stockAwal,
      stock_in: stock.stockIn,
      stock_out: stock.stockOut,
      stock_akhir: stock.stockAkhir,
    };

    const { error } = await supabase
      .from('daily_stock')
      .upsert(row, { onConflict: 'product_id,outlet_id,stock_date' });
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
      tenantId: data.tenant_id!,
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

  async getStockByProduct(productId: string, outletId?: string): Promise<DailyStockWithOutlet[]> {
    let query = supabase
      .from('daily_stock')
      .select('*, outlets(name)')
      .eq('product_id', productId);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id!,
      productId: row.product_id!,
      outletId: row.outlet_id!,
      stockDate: new Date(row.stock_date),
      stockAwal: row.stock_awal ?? 0,
      stockIn: row.stock_in ?? 0,
      stockOut: row.stock_out ?? 0,
      stockAkhir: row.stock_akhir ?? 0,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      outletName: (row.outlets as unknown as { name: string })?.name,
    }));
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
      tenantId: data.tenant_id!,
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
