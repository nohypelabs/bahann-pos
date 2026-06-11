import {
  PromotionRepository, Promotion, PromotionWithCreator,
  CreatePromotionData, PromotionUsageStats,
} from '@/domain/repositories/PromotionRepository';
import { supabaseAdmin } from '../supabase/server';

export class SupabasePromotionRepository implements PromotionRepository {
  async findByCodeAndOwner(code: string, ownerId: string): Promise<Promotion | null> {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .eq('owner_id', ownerId)
      .single();

    if (error || !data) return null;
    return data as Promotion;
  }

  async findByOwnerId(ownerId: string | null, filters?: { activeOnly?: boolean }): Promise<PromotionWithCreator[]> {
    let query = supabaseAdmin
      .from('promotions')
      .select('*, created_by_user:users!created_by (id, name)')
      .order('created_at', { ascending: false });

    if (ownerId) query = query.eq('created_by', ownerId);
    if (filters?.activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch promotions: ${error.message}`);
    return (data as PromotionWithCreator[]) ?? [];
  }

  async findById(id: string): Promise<PromotionWithCreator | null> {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*, created_by_user:users!created_by (id, name)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as PromotionWithCreator;
  }

  async create(data: CreatePromotionData): Promise<Promotion> {
    const { data: promo, error } = await supabaseAdmin
      .from('promotions')
      .insert({
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

  async update(id: string, data: { isActive?: boolean; endDate?: string; maxUses?: number }): Promise<Promotion> {
    const { data: promo, error } = await supabaseAdmin
      .from('promotions')
      .update({
        is_active: data.isActive,
        end_date: data.endDate,
        max_uses: data.maxUses,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update promotion: ${error.message}`);
    return promo as Promotion;
  }

  async incrementUses(id: string): Promise<void> {
    const { error: rpcError } = await supabaseAdmin.rpc('increment_promotion_uses', { promo_id: id });

    if (rpcError) {
      const { data: promo } = await supabaseAdmin
        .from('promotions')
        .select('uses_count')
        .eq('id', id)
        .single();

      if (promo) {
        await supabaseAdmin
          .from('promotions')
          .update({ uses_count: promo.uses_count + 1 })
          .eq('id', id);
      }
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
