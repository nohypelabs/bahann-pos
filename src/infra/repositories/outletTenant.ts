import { supabaseAdmin } from '../supabase/server';

/**
 * Resolves the tenant that owns an outlet. Tenant-scoped tables require
 * tenant_id on insert, and repositories that only receive an outlet id
 * derive it here rather than trusting the caller.
 */
export async function getOutletTenantId(outletId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('outlets')
    .select('tenant_id')
    .eq('id', outletId)
    .single();

  if (error || !data?.tenant_id) throw new Error(`Outlet not found: ${outletId}`);
  return data.tenant_id as string;
}
