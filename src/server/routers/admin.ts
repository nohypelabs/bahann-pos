import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { getTenantOwnerId } from '@/server/lib/tenant'

export const adminRouter = router({
  /**
   * Reset all operational data — for fresh customer setup.
   * Deletes in FK-safe order. Preserves users and outlets.
   */
  resetAllData: adminProcedure
    .input(
      z.object({
        confirmText: z.literal('RESET ALL DATA'),
        keepOutlets: z.boolean().default(true),
        keepUsers: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ownerId = await getTenantOwnerId(ctx.userId, ctx.session.role, ctx.session.outletId)
      if (!ownerId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot determine tenant' })

      const resetAllDataUseCase = container.resetAllDataUseCase()
      const counts = await resetAllDataUseCase.execute(ownerId, {
        keepOutlets: input.keepOutlets,
        keepUsers: input.keepUsers,
      })

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'auth',
        entityId: 'reset',
        changes: { reset: counts },
        metadata: {
          keepOutlets: input.keepOutlets,
          keepUsers: input.keepUsers,
          performedBy: ctx.session?.email,
        },
      })

      return { success: true, counts }
    }),
})
