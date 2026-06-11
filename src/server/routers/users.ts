/**
 * Users Router
 * Handles user management and permissions
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure, superAdminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'
import { sendPlanUpgradeEmail } from '@/lib/email'

export const usersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.listByTenant(ctx.userId)
    } catch (e) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
    }
  }),

  createCashier: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        whatsappNumber: z.string().min(9).regex(/^[0-9+\-\s()]+$/),
        outletId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      const { SupabaseUserManagementRepository } = await import('@/infra/repositories/SupabaseUserManagementRepository')
      const userRepo = new SupabaseUserManagementRepository()
      const plan = await userRepo.getPlan(ctx.userId)

      let newUser
      try {
        newUser = await uc.createCashier(ctx.userId, input, plan)
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('Outlet')) throw new TRPCError({ code: 'FORBIDDEN', message: msg })
        if (msg.includes('Email')) throw new TRPCError({ code: 'CONFLICT', message: msg })
        if (msg.includes('kasir')) throw new TRPCError({ code: 'FORBIDDEN', message: msg })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'user',
        entityId: newUser.id,
        changes: { created: { name: input.name, email: input.email, outletId: input.outletId } },
        metadata: { role: 'user' },
      })

      return newUser
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      try {
        return await uc.getById(input.id, ctx.userId, ctx.session?.role)
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('own profile')) throw new TRPCError({ code: 'FORBIDDEN', message: msg })
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }
    }),

  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.getMyPermissions(ctx.userId)
    } catch {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
    }
  }),

  updatePermissions: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        permissions: z.object({
          canVoidTransactions: z.boolean().optional(),
          canGiveDiscount: z.boolean().optional(),
          maxDiscountPercent: z.number().min(0).max(100).optional(),
          canCloseDay: z.boolean().optional(),
          canManageUsers: z.boolean().optional(),
          canEditPrices: z.boolean().optional(),
          canManagePromotions: z.boolean().optional(),
          canViewReports: z.boolean().optional(),
          canManageInventory: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      let result
      try {
        result = await uc.updatePermissions(input.userId, input.permissions)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: { before: { permissions: result.before }, after: { permissions: result.after } },
      })

      return { success: true }
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['admin', 'manager', 'cashier', 'user']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      let result
      try {
        result = await uc.updateRole(input.userId, input.role)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: { before: { role: result.before }, after: { role: result.after } },
      })

      return { success: true }
    }),

  listAllAdmins: superAdminProcedure.query(async () => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.listAllAdmins()
    } catch (e) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
    }
  }),

  updatePlan: superAdminProcedure
    .input(z.object({
      userId: z.string().uuid(),
      plan: z.enum(['free', 'warung', 'starter', 'professional', 'business', 'enterprise']),
      amount: z.number().int().min(0).optional(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      let result
      try {
        result = await uc.updatePlan(input.userId, input.plan, input.amount ?? 0, input.note, ctx.userId)
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'user',
        entityId: input.userId,
        changes: { before: { plan: result.before.plan }, after: { plan: result.after.plan } },
        metadata: { targetEmail: result.before.email, targetName: result.before.name, amount: input.amount, note: input.note },
      })

      if (result.before.email && result.before.name) {
        await sendPlanUpgradeEmail({
          to: result.before.email,
          name: result.before.name,
          oldPlan: result.before.plan,
          newPlan: input.plan,
        })
      }

      return { success: true }
    }),

  getBillingHistory: protectedProcedure.query(async ({ ctx }) => {
    const uc = container.userManagementUseCase()
    try {
      return await uc.getBillingHistory(ctx.userId)
    } catch (e) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: (e as Error).message })
    }
  }),

  checkPermission: protectedProcedure
    .input(z.object({ permission: z.string() }))
    .query(async ({ input, ctx }) => {
      const uc = container.userManagementUseCase()
      const hasPermission = await uc.checkPermission(ctx.userId, input.permission, ctx.session?.role)
      return { hasPermission }
    }),
})
