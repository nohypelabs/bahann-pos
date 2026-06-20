import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'

export const outletsRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const ownerId = ctx.session.tenantId!

      const uc = container.outletUseCase()
      const result = await uc.listByOwner(ownerId, {
        search: input?.search,
        page: input?.page ?? 1,
        limit: input?.limit ?? 50,
      })

      const page = input?.page ?? 1
      const limit = input?.limit ?? 50
      return {
        outlets: result.outlets,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ownerId = ctx.session.tenantId!
      const uc = container.outletUseCase()
      try {
        return await uc.getById(input.id, ownerId)
      } catch {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet tidak ditemukan' })
      }
    }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const uc = container.outletUseCase()
      const { SupabaseUserManagementRepository } = await import('@/infra/repositories/SupabaseUserManagementRepository')
      const userRepo = new SupabaseUserManagementRepository()
      const plan = await userRepo.getPlan(ctx.userId)
      const tenantId = ctx.session.tenantId!

      let data
      try {
        data = await uc.create(input.name, ctx.userId, tenantId, plan)
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('Plan')) throw new TRPCError({ code: 'FORBIDDEN', message: msg })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'outlet',
        entityId: data.id,
        changes: { created: input },
        metadata: { name: input.name },
      })

      return data
    }),

  update: adminProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const uc = container.outletUseCase()
      const tenantId = ctx.session.tenantId!
      let oldData
      try {
        oldData = await uc.getById(input.id, tenantId)
      } catch {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: resource belongs to a different tenant' })
      }

      let data
      try {
        data = await uc.update(input.id, input.name, tenantId)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'outlet',
        entityId: input.id,
        changes: { before: oldData, after: { name: input.name } },
        metadata: { name: input.name },
      })

      return data
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const uc = container.outletUseCase()
      const tenantId = ctx.session.tenantId!
      let outletData
      try {
        outletData = await uc.delete(input.id, tenantId)
      } catch {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied: resource belongs to a different tenant' })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'DELETE',
        entityType: 'outlet',
        entityId: input.id,
        changes: { deleted: outletData },
        metadata: { name: outletData?.name },
      })

      return { success: true }
    }),
})
