import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/infra/supabase/server'
import { sendTrialExpiredEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

// Vercel Cron calls this with Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Find all trial users whose trial has expired
  const { data: expired, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, plan')
    .eq('is_trial', true)
    .lt('trial_ends_at', now)

  if (error) {
    logger.error('expire-trials cron: fetch error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    logger.success('expire-trials cron: no expired trials')
    return NextResponse.json({ expired: 0 })
  }

  const ids = expired.map((u) => u.id)

  // Downgrade all expired users to free in one query
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ plan: 'free', is_trial: false, trial_ends_at: null })
    .in('id', ids)

  if (updateError) {
    logger.error('expire-trials cron: update error', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send expiry emails (non-fatal, fire and forget per user)
  await Promise.allSettled(
    expired.map((u) =>
      sendTrialExpiredEmail({ to: u.email, name: u.name ?? 'Pengguna' })
    )
  )

  logger.success(`expire-trials cron: downgraded ${expired.length} user(s)`)
  return NextResponse.json({ expired: expired.length, users: expired.map((u) => u.email) })
}
