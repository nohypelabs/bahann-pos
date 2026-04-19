import { z } from 'zod/v4'
import { router, adminProcedure, protectedProcedure } from '../trpc'
import { supabaseAdmin } from '@/infra/supabase/server'

export const paymentsRouter = router({
  getSettings: protectedProcedure.query(async () => {
    const { data, error } = await supabaseAdmin
      .from('payment_methods')
      .select('id, code, name, is_active, account_details')
      .in('code', ['bank_transfer', 'ewallet_manual', 'qris_static'])

    if (error) throw new Error(error.message)

    const find = (code: string) => data?.find(m => m.code === code)

    const bankDetails = (find('bank_transfer')?.account_details as any) || {}
    const ewalletDetails = (find('ewallet_manual')?.account_details as any) || {}
    const qrisDetails = (find('qris_static')?.account_details as any) || {}

    return {
      bankTransfer: {
        id: find('bank_transfer')?.id || null,
        isActive: find('bank_transfer')?.is_active ?? true,
        bankName: bankDetails.bankName || '',
        accountNumber: bankDetails.accountNumber || '',
        accountHolder: bankDetails.accountHolder || '',
      },
      ewallet: {
        id: find('ewallet_manual')?.id || null,
        isActive: find('ewallet_manual')?.is_active ?? true,
        phone: ewalletDetails.phone || '',
      },
      qris: {
        id: find('qris_static')?.id || null,
        isActive: find('qris_static')?.is_active ?? true,
        imageBase64: qrisDetails.imageBase64 || '',
        merchantName: qrisDetails.merchantName || '',
      },
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
      const accountDetails = {
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountHolder: input.accountHolder,
      }

      const { error } = await supabaseAdmin
        .from('payment_methods')
        .update({ account_details: accountDetails, is_active: input.isActive ?? true })
        .eq('code', 'bank_transfer')

      if (error) throw new Error(error.message)
      return { success: true }
    }),

  updateEWallet: adminProcedure
    .input(z.object({
      phone: z.string().min(1),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { error } = await supabaseAdmin
        .from('payment_methods')
        .update({ account_details: { phone: input.phone }, is_active: input.isActive ?? true })
        .eq('code', 'ewallet_manual')

      if (error) throw new Error(error.message)
      return { success: true }
    }),

  updateQRIS: adminProcedure
    .input(z.object({
      imageBase64: z.string().min(1),
      merchantName: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const accountDetails = {
        imageBase64: input.imageBase64,
        merchantName: input.merchantName || 'Laku POS',
      }

      const { error } = await supabaseAdmin
        .from('payment_methods')
        .update({ account_details: accountDetails, is_active: input.isActive ?? true })
        .eq('code', 'qris_static')

      if (error) throw new Error(error.message)
      return { success: true }
    }),
})
