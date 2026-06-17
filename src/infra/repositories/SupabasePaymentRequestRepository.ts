import type {
  PaymentRequest,
  PaymentRequestRepository,
  CreatePaymentRequestData,
  ListParams,
  PaymentRequestWithUser,
  PaymentProofUpload,
} from '@/domain/repositories/PaymentRequestRepository'
import { supabaseAdmin } from '../supabase/server'

function toDomain(row: Record<string, unknown>): PaymentRequest {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    plan: row.plan as string,
    amount: row.amount as number,
    paymentMethod: row.payment_method as string,
    status: row.status as string,
    proofUrl: (row.proof_url as string) ?? null,
    adminNote: (row.admin_note as string) ?? null,
    reviewedBy: (row.reviewed_by as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
    cryptoAmount: (row.crypto_amount as number) ?? null,
    cryptoToken: (row.crypto_token as string) ?? null,
    cryptoTxHash: (row.crypto_tx_hash as string) ?? null,
    uniqueAmount: (row.unique_amount as number) ?? null,
    createdAt: row.created_at as string,
  }
}

export class SupabasePaymentRequestRepository implements PaymentRequestRepository {
  async findPendingByUserId(userId: string): Promise<PaymentRequest | null> {
    const { data } = await supabaseAdmin
      .from('payment_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    return data ? (toDomain(data) as PaymentRequest) : null
  }

  async findPendingUniqueAmounts(): Promise<number[]> {
    const { data } = await supabaseAdmin
      .from('payment_requests')
      .select('unique_amount')
      .eq('status', 'pending')
      .not('unique_amount', 'is', null)

    return data?.map(r => r.unique_amount as number) ?? []
  }

  async create(input: CreatePaymentRequestData): Promise<PaymentRequest> {
    const { data, error } = await supabaseAdmin
      .from('payment_requests')
      .insert({
        user_id: input.userId,
        plan: input.plan,
        amount: input.amount,
        payment_method: input.paymentMethod,
        status: 'pending',
        crypto_amount: input.cryptoAmount,
        crypto_token: input.cryptoToken,
        unique_amount: input.uniqueAmount,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create payment request: ${error.message}`)
    return toDomain(data)
  }

  async findById(id: string): Promise<PaymentRequest | null> {
    const { data } = await supabaseAdmin
      .from('payment_requests')
      .select('id, user_id, plan, amount, payment_method, status, proof_url, admin_note, reviewed_by, reviewed_at, crypto_amount, crypto_token, crypto_tx_hash, unique_amount, created_at')
      .eq('id', id)
      .single()

    return data ? toDomain(data) : null
  }

  async updateProofUrl(id: string, url: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_requests')
      .update({ proof_url: url })
      .eq('id', id)

    if (error) throw new Error(`Failed to update proof URL: ${error.message}`)
  }

  async findByUserId(userId: string): Promise<PaymentRequest[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_requests')
      .select('id, plan, amount, payment_method, proof_url, status, admin_note, created_at, reviewed_at, crypto_amount, crypto_token, crypto_tx_hash, unique_amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(`Failed to fetch user requests: ${error.message}`)
    return data?.map(toDomain) ?? []
  }

  async findPendingCryptoByUserId(userId: string): Promise<PaymentRequest | null> {
    const { data } = await supabaseAdmin
      .from('payment_requests')
      .select('id, user_id, plan, amount, crypto_amount, crypto_token, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .not('crypto_token', 'is', null)
      .single()

    return data ? toDomain(data) : null
  }

  async approve(id: string, reviewedBy: string, note?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_requests')
      .update({
        status: 'approved',
        admin_note: note || null,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new Error(`Failed to approve request: ${error.message}`)
  }

  async reject(id: string, reviewedBy: string, note: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_requests')
      .update({
        status: 'rejected',
        admin_note: note,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new Error(`Failed to reject request: ${error.message}`)
  }

  async updateStatus(id: string, status: string, data: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('payment_requests')
      .update({ status, ...data })
      .eq('id', id)
      .eq('status', 'pending')

    if (error) throw new Error(`Failed to update status: ${error.message}`)
  }

  async listAll(params: ListParams): Promise<{ requests: PaymentRequestWithUser[]; total: number }> {
    let query = supabaseAdmin
      .from('payment_requests')
      .select('id, user_id, plan, amount, payment_method, proof_url, status, admin_note, created_at, reviewed_at, crypto_amount, crypto_token, crypto_tx_hash, unique_amount', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (params.status) query = query.eq('status', params.status)
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, count, error } = await query
    if (error) throw new Error(`Failed to list requests: ${error.message}`)

    const userIds = [...new Set(data?.map(r => r.user_id) ?? [])]
    const { data: users } = userIds.length > 0
      ? await supabaseAdmin.from('users').select('id, name, email, plan').in('id', userIds)
      : { data: [] }

    const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

    const requests: PaymentRequestWithUser[] = data?.map(r => ({
      ...toDomain(r),
      user: userMap[r.user_id] ?? null,
    })) ?? []

    return { requests, total: count || 0 }
  }

  async uploadProof(userId: string, requestId: string, image: PaymentProofUpload): Promise<string> {
    const filePath = `payment-proofs/${userId}/${requestId}.${image.extension}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('payment-proofs')
      .upload(filePath, image.buffer, {
        contentType: image.mimeType,
        upsert: true,
      })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: urlData } = supabaseAdmin.storage
      .from('payment-proofs')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  async getPlatformSettings(keys: string[]): Promise<Record<string, string>> {
    const { data } = await supabaseAdmin
      .from('platform_settings')
      .select('key, value')
      .in('key', keys)

    const result: Record<string, string> = {}
    for (const row of data ?? []) {
      result[row.key] = row.value || ''
    }
    return result
  }
}
