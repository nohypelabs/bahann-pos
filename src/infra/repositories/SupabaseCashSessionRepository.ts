import {
  CashSessionRepository, CashSession, CashSessionWithJoins,
  Transaction, CloseSessionData, SalesSummary, CashSessionFilters,
} from '@/domain/repositories/CashSessionRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabaseCashSessionRepository implements CashSessionRepository {
  async findOpenByOutletId(outletId: string): Promise<CashSessionWithJoins | null> {
    const { data } = await supabaseAdmin
      .from('cash_sessions')
      .select('*, outlet:outlets (id, name, address), opened_by_user:users!opened_by (id, name)')
      .eq('outlet_id', outletId)
      .eq('status', 'open')
      .maybeSingle();

    return (data as CashSessionWithJoins) ?? null;
  }

  async create(data: { outletId: string; openedBy: string; openingCash: number }): Promise<CashSession> {
    const { data: session, error } = await supabaseAdmin
      .from('cash_sessions')
      .insert({
        outlet_id: data.outletId,
        opened_by: data.openedBy,
        opened_at: new Date().toISOString(),
        opening_cash: data.openingCash,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to open cash session: ${error.message}`);
    return session as CashSession;
  }

  async findById(id: string): Promise<CashSession | null> {
    const { data, error } = await supabaseAdmin
      .from('cash_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as CashSession;
  }

  async findWithJoins(id: string): Promise<CashSessionWithJoins | null> {
    const { data, error } = await supabaseAdmin
      .from('cash_sessions')
      .select(`
        *,
        outlet:outlets (id, name, address),
        opened_by_user:users!opened_by (id, name),
        closed_by_user:users!closed_by (id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as CashSessionWithJoins;
  }

  async close(id: string, data: CloseSessionData & SalesSummary & { expectedCash: number; actualCash: number; difference: number }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('cash_sessions')
      .update({
        closed_by: data.closedBy,
        closed_at: new Date().toISOString(),
        closing_cash: data.closingCash,
        expected_cash: data.expectedCash,
        actual_cash: data.actualCash,
        difference: data.difference,
        total_sales: data.totalSales,
        total_transactions: data.totalTransactions,
        cash_sales: data.cashSales,
        card_sales: data.cardSales,
        transfer_sales: data.transferSales,
        ewallet_sales: data.ewalletSales,
        total_discount: data.totalDiscount,
        notes: data.notes,
        status: 'closed',
      })
      .eq('id', id);

    if (error) throw new Error(`Failed to close session: ${error.message}`);
  }

  async findByOutletIds(outletIds: string[], filters?: CashSessionFilters): Promise<{ sessions: CashSessionWithJoins[]; total: number }> {
    let query = supabaseAdmin
      .from('cash_sessions')
      .select('*, outlet:outlets (id, name), opened_by_user:users!opened_by (id, name)', { count: 'estimated' })
      .in('outlet_id', outletIds)
      .order('opened_at', { ascending: false });

    if (filters?.outletId) query = query.eq('outlet_id', filters.outletId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dateFrom) query = query.gte('opened_at', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('opened_at', filters.dateTo);

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to fetch cash sessions: ${error.message}`);

    return { sessions: (data as CashSessionWithJoins[]) ?? [], total: count ?? 0 };
  }

  async getTransactionsForPeriod(outletId: string, openedAt: string, closedAt?: string): Promise<Transaction[]> {
    let query = supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('status', 'completed')
      .gte('created_at', openedAt);

    if (closedAt) {
      query = query.lte('created_at', closedAt);
    } else {
      query = query.lte('created_at', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
    return (data as Transaction[]) ?? [];
  }
}
