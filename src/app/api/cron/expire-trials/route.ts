import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/infra/supabase/server'
import { sendTrialExpiredEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

// Vercel Cron calls this with Authorization: Bearer <CRON_SECRET>.
//
// Access is already enforced by public.effective_plan(), which drops a lapsed
// trial or subscription to free once its 3-day grace has passed. This job only
// tidies users.plan to match and tells the owner, so a missed run never extends
// anyone's access.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Stored plan is paid/trial, but effective access is already free.
  const { data: lapsed, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, plan, is_trial')
    .neq('plan', 'free')
    .eq('effective_plan', 'free')

  if (error) {
    logger.error('expire-plans cron: fetch error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!lapsed || lapsed.length === 0) {
    logger.success('expire-plans cron: nothing lapsed')
    return NextResponse.json({ expired: 0 })
  }

  const downgraded: typeof lapsed = []
  for (const u of lapsed) {
    const { error: grantError } = await supabaseAdmin.rpc('grant_plan', { p_user_id: u.id, p_plan: 'free' })
    if (grantError) {
      logger.error('expire-plans cron: downgrade failed', { userId: u.id, error: grantError })
      continue
    }
    downgraded.push(u)
  }

  await Promise.allSettled(
    downgraded.map((u) =>
      sendTrialExpiredEmail({ to: u.email, name: u.name ?? 'Pengguna', plan: u.plan ?? 'starter', isTrial: !!u.is_trial })
    )
  )

  logger.success(`expire-plans cron: downgraded ${downgraded.length} user(s)`)
  return NextResponse.json({ expired: downgraded.length, users: downgraded.map((u) => u.email) })
}
