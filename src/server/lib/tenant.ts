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
  if (role === 'admin') return userId

  if (outletId) {
    const { data } = await supabaseAdmin
      .from('outlets')
      .select('owner_id')
      .eq('id', outletId)
      .single()
    return data?.owner_id ?? null
  }

  return null
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
