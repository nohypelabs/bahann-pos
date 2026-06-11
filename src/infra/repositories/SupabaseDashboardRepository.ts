import { supabaseAdmin as supabase } from '../supabase/server';
import type {
  DashboardRepository,
  SalesSummary,
  SalesTrendRow,
  TopProductRow,
  LowStockItem,
  RecentTransaction,
} from '@/domain/repositories/DashboardRepository';

interface RawSalesSummary { total_revenue: string; transaction_count: string; total_items_sold: string }
interface RawSalesTrend { sale_date: string; revenue: string; items_sold: string }
interface RawTopProduct { product_id: string; product_name: string; product_sku: string; total_quantity: string; total_revenue: string }

interface RawStockRow {
  product_id: string;
  outlet_id: string;
  stock_akhir: number;
  stock_date: string;
  products: { id: string; name: string; sku: string; category: string | null } | null;
  outlets: { id: string; name: string } | null;
}

interface RawTransaction {
  id: string;
  transaction_id: string;
  outlet_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  transaction_items: {
    product_id: string;
    product_name: string;
    product_sku: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[] | null;
  outlets: { id: string; name: string } | null;
  cashier: { id: string; name: string; email: string } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: object) => Promise<{ data: any; error: unknown }>;

export class SupabaseDashboardRepository implements DashboardRepository {
  async getSalesSummary(outletIds: string[], startDate: string, endDate: string): Promise<SalesSummary> {
    const { data } = await rpc('get_sales_summary', {
      p_outlet_ids: outletIds,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    const row = (data as RawSalesSummary[] | null)?.[0];
    return {
      totalRevenue: Number(row?.total_revenue) || 0,
      transactionCount: Number(row?.transaction_count) || 0,
      totalItemsSold: Number(row?.total_items_sold) || 0,
    };
  }

  async getSalesTrend(outletIds: string[], startDate: string, endDate: string): Promise<SalesTrendRow[]> {
    const { data } = await rpc('get_sales_trend', {
      p_outlet_ids: outletIds,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    const rows = (data as RawSalesTrend[] | null) ?? [];
    return rows.map(row => ({
      saleDate: row.sale_date,
      revenue: Number(row.revenue) || 0,
      itemsSold: Number(row.items_sold) || 0,
    }));
  }

  async getTopProducts(outletIds: string[], startDate: string, endDate: string, limit: number): Promise<TopProductRow[]> {
    const { data } = await rpc('get_top_products', {
      p_outlet_ids: outletIds,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit,
    });
    const rows = (data as RawTopProduct[] | null) ?? [];
    return rows.map(row => ({
      productId: row.product_id,
      productName: row.product_name || 'Unknown',
      productSku: row.product_sku || 'N/A',
      totalQuantity: Number(row.total_quantity) || 0,
      totalRevenue: Number(row.total_revenue) || 0,
    }));
  }

  async getLowStock(outletIds: string[], threshold: number): Promise<LowStockItem[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_stock')
      .select(`
        product_id,
        outlet_id,
        stock_akhir,
        stock_date,
        products!inner(id, name, sku, category),
        outlets!inner(id, name)
      `)
      .eq('stock_date', today)
      .lt('stock_akhir', threshold)
      .in('outlet_id', outletIds)
      .order('stock_akhir', { ascending: true });

    if (!data || data.length === 0) return [];

    return (data as unknown as RawStockRow[]).map(stock => ({
      productId: stock.product_id,
      productName: stock.products?.name || 'Unknown',
      productSku: stock.products?.sku || 'N/A',
      productCategory: stock.products?.category || null,
      outletId: stock.outlet_id,
      outletName: stock.outlets?.name || 'Unknown',
      currentStock: stock.stock_akhir,
      date: stock.stock_date,
    }));
  }

  async getRecentTransactions(outletIds: string[], limit: number): Promise<RecentTransaction[]> {
    const { data } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_id,
        outlet_id,
        status,
        total_amount,
        created_at,
        transaction_items (
          product_id,
          product_name,
          product_sku,
          quantity,
          unit_price,
          line_total
        ),
        outlets!inner(id, name),
        cashier:users!cashier_id(id, name, email)
      `)
      .in('outlet_id', outletIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data || data.length === 0) return [];

    const flat: RecentTransaction[] = [];

    for (const tx of data as unknown as RawTransaction[]) {
      if (tx.transaction_items && tx.transaction_items.length > 0) {
        for (const item of tx.transaction_items) {
          flat.push({
            id: `${tx.id}-${item.product_id}`,
            transactionId: tx.transaction_id,
            productName: item.product_name,
            productSku: item.product_sku || 'N/A',
            outletName: tx.outlets?.name || 'Unknown',
            cashierName: tx.cashier?.name || 'Unknown',
            date: tx.created_at,
            quantity: item.quantity,
            revenue: item.line_total,
            status: tx.status,
            totalAmount: tx.total_amount,
            createdAt: tx.created_at,
          });
        }
      } else {
        flat.push({
          id: tx.id,
          transactionId: tx.transaction_id,
          productName: 'No items',
          productSku: 'N/A',
          outletName: tx.outlets?.name || 'Unknown',
          cashierName: tx.cashier?.name || 'Unknown',
          date: tx.created_at,
          quantity: 0,
          revenue: 0,
          status: tx.status,
          totalAmount: tx.total_amount,
          createdAt: tx.created_at,
        });
      }
    }

    return flat;
  }

  async getProductCount(ownerId: string): Promise<number> {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);
    return count || 0;
  }

  async getOutletCount(ownerId: string): Promise<number> {
    const { count } = await supabase
      .from('outlets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);
    return count || 0;
  }
}
