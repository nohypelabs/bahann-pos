/**
 * Database Health Check Endpoint
 * Verifies Supabase connection and performance
 *
 * GET /api/health/database
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const startTime = Date.now()

    // Test 1: Simple query
    const queryStart = Date.now()
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .limit(1)
    const queryTime = Date.now() - queryStart

    if (productsError) {
      throw new Error(`Products query failed: ${productsError.message}`)
    }

    // Test 2: Count query
    const countStart = Date.now()
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    const countTime = Date.now() - countStart

    if (countError) {
      throw new Error(`Count query failed: ${countError.message}`)
    }

    // Test 3: Check critical tables exist
    const tables = ['products', 'outlets', 'users', 'transactions']
    const tableChecks: Record<string, boolean> = {}

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        tableChecks[table] = !error
      } catch {
        tableChecks[table] = false
      }
    }

    const allTablesExist = Object.values(tableChecks).every(Boolean)
    const totalTime = Date.now() - startTime

    return NextResponse.json({
      status: allTablesExist ? 'healthy' : 'degraded',
      message: allTablesExist
        ? 'Database connection successful'
        : 'Some tables missing or inaccessible',
      timestamp: new Date().toISOString(),
      performance: {
        query: `${queryTime}ms`,
        count: `${countTime}ms`,
        total: `${totalTime}ms`,
      },
      details: {
        productsCount: count,
        tables: tableChecks,
      },
    }, {
      status: allTablesExist ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}
