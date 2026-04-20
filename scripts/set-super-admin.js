#!/usr/bin/env node
/**
 * Set super_admin role for a user by email.
 * Usage: node scripts/set-super-admin.js
 * Reads SUPER_ADMIN_EMAIL from .env.local
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

const DB_CONN = process.env.DIRECT_URL || process.env.DATABASE_URL
const email   = process.env.SUPER_ADMIN_EMAIL

if (!DB_CONN) {
  console.error('❌  DIRECT_URL (or DATABASE_URL) is not set in .env.local')
  process.exit(1)
}

if (!email) {
  console.error('❌  SUPER_ADMIN_EMAIL is not set in .env.local')
  process.exit(1)
}

async function run() {
  const client = new Client({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const { rows: existing } = await client.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [email]
  )

  if (existing.length === 0) {
    console.error(`❌  User dengan email "${email}" tidak ditemukan.`)
    await client.end()
    process.exit(1)
  }

  const user = existing[0]
  if (user.role === 'super_admin') {
    console.log(`✅  ${email} sudah memiliki role super_admin.`)
    await client.end()
    return
  }

  await client.query(
    'UPDATE users SET role = $1 WHERE email = $2',
    ['super_admin', email]
  )

  console.log(`✅  Role "${user.role}" → "super_admin" untuk ${email} (id: ${user.id})`)
  await client.end()
}

run().catch(err => {
  console.error('❌  Error:', err.message)
  process.exit(1)
})
