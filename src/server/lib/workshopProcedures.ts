import { TRPCError } from '@trpc/server'
import { protectedProcedure as baseProtected, adminProcedure as baseAdmin } from '../trpc'
import { SupabaseBusinessProfileRepository } from '@/infra/repositories/SupabaseBusinessProfileRepository'
import { DomainException } from '@/domain/errors/DomainException'

// Procedures and error mapping shared by the workshop routers.

/** Only tenants that switched on the workshop module (Settings → Business) may use it. */
export async function assertWorkshopEnabled(tenantId: string | undefined) {
  const profile = tenantId ? await new SupabaseBusinessProfileRepository().findByTenantId(tenantId) : null
  if (!profile?.enabledModules.includes('workshop')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'WORKSHOP_MODULE_DISABLED' })
  }
}

export const workshopProcedure = baseProtected.use(async ({ ctx, next }) => {
  await assertWorkshopEnabled(ctx.session.tenantId)
  return next()
})
export const workshopAdminProcedure = baseAdmin.use(async ({ ctx, next }) => {
  await assertWorkshopEnabled(ctx.session?.tenantId)
  return next()
})

export async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof DomainException) throw new TRPCError({ code: 'BAD_REQUEST', message: err.code, cause: err })
    throw err
  }
}
