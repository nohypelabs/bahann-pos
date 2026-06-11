import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '../trpc'
import { container } from '@/infra/container'

export const paymentsRouter = router({
  getSettings: protectedProcedure.query(async () => {
    const useCase = container.listPaymentsUseCase()
    try {
      return await useCase.getSettings()
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch payment settings',
      })
    }
  }),

  updateBankTransfer: adminProcedure
    .input(z.object({
      bankName: z.string().min(1),
      accountNumber: z.string().min(1),
      accountHolder: z.string().min(1),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const useCase = container.createPaymentUseCase()
      try {
        return await useCase.updateBankTransfer(input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update bank transfer settings',
        })
      }
    }),

  updateEWallet: adminProcedure
    .input(z.object({
      phone: z.string().min(1),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const useCase = container.createPaymentUseCase()
      try {
        return await useCase.updateEWallet(input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update e-wallet settings',
        })
      }
    }),

  updateQRIS: adminProcedure
    .input(z.object({
      imageBase64: z.string().min(1),
      merchantName: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const useCase = container.createPaymentUseCase()
      try {
        return await useCase.updateQRIS(input)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update QRIS settings',
        })
      }
    }),
})
