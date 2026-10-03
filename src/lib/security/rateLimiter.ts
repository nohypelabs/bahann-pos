/**
 * Rate limiter backed by Postgres.
 *
 * Counters live in `public.rate_limits` and are incremented atomically by the
 * `check_rate_limit()` SQL function (see supabase/migrations/042_rate_limits.sql).
 *
 * This replaced a Redis (Upstash) implementation that failed open whenever the
 * cache was unreachable, which silently disabled brute-force protection on
 * login. Postgres is already a hard dependency of this application and login
 * requires a database read to verify credentials, so it cannot fail unnoticed
 * in the same way.
 *
 * Failure policy: if the database call itself errors, the request is allowed
 * (fail-open) but logged at error level. Failing closed here would add a second
 * way to lock every user out during a database incident, while an outage already
 * blocks login at the credential lookup — so this does not widen the window in
 * practice.
 */

import { supabaseAdmin } from '@/infra/supabase/server'
import { logger } from '@/lib/logger'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

export const RateLimitPresets = {
  REGISTER: { windowMs: 15 * 60 * 1000, maxRequests: 3 }, // 3 attempts per 15 min
  LOGIN: { windowMs: 1 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 1 min
  PASSWORD_RESET: { windowMs: 15 * 60 * 1000, maxRequests: 3 }, // 3 reset requests per 15 min
  REFRESH: { windowMs: 5 * 60 * 1000, maxRequests: 20 }, // 20 refresh attempts per 5 min
  API: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 req per minute
  SENSITIVE: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 req per minute
}

interface RateLimitRow {
  allowed: boolean
  remaining: number
  reset_at: string
}

/**
 * Check whether a request should be rate limited, consuming one slot when allowed.
 *
 * @param key - Unique identifier (e.g. "login:user@example.com")
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = RateLimitPresets.API
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000))

  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_requests: config.maxRequests,
    })

    if (error) throw new Error(error.message)

    const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | undefined
    if (!row) throw new Error('check_rate_limit returned no rows')

    const resetTime = row.reset_at ? new Date(row.reset_at).getTime() : Date.now() + config.windowMs

    return {
      allowed: row.allowed === true,
      remaining: Number(row.remaining) || 0,
      resetTime: Number.isFinite(resetTime) ? resetTime : Date.now() + config.windowMs,
    }
  } catch (error) {
    logger.error('Rate limiter database error — allowing request', { key, error })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: Date.now() + config.windowMs,
    }
  }
}

/**
 * Read the remaining attempts for a key without consuming one.
 * Used for user-facing messaging; it never modifies the counter.
 */
export async function getRemainingAttempts(
  key: string,
  config: RateLimitConfig = RateLimitPresets.API
): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return config.maxRequests

    const windowStart = new Date(data.window_start as string).getTime()
    // A lapsed window means the next request starts a fresh count.
    if (!Number.isFinite(windowStart) || Date.now() - windowStart > config.windowMs) {
      return config.maxRequests
    }

    return Math.max(0, config.maxRequests - Number(data.count ?? 0))
  } catch (error) {
    logger.error('Failed to read rate limit state', { key, error })
    return config.maxRequests
  }
}
