import { supabaseAdmin as supabase } from '../supabase/server';
import { BusinessProfile } from '@/domain/entities/BusinessProfile';
import type { BusinessType } from '@/domain/catalog/value-objects/business-type';

export class SupabaseBusinessProfileRepository {
  async findByUserId(userId: string): Promise<BusinessProfile | null> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    if (!data) return null;

    return this.toDomain(data);
  }

  async findByTenantId(tenantId: string): Promise<BusinessProfile | null> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return this.toDomain(data);
  }

  async save(profile: BusinessProfile): Promise<void> {
    let tenantId = profile.tenantId;
    if (!tenantId) {
      const { data } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', profile.userId)
        .single();
      tenantId = data?.tenant_id || profile.userId;
    }

    const { error } = await supabase
      .from('business_profiles')
      .upsert(
        {
          id: profile.id,
          user_id: profile.userId,
          business_type: profile.businessType,
          enabled_modules: JSON.stringify(profile.enabledModules),
          created_at: profile.createdAt.toISOString(),
          tenant_id: tenantId,
        },
        { onConflict: 'user_id' },
      );

    if (error) throw new Error(`Supabase insert error: ${error.message}`);
  }

  async update(profile: BusinessProfile): Promise<void> {
    const { error } = await supabase
      .from('business_profiles')
      .update({
        business_type: profile.businessType,
        enabled_modules: JSON.stringify(profile.enabledModules),
      })
      .eq('user_id', profile.userId);

    if (error) throw new Error(`Supabase update error: ${error.message}`);
  }

  /** Map DB row to domain entity */
  private toDomain(row: {
    id: string;
    user_id: string;
    business_type: string;
    enabled_modules: string | unknown[];
    created_at: string;
    tenant_id?: string;
  }): BusinessProfile {
    // Handle both string and already-parsed array
    const modules = Array.isArray(row.enabled_modules)
      ? row.enabled_modules
      : JSON.parse(row.enabled_modules as string);

    return new BusinessProfile(
      row.id,
      row.user_id,
      row.business_type as BusinessType,
      modules as string[],
      new Date(row.created_at),
      row.tenant_id,
    );
  }
}
