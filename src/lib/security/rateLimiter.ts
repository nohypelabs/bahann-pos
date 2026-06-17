/**
 * Rate Limiter for API endpoints
 * Prevents brute force attacks
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

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
 * Check if request should be rate limited
 *
 * @param key - Unique identifier (IP address or user ID)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and retry info
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RateLimitPresets.API
): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Clean expired entries periodically
  if (Math.random() < 0.01) {
    cleanExpiredEntries()
  }

  // No existing entry or expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Clean expired entries from store
 */
function cleanExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Reset rate limit for specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key)
}

/**
 * Get remaining attempts
 */
export function getRemainingAttempts(
  key: string,
  config: RateLimitConfig = RateLimitPresets.API
): number {
  const entry = rateLimitStore.get(key)
  if (!entry || entry.resetTime < Date.now()) {
    return config.maxRequests
  }
  return Math.max(0, config.maxRequests - entry.count)
}
