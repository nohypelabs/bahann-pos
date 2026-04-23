import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'
import { sendPlanUpgradeEmail } from '@/lib/email'
import { CRYPTO_PRICES_USD, generateUniqueAmount } from '@/lib/solana'

export const paymentRequestsRouter = router({
  create: protectedProcedure
    .input(z.object({
      plan: z.enum(['warung', 'starter', 'professional', 'business', 'enterprise']),
      amount: z.number().int().min(0),
      paymentMethod: z.enum(['bank_transfer', 'qris', 'crypto_usdc', 'crypto_usdt']).default('bank_transfer'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data: existing } = await supabase
        .from('payment_requests')
        .select('id')
        .eq('user_id', ctx.userId)
        .eq('status', 'pending')
        .single()

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Anda sudah memiliki permintaan upgrade yang menunggu verifikasi.',
        })
      }

      const isCrypto = input.paymentMethod === 'crypto_usdc' || input.paymentMethod === 'crypto_usdt'
      let cryptoAmount: number | null = null
      let cryptoToken: string | null = null

      if (isCrypto) {
        const basePrice = CRYPTO_PRICES_USD[input.plan]
        if (!basePrice) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Plan ini tidak tersedia untuk pembayaran crypto.' })
        }
        cryptoToken = input.paymentMethod === 'crypto_usdc' ? 'usdc' : 'usdt'

        let attempts = 0
        while (attempts < 10) {
          cryptoAmount = generateUniqueAmount(basePrice)
          const { data: collision } = await supabase
            .from('payment_requests')
            .select('id')
            .eq('status', 'pending')
            .eq('crypto_token', cryptoToken)
            .eq('crypto_amount', cryptoAmount)
            .single()
          if (!collision) break
          attempts++
        }
      }

      const { data, error } = await supabase
        .from('payment_requests')
        .insert({
          user_id: ctx.userId,
          plan: input.plan,
          amount: input.amount,
          payment_method: input.paymentMethod,
          status: 'pending',
          crypto_amount: cryptoAmount,
          crypto_token: cryptoToken,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'CREATE',
        entityType: 'payment_request',
        entityId: data.id,
        changes: { plan: input.plan, amount: input.amount, method: input.paymentMethod, cryptoAmount, cryptoToken },
      })

      return data
    }),

  uploadProof: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      proofBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const { data: req } = await supabase
        .from('payment_requests')
        .select('id, user_id, status')
        .eq('id', input.requestId)
        .single()

      if (!req || req.user_id !== ctx.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' })
      }
      if (req.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request sudah diproses' })
      }

      // Upload to Supabase Storage
      const ext = input.fileName.split('.').pop() || 'jpg'
      const filePath = `payment-proofs/${ctx.userId}/${input.requestId}.${ext}`

      const buffer = Buffer.from(input.proofBase64, 'base64')
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, buffer, {
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        })

      if (uploadError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Upload gagal: ${uploadError.message}` })
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({ proof_url: urlData.publicUrl })
        .eq('id', input.requestId)

      if (updateError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })

      return { url: urlData.publicUrl }
    }),

  myRequests: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('id, plan, amount, payment_method, proof_url, status, admin_note, created_at, reviewed_at, crypto_amount, crypto_token, crypto_tx_hash')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  paymentConfig: protectedProcedure.query(async () => {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('key, value')

    const get = (key: string, envFallback?: string) => {
      const row = settings?.find(s => s.key === key)
      return row?.value || envFallback || ''
    }

    const walletAddress = get('solana_wallet_address', process.env.SOLANA_WALLET_ADDRESS)

    return {
      crypto: {
        enabled: !!walletAddress,
        walletAddress,
        prices: CRYPTO_PRICES_USD,
      },
      bank: {
        name: get('bank_name', process.env.NEXT_PUBLIC_BANK_NAME),
        account: get('bank_account', process.env.NEXT_PUBLIC_BANK_ACCOUNT),
        holder: get('bank_holder', process.env.NEXT_PUBLIC_BANK_HOLDER),
      },
      qrisImageUrl: get('qris_image_url'),
      supportWa: get('support_wa', process.env.NEXT_PUBLIC_SUPPORT_WA),
    }
  }),

  // Super admin: list all pending + recent
  listAll: superAdminProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      let query = supabase
        .from('payment_requests')
        .select('id, user_id, plan, amount, payment_method, proof_url, status, admin_note, created_at, reviewed_at, crypto_amount, crypto_token, crypto_tx_hash', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (input?.status) query = query.eq('status', input.status)

      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0
      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Fetch user info
      const userIds = [...new Set(data?.map(r => r.user_id) ?? [])]
      const { data: users } = userIds.length > 0
        ? await supabase.from('users').select('id, name, email, plan').in('id', userIds)
        : { data: [] }

      const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

      const requests = data?.map(r => ({
        ...r,
        user: userMap[r.user_id] ?? null,
      })) ?? []

      return { requests, total: count || 0 }
    }),

  // Super admin: approve
  approve: superAdminProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data: req, error: fetchError } = await supabase
        .from('payment_requests')
        .select('id, user_id, plan, amount, status')
        .eq('id', input.requestId)
        .single()

      if (fetchError || !req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' })
      if (req.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request sudah diproses' })

      // Get user's current plan
      const { data: user } = await supabase
        .from('users')
        .select('plan, email, name')
        .eq('id', req.user_id)
        .single()

      // Update request status
      const { error: updateReqError } = await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          admin_note: input.note || null,
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.requestId)

      if (updateReqError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateReqError.message })

      // Activate plan
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ plan: req.plan, is_trial: false })
        .eq('id', req.user_id)

      if (updateUserError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateUserError.message })

      // Record billing history
      await supabase.from('billing_history').insert({
        user_id: req.user_id,
        plan: req.plan,
        previous_plan: user?.plan ?? 'free',
        amount: req.amount,
        note: input.note || 'Manual payment approved',
        is_trial: false,
        changed_by: ctx.userId,
      })

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'payment_request',
        entityId: input.requestId,
        changes: { status: 'approved', plan: req.plan },
        metadata: { tenantEmail: user?.email, amount: req.amount },
      })

      // Notify user
      if (user?.email && user?.name) {
        await sendPlanUpgradeEmail({
          to: user.email,
          name: user.name,
          oldPlan: user.plan ?? 'free',
          newPlan: req.plan,
        })
      }

      return { success: true }
    }),

  // Super admin: reject
  reject: superAdminProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      note: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data: req } = await supabase
        .from('payment_requests')
        .select('id, user_id, status')
        .eq('id', input.requestId)
        .single()

      if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' })
      if (req.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request sudah diproses' })

      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'rejected',
          admin_note: input.note,
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.requestId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'payment_request',
        entityId: input.requestId,
        changes: { status: 'rejected', reason: input.note },
      })

      return { success: true }
    }),
})
