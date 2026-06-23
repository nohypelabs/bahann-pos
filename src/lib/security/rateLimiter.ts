/**
 * Rate Limiter for API endpoints
 * Redis-backed via Upstash — works in serverless/multi-instance environments.
 * Falls back to allowing all requests if Redis is unavailable.
 */

import { getRedisClient } from '@/lib/redis-upstash'
import { logger } from '@/lib/logger'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export const RateLimitPresets = {
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 min
  PASSWORD_RESET: { windowMs: 15 * 60 * 1000, maxRequests: 3 }, // 3 reset requests per 15 min
  API: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 req per minute
  SENSITIVE: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 req per minute
}

/**
 * Check if request should be rate limited.
 * Uses Redis INCR + TTL for atomic sliding-window-like counting.
 * Falls back to allowing if Redis is unavailable (fail-open).
 *
 * @param key - Unique identifier (e.g. "login:user@example.com")
 * @param config - Rate limit configuration
 * @returns Object with allowed status and retry info
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = RateLimitPresets.API
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
}> {
  const redis = getRedisClient()
  if (!redis) {
    // Redis unavailable — fail open (allow request)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: Date.now() + config.windowMs,
    }
  }

  const redisKey = `ratelimit:${key}`
  const windowSec = Math.ceil(config.windowMs / 1000)

  try {
    // Atomic increment
    const count = await redis.incr(redisKey)

    // Set expiry on first request in this window
    if (count === 1) {
      await redis.expire(redisKey, windowSec)
    }

    // Get TTL for resetTime calculation
    const ttl = await redis.ttl(redisKey)
    const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs)

    if (count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - count,
      resetTime,
    }
  } catch (error) {
    // Redis error — fail open
    logger.error('Rate limiter Redis error:', error)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: Date.now() + config.windowMs,
    }
  }
}

/**
 * Get remaining attempts for a key
 */
export async function getRemainingAttempts(
  key: string,
  config: RateLimitConfig = RateLimitPresets.API
): Promise<number> {
  const redis = getRedisClient()
  if (!redis) return config.maxRequests

  try {
    const count = await redis.get<number>(`ratelimit:${key}`)
    if (!count) return config.maxRequests
    return Math.max(0, config.maxRequests - count)
  } catch {
    return config.maxRequests
  }
}
