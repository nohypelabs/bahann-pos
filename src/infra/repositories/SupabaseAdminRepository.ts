import { AdminRepository } from '@/domain/repositories/AdminRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabaseAdminRepository implements AdminRepository {
  async getTenantOutletIds(ownerId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('outlets')
      .select('id')
      .eq('owner_id', ownerId);
    return data?.map(o => o.id) ?? [];
  }

  async getTenantUserIds(outletIds: string[], ownerId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('outlet_id', outletIds);
    return [...(data?.map(u => u.id) ?? []), ownerId];
  }

  async getTenantProductIds(ownerId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('owner_id', ownerId);
    return data?.map(p => p.id) ?? [];
  }

  async getTenantTransactionIds(outletIds: string[]): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .in('outlet_id', outletIds);
    return data?.map(t => t.id) ?? [];
  }

  async deleteAuditLogs(userIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('user_id', userIds);
    await supabaseAdmin.from('audit_logs').delete().in('user_id', userIds);
    return count ?? 0;
  }

  async deleteStockAlerts(outletIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('stock_alerts')
      .select('*', { count: 'exact', head: true })
      .in('outlet_id', outletIds);
    await supabaseAdmin.from('stock_alerts').delete().in('outlet_id', outletIds);
    return count ?? 0;
  }

  async deleteCashSessions(outletIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('cash_sessions')
      .select('*', { count: 'exact', head: true })
      .in('outlet_id', outletIds);
    await supabaseAdmin.from('cash_sessions').delete().in('outlet_id', outletIds);
    return count ?? 0;
  }

  async deleteTransactionItems(txIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('transaction_items')
      .select('*', { count: 'exact', head: true })
      .in('transaction_id', txIds);
    await supabaseAdmin.from('transaction_items').delete().in('transaction_id', txIds);
    return count ?? 0;
  }

  async deleteTransactions(outletIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .in('outlet_id', outletIds);
    await supabaseAdmin.from('transactions').delete().in('outlet_id', outletIds);
    return count ?? 0;
  }

  async deleteDailySales(outletIds: string[]): Promise<number> {
    try {
      const { count } = await supabaseAdmin
        .from('daily_sales')
        .select('*', { count: 'exact', head: true })
        .in('outlet_id', outletIds);
      if (count) {
        await supabaseAdmin.from('daily_sales').delete().in('outlet_id', outletIds);
      }
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  async deleteDailyStock(outletIds: string[]): Promise<number> {
    const { count } = await supabaseAdmin
      .from('daily_stock')
      .select('*', { count: 'exact', head: true })
      .in('outlet_id', outletIds);
    await supabaseAdmin.from('daily_stock').delete().in('outlet_id', outletIds);
    return count ?? 0;
  }

  async deletePromotions(ownerId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('promotions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', ownerId);
    await supabaseAdmin.from('promotions').delete().eq('created_by', ownerId);
    return count ?? 0;
  }

  async deleteProducts(ownerId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);
    if (error) throw new Error(`Failed to delete products: ${error.message}`);
    await supabaseAdmin.from('products').delete().eq('owner_id', ownerId);
    return count ?? 0;
  }

  async deleteOutlets(ownerId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('outlets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);
    await supabaseAdmin.from('outlets').delete().eq('owner_id', ownerId);
    return count ?? 0;
  }
}
