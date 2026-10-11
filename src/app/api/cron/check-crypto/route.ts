import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/infra/supabase/server'
import { getRecentTransfers, getRecentSolTransfers, matchTransferToAmount } from '@/lib/solana'
import { createAuditLog } from '@/lib/audit'
import { sendPlanUpgradeEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

async function approveRequest(
  reqId: string,
  userId: string,
  plan: string,
  amount: number,
  token: string,
  txSignature: string,
) {
  const { error: updateError } = await supabaseAdmin
    .from('payment_requests')
    .update({
      status: 'approved',
      crypto_tx_hash: txSignature,
      admin_note: `Auto-verified on-chain. TX: ${txSignature.slice(0, 16)}...`,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reqId)
    .eq('status', 'pending')

  if (updateError) {
    logger.error(`check-crypto: update request ${reqId} failed`, updateError)
    return false
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan, email, name')
    .eq('id', userId)
    .single()

  // grant_plan sets a 30-day period, extending a still-valid same plan.
  await supabaseAdmin.rpc('grant_plan', { p_user_id: userId, p_plan: plan })

  await supabaseAdmin.from('billing_history').insert({
    user_id: userId,
    plan,
    previous_plan: user?.plan ?? 'free',
    amount,
    note: `Crypto payment (${token.toUpperCase()}) auto-verified. TX: ${txSignature.slice(0, 16)}...`,
    is_trial: false,
    changed_by: userId,
  })

  await createAuditLog({
    userId,
    userEmail: user?.email || 'unknown',
    action: 'UPDATE',
    entityType: 'payment_request',
    entityId: reqId,
    changes: { status: 'approved', crypto_tx_hash: txSignature },
    metadata: { token, auto_verified: true },
  })

  if (user?.email && user?.name) {
    await sendPlanUpgradeEmail({
      to: user.email,
      name: user.name,
      oldPlan: user.plan ?? 'free',
      newPlan: plan,
    })
  }

  logger.info(`check-crypto: auto-approved ${reqId} via TX ${txSignature.slice(0, 16)}`)
  return true
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: pendingRequests, error } = await supabaseAdmin
    .from('payment_requests')
    .select('id, user_id, plan, amount, crypto_amount, crypto_token, created_at')
    .eq('status', 'pending')
    .not('crypto_token', 'is', null)

  if (error) {
    logger.error('check-crypto: fetch pending requests failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return NextResponse.json({ checked: 0, matched: 0 })
  }

  const sinceTimestamp = Math.floor(Date.now() / 1000) - 86400
  let matched = 0

  // Check USDC & USDT (SPL token transfers)
  for (const token of ['usdc', 'usdt'] as const) {
    const requests = pendingRequests.filter(r => r.crypto_token === token)
    if (requests.length === 0) continue

    try {
      const transfers = await getRecentTransfers(token, sinceTimestamp)
      for (const transfer of transfers) {
        const req = requests.find(r =>
          r.crypto_amount && matchTransferToAmount(transfer.amount, parseFloat(r.crypto_amount))
        )
        if (!req) continue
        const ok = await approveRequest(req.id, req.user_id, req.plan, req.amount, token, transfer.signature)
        if (ok) matched++
      }
    } catch (err) {
      logger.error(`check-crypto: error checking ${token}`, err)
    }
  }

  // Check SOL (native transfers)
  const solRequests = pendingRequests.filter(r => r.crypto_token === 'sol')
  if (solRequests.length > 0) {
    try {
      const transfers = await getRecentSolTransfers(sinceTimestamp)
      for (const transfer of transfers) {
        const req = solRequests.find(r =>
          r.crypto_amount && matchTransferToAmount(transfer.amount, parseFloat(r.crypto_amount), 0.000001)
        )
        if (!req) continue
        const ok = await approveRequest(req.id, req.user_id, req.plan, req.amount, 'sol', transfer.signature)
        if (ok) matched++
      }
    } catch (err) {
      logger.error('check-crypto: error checking SOL', err)
    }
  }

  return NextResponse.json({ checked: pendingRequests.length, matched })
}
