import { container } from '@/infra/container'
import { supabaseAdmin } from '@/infra/supabase/server'
import { TRPCError } from '@trpc/server'

/**
 * Returns the owner_id for the tenant the current user belongs to.
 * Admins are their own tenant root; cashiers inherit from their outlet's owner.
 */
export async function getTenantOwnerId(
  userId: string,
  role: string | undefined,
  outletId: string | undefined,
): Promise<string | null> {
  if (role === 'admin' || role === 'super_admin') return userId

  const outletRepo = container.outletRepo()

  if (outletId) {
    const outlet = await outletRepo.findById(outletId)
    return outlet?.owner_id ?? null
  }

  // Fallback: user may have a legacy/null role but still be an outlet owner.
  const ids = await outletRepo.findIdsByOwnerId(userId)
  return ids.length > 0 ? userId : null
}

/**
 * Returns all outlet IDs belonging to the given tenant owner.
 */
export async function getTenantOutletIds(ownerId: string): Promise<string[]> {
  const outletRepo = container.outletRepo()
  return outletRepo.findIdsByOwnerId(ownerId)
}

/**
 * Resolves tenant outlet IDs from user context (userId, role, outletId).
 * Convenience wrapper combining getTenantOwnerId + getTenantOutletIds.
 */
export async function resolveTenantOutletIds(
  userId: string,
  role: string | undefined,
  outletId: string | undefined,
): Promise<string[]> {
  const ownerId = await getTenantOwnerId(userId, role, outletId)
  if (!ownerId) return []
  return getTenantOutletIds(ownerId)
}

/**
 * Throws FORBIDDEN if the outlet's owner_id does not match the given adminUserId.
 */
export async function assertOutletBelongsToTenant(
  outletId: string,
  adminUserId: string,
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('outlets')
    .select('owner_id')
    .eq('id', outletId)
    .single()

  if (!data || data.owner_id !== adminUserId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied: resource belongs to a different tenant',
    })
  }
}

/**
 * Throws FORBIDDEN if the product's owner_id does not match the given adminUserId.
 */
export async function assertProductBelongsToTenant(
  productId: string,
  adminUserId: string,
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('owner_id')
    .eq('id', productId)
    .single()

  if (!data || data.owner_id !== adminUserId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied: resource belongs to a different tenant',
    })
  }
}
