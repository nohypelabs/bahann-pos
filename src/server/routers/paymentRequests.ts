import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'
import { AppError } from '@/shared/exceptions/AppError'

const managePayment = () => container.managePaymentUseCase()
const MAX_PROOF_BASE64_LENGTH = 7_500_000
const MAX_FILENAME_LENGTH = 255

function toTRPCError(err: unknown): never {
  if (err instanceof AppError) {
    throw new TRPCError({
      code: err.statusCode === 400 ? 'BAD_REQUEST' : err.statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
      message: err.message,
    })
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(err) })
}

export const paymentRequestsRouter = router({
  previewBankAmount: protectedProcedure
    .input(z.object({
      plan: z.enum(['warung', 'starter', 'professional', 'business', 'enterprise']),
    }))
    .mutation(async ({ input }) => {
      try {
        return await managePayment().previewBankAmount(input.plan)
      } catch (err) {
        toTRPCError(err)
      }
    }),

  previewCryptoAmount: protectedProcedure
    .input(z.object({
      plan: z.enum(['warung', 'starter', 'professional', 'business', 'enterprise']),
      token: z.enum(['usdc', 'usdt', 'sol']),
    }))
    .mutation(async ({ input }) => {
      try {
        return await managePayment().previewCryptoAmount(input.plan, input.token)
      } catch (err) {
        toTRPCError(err)
      }
    }),

  create: protectedProcedure
    .input(z.object({
      plan: z.enum(['warung', 'starter', 'professional', 'business', 'enterprise']),
      amount: z.number().int().min(0),
      paymentMethod: z.enum(['bank_transfer', 'qris', 'crypto_usdc', 'crypto_usdt', 'crypto_sol']).default('bank_transfer'),
      cryptoAmount: z.number().optional(),
      uniqueAmount: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { request, waNotifLink } = await managePayment().createRequest({
          userId: ctx.userId,
          plan: input.plan,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          cryptoAmount: input.cryptoAmount,
          uniqueAmount: input.uniqueAmount,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'CREATE',
          entityType: 'payment_request',
          entityId: request.id,
          changes: { plan: input.plan, amount: request.amount, method: input.paymentMethod, cryptoAmount: request.cryptoAmount, cryptoToken: request.cryptoToken, uniqueAmount: request.uniqueAmount },
        })

        return { ...request, waNotifLink }
      } catch (err) {
        toTRPCError(err)
      }
    }),

  uploadProof: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      proofBase64: z.string().min(32).max(MAX_PROOF_BASE64_LENGTH),
      fileName: z.string()
        .trim()
        .min(1)
        .max(MAX_FILENAME_LENGTH)
        .refine((value) => !value.includes('/') && !value.includes('\\'), 'Nama file tidak valid'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await managePayment().uploadProof({
          userId: ctx.userId,
          requestId: input.requestId,
          proofBase64: input.proofBase64,
          fileName: input.fileName,
        })
      } catch (err) {
        toTRPCError(err)
      }
    }),

  myRequests: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await managePayment().getMyRequests(ctx.userId)
    } catch (err) {
      toTRPCError(err)
    }
  }),

  checkMyPayment: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await managePayment().checkCryptoPayment(ctx.userId)

      if (result.matched) {
        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'UPDATE',
          entityType: 'payment_request',
          entityId: ctx.userId,
          changes: { status: 'approved', auto_verified: true },
        })
      }

      return result
    } catch (err) {
      toTRPCError(err)
    }
  }),

  paymentConfig: protectedProcedure.query(async () => {
    try {
      return await managePayment().getConfig()
    } catch (err) {
      toTRPCError(err)
    }
  }),

  listAll: superAdminProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      try {
        return await managePayment().listAll({
          status: input?.status,
          limit: input?.limit,
          offset: input?.offset,
        })
      } catch (err) {
        toTRPCError(err)
      }
    }),

  approve: superAdminProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await managePayment().approve({
          requestId: input.requestId,
          reviewedBy: ctx.userId,
          note: input.note,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'UPDATE',
          entityType: 'payment_request',
          entityId: input.requestId,
          changes: { status: 'approved' },
        })

        return result
      } catch (err) {
        toTRPCError(err)
      }
    }),

  reject: superAdminProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      note: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await managePayment().reject({
          requestId: input.requestId,
          reviewedBy: ctx.userId,
          note: input.note,
        })

        await createAuditLog({
          userId: ctx.userId,
          userEmail: ctx.session?.email || 'unknown',
          action: 'UPDATE',
          entityType: 'payment_request',
          entityId: input.requestId,
          changes: { status: 'rejected', reason: input.note },
        })

        return result
      } catch (err) {
        toTRPCError(err)
      }
    }),
})
