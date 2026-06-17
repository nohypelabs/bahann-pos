/**
 * Tenant & RBAC Helpers
 *
 * Uses normalized RBAC tables and helper functions for:
 * - tenant_id resolution
 * - outlet scope checking
 * - permission checking
 */

import { supabaseAdmin } from '@/infra/supabase/server'
import { TRPCError } from '@trpc/server'

/**
 * Returns the tenant_id for the current user.
 * Reads from session (JWT) or falls back to DB lookup.
 */
export async function getTenantId(
  userId: string,
  sessionTenantId?: string,
): Promise<string | null> {
  if (sessionTenantId) return sessionTenantId

  const { data } = await supabaseAdmin
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  return data?.tenant_id ?? null
}

/**
 * Returns all outlet IDs a user can access.
 * Uses the DB function get_user_outlet_ids() for RBAC-aware scoping.
 */
export async function getUserOutletIds(
  userId: string,
  tenantId: string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin.rpc('get_user_outlet_ids', {
    p_user_id: userId,
    p_tenant_id: tenantId,
  })

  if (error || !data) return []
  return data as string[]
}

/**
 * Checks if user has a specific permission.
 * Uses the DB function user_has_permission() for RBAC-aware checking.
 */
export async function userHasPermission(
  userId: string,
  tenantId: string,
  permissionKey: string,
  outletId?: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('user_has_permission', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_permission_key: permissionKey,
    p_outlet_id: outletId ?? null,
  })

  if (error) return false
  return data === true
}

/**
 * Returns all outlet IDs for a tenant (admin-level access).
 */
export async function getTenantOutletIds(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('outlets')
    .select('id')
    .eq('tenant_id', tenantId)

  return data?.map((o) => o.id) ?? []
}

/**
 * Throws FORBIDDEN if user doesn't have the required permission.
 */
export async function requirePermission(
  userId: string,
  tenantId: string,
  permissionKey: string,
  outletId?: string,
): Promise<void> {
  const has = await userHasPermission(userId, tenantId, permissionKey, outletId)
  if (!has) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Permission denied: ${permissionKey}`,
    })
  }
}

/**
 * Throws FORBIDDEN if the outlet is not accessible by the user.
 */
export async function assertOutletAccessible(
  userId: string,
  tenantId: string,
  outletId: string,
): Promise<void> {
  const allowedOutlets = await getUserOutletIds(userId, tenantId)
  if (!allowedOutlets.includes(outletId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied: outlet not accessible',
    })
  }
}

// Legacy aliases for backward compatibility during migration
export const getTenantOwnerId = getTenantId
export const resolveTenantOutletIds = getUserOutletIds
export const assertOutletBelongsToTenant = assertOutletAccessible
export const assertProductBelongsToTenant = async (
  productId: string,
  adminUserId: string,
) => {
  // Legacy: check product belongs to user's tenant
  const { data } = await supabaseAdmin
    .from('products')
    .select('tenant_id')
    .eq('id', productId)
    .single()

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('tenant_id')
    .eq('id', adminUserId)
    .single()

  if (!data || !user || data.tenant_id !== user.tenant_id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied: resource belongs to a different tenant',
    })
  }
}
