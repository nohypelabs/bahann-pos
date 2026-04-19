#!/usr/bin/env node
/**
 * Fix: Create stock_alerts table and add reorder columns to products.
 * Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS guards).
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set in .env.local')
  process.exit(1)
}

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅  Connected\n')

  const steps = [
    {
      label: 'Add reorder columns to products',
      sql: `
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10,
          ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 20,
          ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 3;
      `,
    },
    {
      label: 'Create stock_alerts table',
      sql: `
        CREATE TABLE IF NOT EXISTS stock_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
          alert_type VARCHAR(50) NOT NULL,
          current_stock INTEGER NOT NULL,
          reorder_point INTEGER NOT NULL,
          is_acknowledged BOOLEAN DEFAULT false,
          acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT valid_alert_type CHECK (alert_type IN ('low_stock', 'out_of_stock', 'reorder_suggested')),
          CONSTRAINT valid_stock_values CHECK (current_stock >= 0 AND reorder_point >= 0)
        );
      `,
    },
    {
      label: 'Create indexes (skip if exist)',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_id ON stock_alerts(product_id);
        CREATE INDEX IF NOT EXISTS idx_stock_alerts_outlet_id ON stock_alerts(outlet_id);
        CREATE INDEX IF NOT EXISTS idx_stock_alerts_is_acknowledged ON stock_alerts(is_acknowledged);
        CREATE INDEX IF NOT EXISTS idx_stock_alerts_created_at ON stock_alerts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(outlet_id, is_acknowledged, created_at DESC);
      `,
    },
    {
      label: 'Enable RLS on stock_alerts',
      sql: `ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;`,
    },
  ]

  for (const step of steps) {
    try {
      await client.query(step.sql)
      console.log(`✅  ${step.label}`)
    } catch (err) {
      console.error(`❌  ${step.label}: ${err.message}`)
    }
  }

  await client.end()
  console.log('\n✨  Done.')
}

run().catch(err => {
  console.error('❌  Unexpected error:', err.message)
  process.exit(1)
})
