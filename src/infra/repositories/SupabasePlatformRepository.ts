import { supabaseAdmin as supabase } from '../supabase/server';
import { TRPCError } from '@trpc/server';
import type {
  PlatformRepository,
  GlobalStats,
  TenantListParams,
  TenantSummary,
  TenantDetail,
  GrowthEntry,
} from '@/domain/repositories/PlatformRepository';

export class SupabasePlatformRepository implements PlatformRepository {
  async getGlobalStats(): Promise<GlobalStats> {
    const [
      { count: totalTenants },
      { count: totalUsers },
      { count: totalOutlets },
      { count: totalProducts },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('outlets').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
    ]);

    const { count: suspendedTenants } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_suspended', true);

    const { data: planData } = await supabase
      .from('users')
      .select('plan')
      .eq('role', 'admin');

    const planDistribution: Record<string, number> = {};
    planData?.forEach(u => {
      const p = u.plan || 'free';
      planDistribution[p] = (planDistribution[p] || 0) + 1;
    });

    const { data: billingData } = await supabase
      .from('billing_history')
      .select('amount');

    const totalRevenue = billingData?.reduce((sum, b) => sum + (b.amount || 0), 0) ?? 0;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count: newThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .gte('created_at', monthStart.toISOString());

    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    return {
      totalTenants: totalTenants || 0,
      totalUsers: totalUsers || 0,
      totalOutlets: totalOutlets || 0,
      totalProducts: totalProducts || 0,
      suspendedTenants: suspendedTenants || 0,
      totalRevenue,
      newTenantsThisMonth: newThisMonth || 0,
      totalTransactions: totalTransactions || 0,
      planDistribution,
    };
  }

  async listTenants(params: TenantListParams): Promise<{ tenants: TenantSummary[]; total: number }> {
    let query = supabase
      .from('users')
      .select('id, email, name, plan, is_trial, is_suspended, created_at, email_verified_at', { count: 'exact' })
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (params.search) {
      query = query.or(`email.ilike.%${params.search}%,name.ilike.%${params.search}%`);
    }
    if (params.plan) {
      query = query.eq('plan', params.plan);
    }
    if (params.suspended !== undefined) {
      query = query.eq('is_suspended', params.suspended);
    }

    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, count, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    const tenantIds = data?.map(t => t.id) ?? [];
    if (tenantIds.length === 0) return { tenants: [], total: 0 };

    const [{ data: outletCounts }, { data: userCounts }] = await Promise.all([
      supabase.from('outlets').select('owner_id').in('owner_id', tenantIds),
      supabase.from('users').select('outlet_id, outlets!inner(owner_id)').in('outlet_id',
        (await supabase.from('outlets').select('id').in('owner_id', tenantIds)).data?.map(o => o.id) ?? []
      ),
    ]);

    const outletCountMap: Record<string, number> = {};
    outletCounts?.forEach(o => {
      outletCountMap[o.owner_id] = (outletCountMap[o.owner_id] || 0) + 1;
    });

    const userCountMap: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userCounts?.forEach((u: any) => {
      const ownerId = u.outlets?.owner_id;
      if (ownerId) userCountMap[ownerId] = (userCountMap[ownerId] || 0) + 1;
    });

    const tenants: TenantSummary[] = data?.map(t => ({
      id: t.id,
      email: t.email,
      name: t.name,
      plan: t.plan,
      is_trial: t.is_trial,
      is_suspended: t.is_suspended,
      created_at: t.created_at,
      email_verified_at: t.email_verified_at,
      outletCount: outletCountMap[t.id] || 0,
      userCount: (userCountMap[t.id] || 0) + 1,
    })) ?? [];

    return { tenants, total: count || 0 };
  }

  async getTenantDetail(tenantId: string): Promise<TenantDetail> {
    const { data: tenant, error } = await supabase
      .from('users')
      .select('id, email, name, plan, is_trial, is_suspended, created_at, email_verified_at, whatsapp_number')
      .eq('id', tenantId)
      .eq('role', 'admin')
      .single();

    if (error || !tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });

    const { data: outlets } = await supabase
      .from('outlets')
      .select('id, name, address, created_at')
      .eq('owner_id', tenantId)
      .order('created_at', { ascending: true });

    const outletIds = outlets?.map(o => o.id) ?? [];

    const { data: users } = outletIds.length > 0
      ? await supabase
          .from('users')
          .select('id, name, email, role, created_at')
          .in('outlet_id', outletIds)
          .order('created_at', { ascending: false })
      : { data: [] };

    let transactionCount = 0;
    let totalRevenue = 0;
    if (outletIds.length > 0) {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .in('outlet_id', outletIds);
      transactionCount = count || 0;

      const { data: txData } = await supabase
        .from('transactions')
        .select('total_amount')
        .in('outlet_id', outletIds)
        .eq('status', 'completed');
      totalRevenue = txData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) ?? 0;
    }

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', tenantId);

    const { data: billing } = await supabase
      .from('billing_history')
      .select('id, plan, previous_plan, amount, note, is_trial, created_at')
      .eq('user_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      id: tenant.id,
      email: tenant.email,
      name: tenant.name,
      plan: tenant.plan,
      is_trial: tenant.is_trial,
      is_suspended: tenant.is_suspended,
      created_at: tenant.created_at,
      email_verified_at: tenant.email_verified_at,
      whatsapp_number: tenant.whatsapp_number,
      outlets: outlets ?? [],
      users: users ?? [],
      stats: {
        transactionCount,
        totalRevenue,
        productCount: productCount || 0,
        outletCount: outlets?.length || 0,
        userCount: (users?.length || 0) + 1,
      },
      billing: billing ?? [],
    };
  }

  async suspendTenant(tenantId: string, suspend: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: suspend })
      .eq('id', tenantId);

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }

  async getGrowthChart(days: number): Promise<GrowthEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('users')
      .select('created_at')
      .eq('role', 'admin')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const dailyCounts: Record<string, number> = {};
    const start = new Date(startDate);
    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dailyCounts[d.toISOString().split('T')[0]] = 0;
    }

    data?.forEach(u => {
      const d = new Date(u.created_at!).toISOString().split('T')[0];
      if (dailyCounts[d] !== undefined) dailyCounts[d]++;
    });

    let cumulative = 0;
    const { count: beforeCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .lt('created_at', startDate.toISOString());
    cumulative = beforeCount || 0;

    return Object.entries(dailyCounts).map(([date, count]) => {
      cumulative += count;
      return { date, newTenants: count, totalTenants: cumulative };
    });
  }

  async getSettings(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value, updated_at');

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async updateSettings(entries: Array<{ key: string; value: string; updatedBy: string }>): Promise<void> {
    for (const entry of entries) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: entry.key,
          value: entry.value,
          updated_at: new Date().toISOString(),
          updated_by: entry.updatedBy,
        });

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  }

  async uploadQris(base64: string, fileName: string, userId: string): Promise<string> {
    const ext = fileName.split('.').pop() || 'png';
    const filePath = `platform/qris.${ext}`;

    const buffer = Buffer.from(base64, 'base64');
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, buffer, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });

    if (uploadError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Upload gagal: ${uploadError.message}` });

    const { data: urlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath);

    await supabase
      .from('platform_settings')
      .upsert({
        key: 'qris_image_url',
        value: urlData.publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      });

    return urlData.publicUrl;
  }
}
