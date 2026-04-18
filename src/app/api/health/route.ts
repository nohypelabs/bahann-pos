/**
 * Health Check Endpoint
 * Verifies system components are operational
 *
 * GET /api/health
 *
 * Returns:
 * - 200: All systems operational
 * - 503: One or more systems unhealthy
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { getRedisClient } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks: {
    api: HealthStatus
    database: HealthStatus
    redis: HealthStatus
  }
  version?: string
  environment?: string
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'not_configured'
  message?: string
  responseTime?: number
}

export async function GET() {
  const startTime = Date.now()

  const checks: HealthCheck['checks'] = {
    api: { status: 'healthy' },
    database: { status: 'unhealthy' },
    redis: { status: 'unhealthy' },
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)

    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      message: error ? error.message : 'Connected',
      responseTime: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check Redis connection
  const redis = getRedisClient()
  if (!redis) {
    checks.redis = {
      status: 'not_configured',
      message: 'Redis not configured (optional)',
    }
  } else {
    try {
      const redisStart = Date.now()
      await redis.ping()
      checks.redis = {
        status: 'healthy',
        message: 'Connected',
        responseTime: Date.now() - redisStart,
      }
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  // Determine overall status
  let overallStatus: HealthCheck['status'] = 'healthy'

  // Critical: Database must be healthy
  if (checks.database.status === 'unhealthy') {
    overallStatus = 'unhealthy'
  }

  // Non-critical: Redis being down is degraded, not unhealthy
  if (checks.redis.status === 'unhealthy') {
    overallStatus = 'degraded'
  }

  const healthCheck: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(healthCheck, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
