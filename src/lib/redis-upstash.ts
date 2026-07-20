/**
 * Upstash Redis Client (Alternative to ioredis)
 *
 * This is an alternative Redis client specifically optimized for Upstash and serverless environments.
 * Upstash provides a REST API that works better in serverless functions like Vercel Edge Functions.
 *
 * To use this instead of ioredis:
 * 1. Install: npm install @upstash/redis
 * 2. Replace imports in your code: import { getRedisClient } from '@/lib/redis-upstash'
 * 3. Set environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 *
 * Benefits over ioredis for serverless:
 * - No persistent connections (REST-based)
 * - Faster cold starts
 * - Better for edge functions
 * - Automatic connection pooling
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

let redisClient: Redis | null = null
let redisAvailable = true

/**
 * Get singleton Upstash Redis client
 * Uses REST API instead of TCP connections
 */
export function getRedisClient(): Redis | null {
  if (!redisAvailable) return null

  if (!redisClient) {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN

      if (!url || !token) {
        logger.warn('Upstash Redis credentials not found. Authenticated sessions require Redis.')
        redisAvailable = false
        return null
      }

      redisClient = new Redis({
        url,
        token,
        // Upstash-specific optimizations
        automaticDeserialization: true,
      })

      logger.success('Upstash Redis client initialized')
    } catch (error) {
      logger.error('Failed to initialize Upstash Redis:', error)
      redisAvailable = false
      return null
    }
  }

  return redisClient
}

/**
 * Session management utilities (compatible with ioredis version)
 */
export const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

export interface SessionData {
  userId: string
  email: string
  name: string
  outletId?: string
  role?: string
  tenantId?: string
  createdAt: number
  lastAccessedAt: number
}

/**
 * Create session in Upstash Redis
 */
export async function createSession(
  userId: string,
  data: Omit<SessionData, 'userId' | 'createdAt' | 'lastAccessedAt'>
): Promise<void> {
  const redis = getRedisClient()
  if (!redis) {
    throw new Error('Redis session store is unavailable')
  }

  try {
    const now = Date.now()
    const sessionData: SessionData = {
      userId,
      ...data,
      createdAt: now,
      lastAccessedAt: now,
    }

    await redis.setex(`session:${userId}`, SESSION_TTL, JSON.stringify(sessionData))
  } catch (error) {
    logger.error('Failed to create session in Redis:', error)
  }
}

/**
 * Get session from Upstash Redis
 */
export async function getSession(userId: string): Promise<SessionData | null> {
  const redis = getRedisClient()
  if (!redis) return null

  try {
    const data = await redis.get<string>(`session:${userId}`)
    if (!data) return null

    const session = typeof data === 'string' ? JSON.parse(data) : data as SessionData

    // Update last accessed time
    session.lastAccessedAt = Date.now()
    await redis.setex(`session:${userId}`, SESSION_TTL, JSON.stringify(session))

    return session
  } catch (error) {
    logger.error('Failed to get session from Redis:', error)
    return null
  }
}

/**
 * Delete session from Upstash Redis
 */
export async function deleteSession(userId: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.del(`session:${userId}`)
  } catch (error) {
    logger.error('Failed to delete session from Redis:', error)
  }
}

/**
 * Extend session TTL (refresh on activity)
 */
export async function extendSession(userId: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.expire(`session:${userId}`, SESSION_TTL)
  } catch (error) {
    logger.error('Failed to extend session in Redis:', error)
  }
}

/**
 * Test Redis connection
 */
export async function testConnection(): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return false

  try {
    const testKey = `health-check-${Date.now()}`
    await redis.set(testKey, 'ok', { ex: 10 })
    const result = await redis.get(testKey)
    await redis.del(testKey)
    return result === 'ok'
  } catch (error) {
    logger.error('Redis health check failed:', error)
    return false
  }
}
