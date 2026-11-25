import {
  PromotionRepository, Promotion, PromotionWithCreator,
  CreatePromotionData, PromotionUsageStats,
} from '@/domain/repositories/PromotionRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabasePromotionRepository implements PromotionRepository {
  async findByCode(code: string, tenantId: string): Promise<Promotion | null> {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return data as Promotion;
  }

  async findByTenant(tenantId: string, filters?: { activeOnly?: boolean }): Promise<PromotionWithCreator[]> {
    let query = supabaseAdmin
      .from('promotions')
      .select('*, created_by_user:users!created_by (id, name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch promotions: ${error.message}`);
    return (data as PromotionWithCreator[]) ?? [];
  }

  async findById(id: string, tenantId: string): Promise<PromotionWithCreator | null> {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*, created_by_user:users!created_by (id, name)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return data as PromotionWithCreator;
  }

  async create(tenantId: string, data: CreatePromotionData): Promise<Promotion> {
    const { data: promo, error } = await supabaseAdmin
      .from('promotions')
      .insert({
        tenant_id: tenantId,
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        type: data.type,
        discount_amount: data.discountAmount,
        discount_percentage: data.discountPercentage,
        min_purchase: data.minPurchase,
        max_discount: data.maxDiscount,
        start_date: data.startDate,
        end_date: data.endDate,
        max_uses: data.maxUses,
        max_uses_per_customer: data.maxUsesPerCustomer,
        created_by: data.createdBy,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create promotion: ${error.message}`);
    return promo as Promotion;
  }

  async update(id: string, tenantId: string, data: { isActive?: boolean; endDate?: string; maxUses?: number }): Promise<Promotion | null> {
    const { data: promo, error } = await supabaseAdmin
      .from('promotions')
      .update({
        is_active: data.isActive,
        end_date: data.endDate,
        max_uses: data.maxUses,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to update promotion: ${error.message}`);
    return (promo as Promotion | null) ?? null;
  }

  async incrementUses(id: string, tenantId: string): Promise<void> {
    const { data: promo } = await supabaseAdmin
      .from('promotions')
      .select('uses_count')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (promo) {
      await supabaseAdmin
        .from('promotions')
        .update({ uses_count: (promo.uses_count ?? 0) + 1 })
        .eq('id', id)
        .eq('tenant_id', tenantId);
    }
  }

  async countUsageByUser(promotionId: string, userId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('promotion_usage')
      .select('*', { count: 'estimated', head: true })
      .eq('promotion_id', promotionId)
      .eq('user_id', userId);

    return count ?? 0;
  }

  async recordUsage(data: { promotionId: string; transactionId: string; userId?: string; discountApplied: number }): Promise<void> {
    const { error } = await supabaseAdmin.from('promotion_usage').insert({
      promotion_id: data.promotionId,
      transaction_id: data.transactionId,
      user_id: data.userId,
      discount_applied: data.discountApplied,
    });

    if (error) throw new Error(`Failed to record promotion usage: ${error.message}`);
  }

  async getUsageStats(promotionId: string): Promise<PromotionUsageStats> {
    const { data: usage, error } = await supabaseAdmin
      .from('promotion_usage')
      .select('*, transactions (total_amount, created_at)')
      .eq('promotion_id', promotionId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch usage stats: ${error.message}`);

    const items = usage ?? [];
    const totalDiscount = items.reduce((sum, u) => sum + u.discount_applied, 0);
    const totalRevenue = items.reduce(
      (sum, u) => sum + (u.transactions?.total_amount || 0),
      0,
    );

    return {
      usage: items as PromotionUsageStats['usage'],
      totalUses: items.length,
      totalDiscount,
      totalRevenue,
    };
  }
}
