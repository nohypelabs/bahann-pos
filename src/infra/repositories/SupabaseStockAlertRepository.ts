import {
  StockAlertRepository, StockAlert, StockAlertWithJoins,
  AlertSummary, StockAlertFilters, StockData,
} from '@/domain/repositories/StockAlertRepository';
import { supabaseAdmin } from '../supabase/server';

interface StockRow {
  product_id: string;
  outlet_id: string;
  stock_akhir: number | null;
  products?: { reorder_point: number | null } | null;
}

export class SupabaseStockAlertRepository implements StockAlertRepository {
  async findActiveByOutletIds(outletIds: string[], outletId?: string): Promise<StockAlertWithJoins[]> {
    let query = supabaseAdmin
      .from('stock_alerts')
      .select('*')
      .eq('is_acknowledged', false)
      .in('outlet_id', outletIds)
      .order('created_at', { ascending: false });

    if (outletId) query = query.eq('outlet_id', outletId);

    const { data: alerts, error } = await query;
    if (error) throw new Error(`Failed to fetch stock alerts: ${error.message}`);
    if (!alerts || alerts.length === 0) return [];

    const productIds = [...new Set(alerts.map(a => a.product_id).filter(Boolean))];
    const alertOutletIds = [...new Set(alerts.map(a => a.outlet_id).filter(Boolean))];

    const [{ data: products }, { data: outlets }] = await Promise.all([
      supabaseAdmin.from('products').select('id, name, sku, category').in('id', productIds),
      supabaseAdmin.from('outlets').select('id, name, address').in('id', alertOutletIds),
    ]);

    const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
    const outletMap = Object.fromEntries((outlets || []).map(o => [o.id, o]));

    return alerts.map(alert => ({
      ...alert,
      product: productMap[alert.product_id] ?? null,
      outlet: outletMap[alert.outlet_id] ?? null,
    })) as StockAlertWithJoins[];
  }

  async acknowledge(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('stock_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(`Failed to acknowledge alert: ${error.message}`);
  }

  async acknowledgeByProduct(productId: string, outletIds: string[], outletId?: string): Promise<void> {
    let query = supabaseAdmin
      .from('stock_alerts')
      .update({ is_acknowledged: true, acknowledged_by: null, acknowledged_at: new Date().toISOString() })
      .eq('product_id', productId)
      .eq('is_acknowledged', false)
      .in('outlet_id', outletIds);

    if (outletId) query = query.eq('outlet_id', outletId);

    const { error } = await query;
    if (error) throw new Error(`Failed to acknowledge alerts: ${error.message}`);
  }

  async findByOutletIds(outletIds: string[], filters?: StockAlertFilters): Promise<{ alerts: StockAlertWithJoins[]; total: number }> {
    let query = supabaseAdmin
      .from('stock_alerts')
      .select('*, product:products (id, name, sku), outlet:outlets (id, name), acknowledged_by_user:users!acknowledged_by (id, name)', { count: 'exact' })
      .in('outlet_id', outletIds)
      .order('created_at', { ascending: false });

    if (filters?.outletId) query = query.eq('outlet_id', filters.outletId);
    if (filters?.productId) query = query.eq('product_id', filters.productId);
    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to fetch alert history: ${error.message}`);

    return { alerts: (data as StockAlertWithJoins[]) ?? [], total: count ?? 0 };
  }

  async getSummaryByOutletIds(outletIds: string[], outletId?: string): Promise<AlertSummary> {
    let query = supabaseAdmin
      .from('stock_alerts')
      .select('alert_type')
      .eq('is_acknowledged', false)
      .in('outlet_id', outletIds);

    if (outletId) query = query.eq('outlet_id', outletId);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch alert summary: ${error.message}`);

    return {
      total: data?.length ?? 0,
      outOfStock: data?.filter(a => a.alert_type === 'out_of_stock').length ?? 0,
      lowStock: data?.filter(a => a.alert_type === 'low_stock').length ?? 0,
      reorderSuggested: data?.filter(a => a.alert_type === 'reorder_suggested').length ?? 0,
    };
  }

  async insertAlerts(alerts: StockData[]): Promise<void> {
    const rows = alerts.map(a => ({
      product_id: a.product_id,
      outlet_id: a.outlet_id,
      alert_type: a.current_stock <= 0 ? 'out_of_stock' : 'low_stock',
      current_stock: a.current_stock,
      reorder_point: a.reorder_point,
    }));

    const { error } = await supabaseAdmin.from('stock_alerts').insert(rows);
    if (error) throw new Error(`Failed to insert alerts: ${error.message}`);
  }

  async findExistingUnacknowledgedKeys(): Promise<Set<string>> {
    const { data } = await supabaseAdmin
      .from('stock_alerts')
      .select('product_id, outlet_id')
      .eq('is_acknowledged', false);

    return new Set((data ?? []).map(a => `${a.product_id}:${a.outlet_id}`));
  }

  async getLatestStockForOutlets(outletIds: string[]): Promise<StockData[]> {
    const { data: stockData, error } = await supabaseAdmin
      .from('daily_stock')
      .select('product_id, outlet_id, stock_akhir, stock_date, products!inner(id, reorder_point)')
      .in('outlet_id', outletIds)
      .order('stock_date', { ascending: false });

    if (error) throw new Error(`Failed to fetch stock data: ${error.message}`);

    const latestMap = new Map<string, StockData>();
    for (const row of (stockData ?? []) as unknown as StockRow[]) {
      const key = `${row.product_id}:${row.outlet_id}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, {
          product_id: row.product_id,
          outlet_id: row.outlet_id,
          current_stock: row.stock_akhir ?? 0,
          reorder_point: row.products?.reorder_point ?? 10,
        });
      }
    }

    return Array.from(latestMap.values());
  }

  async updateReorderSettings(productId: string, updates: { reorderPoint?: number; reorderQuantity?: number; leadTimeDays?: number }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        reorder_point: updates.reorderPoint,
        reorder_quantity: updates.reorderQuantity,
        lead_time_days: updates.leadTimeDays,
      })
      .eq('id', productId);

    if (error) throw new Error(`Failed to update reorder settings: ${error.message}`);
  }

  async getProductOwnerId(productId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('products')
      .select('owner_id')
      .eq('id', productId)
      .single();

    return data?.owner_id ?? null;
  }
}
