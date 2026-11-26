// A try-out tenant for a client: a workshop store with sample labour, parts,
// mechanics, members and two open service notes, plus an owner and a cashier login.
// The client logs in with these accounts before go-live; `revoke` takes access away.
//
// Usage:
//   SUPABASE_PROJECT_REF=<ref> DEMO_SECRETS=<file> node scripts/client-demo-tenant.mjs create
//   SUPABASE_PROJECT_REF=<ref> node scripts/client-demo-tenant.mjs revoke
// Optional: E2E_BASE_URL (default https://lakupos.vercel.app), DEMO_DOMAIN (default mrbengkel.test),
// DEMO_STORE (default "Mr Bengkel (Uji Coba)").
//
// `create` generates the passwords and the owner's approval PIN and writes them, with the
// emails, to DEMO_SECRETS (mode 600). It never prints them. Rerunning it reuses the tenant
// and resets both passwords. Emails use the reserved .test domain, so no mail can reach anyone.
// `revoke` makes both passwords unusable, revokes every refresh token and marks the users
// suspended; open sessions end when their 15-minute access token expires. The data stays.
import { execFileSync } from 'node:child_process'
import { randomInt, randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.E2E_BASE_URL || 'https://lakupos.vercel.app'
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
const DOMAIN = process.env.DEMO_DOMAIN || 'mrbengkel.test'
const STORE = process.env.DEMO_STORE || 'Mr Bengkel (Uji Coba)'
const OWNER = `pemilik@${DOMAIN}`
const CASHIER = `kasir@${DOMAIN}`
const mode = process.argv[2]
if (!PROJECT_REF || !['create', 'revoke'].includes(mode) || (mode === 'create' && !process.env.DEMO_SECRETS)) {
  console.error('Usage: SUPABASE_PROJECT_REF=<ref> [DEMO_SECRETS=<file>] node scripts/client-demo-tenant.mjs create|revoke')
  process.exit(2)
}

// Queries go through a file: bcrypt hashes hold `$`, which a shell argument would expand.
function sql(q) {
  const dir = mkdtempSync(join(tmpdir(), 'demo-sql-'))
  const file = join(dir, 'q.sql')
  writeFileSync(file, q, { mode: 0o600 })
  try {
    const out = execFileSync('supabase', ['db', 'query', '--linked', '--project-ref', PROJECT_REF, '-f', file], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(out.slice(out.indexOf('{'))).rows
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
const quote = (s) => `'${s.replaceAll("'", "''")}'`

class Client {
  constructor() { this.cookies = {} }
  cookieHeader() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ') }
  store(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';'); const i = pair.indexOf('=')
      this.cookies[pair.slice(0, i)] = pair.slice(i + 1)
    }
  }
  async call(path, input, kind = 'mutation') {
    const headers = { 'content-type': 'application/json', cookie: this.cookieHeader() }
    const res = kind === 'query'
      ? await fetch(`${BASE}/api/trpc/${path}${input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`}`, { headers })
      : await fetch(`${BASE}/api/trpc/${path}`, { method: 'POST', headers, body: JSON.stringify({ json: input ?? null }) })
    this.store(res)
    const body = await res.json().catch(() => ({}))
    if (body.error) throw new Error(`${path}: ${body.error.json?.message ?? JSON.stringify(body.error)}`)
    return body.result?.data?.json
  }
  q(path, input) { return this.call(path, input, 'query') }
}

const log = (msg) => console.log(`  ✅ ${msg}`)

if (mode === 'revoke') {
  const users = sql(`select id, email from users where email in (${quote(OWNER)}, ${quote(CASHIER)})`)
  if (!users.length) { console.log('No demo users found.'); process.exit(0) }
  const ids = users.map((u) => quote(u.id)).join(',')
  // A hash of a random secret nobody keeps: no password matches it any more.
  const { default: bcrypt } = await import('bcryptjs')
  sql(`update users set password_hash = ${quote(await bcrypt.hash(randomUUID(), 8))}, pin_code_hash = null, is_suspended = true where id in (${ids})`)
  sql(`update refresh_tokens set revoked_at = now() where user_id in (${ids}) and revoked_at is null`)
  for (const u of users) log(`${u.email}: password unusable, refresh tokens revoked, suspended`)
  console.log('\nOpen sessions end within 15 minutes. The tenant and its data are kept.')
  process.exit(0)
}

// Easy to type on a phone: no 0/o, 1/l/i.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const chunk = (n) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
const ownerPassword = `heri-${chunk(4)}-${chunk(4)}`
const cashierPassword = `kasir-${chunk(4)}-${chunk(4)}`
const pin = String(randomInt(1000, 10000))

const owner = new Client()
console.log(`\nTenant uji klien: ${STORE} on ${BASE}`)

let ownerRow = sql(`select id, email_verified_at from users where email=${quote(OWNER)}`)[0]
if (!ownerRow) {
  await owner.call('auth.register', {
    email: OWNER, password: ownerPassword, name: 'Pemilik (uji coba)', storeName: STORE,
    whatsappNumber: '081200000000', businessType: 'HYBRID',
  })
  ownerRow = sql(`select id, email_verified_at from users where email=${quote(OWNER)}`)[0]
  log('pemilik didaftarkan (HYBRID)')
}
if (!ownerRow.email_verified_at) {
  const [row] = sql(`select email_verify_token t from users where email=${quote(OWNER)}`)
  if (row?.t) await owner.call('auth.verifyEmail', { token: row.t })
  log('email pemilik diverifikasi')
}
// A rerun (or a run after `revoke`) sets a fresh password through the same bcrypt the app uses.
const { default: bcrypt } = await import('bcryptjs')
sql(`update users set password_hash = ${quote(await bcrypt.hash(ownerPassword, 8))}, is_suspended = false where id = ${quote(ownerRow.id)}`)
await owner.call('auth.login', { email: OWNER, password: ownerPassword })
log('login pemilik')

sql(`select grant_plan(id, 'custom') from users where id=${quote(ownerRow.id)} and plan <> 'custom'`)
const plan = await owner.q('auth.getPlan')
if (plan.plan !== 'custom') throw new Error(`paket ${plan.plan}, bukan custom`)
log('paket custom')

await owner.call('businessProfile.setOptionalModule', { module: 'workshop', enabled: true })
log('modul bengkel aktif')
const outlet = (await owner.q('outlets.getAll')).outlets[0]
log(`outlet ${outlet.name}`)

await owner.call('users.setPin', { pin, currentPassword: ownerPassword })
log('PIN persetujuan pemilik diatur')

// The same path as the client's Excel import: SKUs are generated, stock goes to the outlet.
const CATALOG = [
  ['Jasa Servis Ringan', 'SERVICE', 'Jasa', 50000, 0],
  ['Jasa Servis Besar', 'SERVICE', 'Jasa', 120000, 0],
  ['Jasa Ganti Oli', 'SERVICE', 'Jasa', 15000, 0],
  ['Jasa Ganti Kampas Rem', 'SERVICE', 'Jasa', 20000, 0],
  ['Jasa Servis CVT', 'SERVICE', 'Jasa', 75000, 0],
  ['Oli AHM MPX1 0.8L', 'PRODUCT', 'Oli', 55000, 45000, 24],
  ['Oli Yamalube Matic 0.8L', 'PRODUCT', 'Oli', 52000, 42000, 18],
  ['Busi NGK C7HSA', 'PRODUCT', 'Sparepart', 25000, 18000, 30],
  ['Kampas Rem Depan Beat/Vario', 'PRODUCT', 'Sparepart', 45000, 32000, 12],
  ['Kampas Rem Belakang Beat/Vario', 'PRODUCT', 'Sparepart', 40000, 28000, 3],
  ['V-Belt Beat/Vario', 'PRODUCT', 'Sparepart', 125000, 98000, 6],
  ['Roller CVT Beat (set)', 'PRODUCT', 'Sparepart', 65000, 48000, 10],
  ['Filter Udara Beat', 'PRODUCT', 'Sparepart', 55000, 40000, 8],
  ['Aki GS GTZ5S', 'PRODUCT', 'Aki', 245000, 205000, 4],
  ['Ban Luar IRC 80/90-14', 'PRODUCT', 'Ban', 210000, 175000, 5],
]
const imported = await owner.call('products.importCatalog', {
  outletId: outlet.id,
  existing: 'skip',
  rows: CATALOG.map(([name, kind, category, price, costPrice, initialStock], i) => ({
    row: i + 1, name, kind, category, price, costPrice, initialStock: initialStock ?? null,
  })),
})
if (imported.failed.length) throw new Error(`impor gagal: ${JSON.stringify(imported.failed)}`)
log(`katalog: ${imported.created.length} baru, ${imported.skipped.length} sudah ada, stok awal ${imported.stocked} barang`)
await owner.call('products.assignMissingBarcodes', {})
log('barcode sparepart dibuat')

const mechanics = await owner.q('workshop.mechanics.list', { includeInactive: true })
for (const name of ['Rudi (contoh)', 'Agus (contoh)']) {
  if (mechanics.some((m) => m.name === name)) continue
  await owner.call('workshop.mechanics.save', { name, isActive: true })
  log(`mekanik ${name}`)
}

await owner.call('workshop.loyalty.saveStampProgram', {
  name: 'Kartu Servis', isActive: true,
  config: { requiredStamps: 10, minSpend: 0, reward: { type: 'free_service', maxValue: 50000 }, voucherValidDays: 90 },
})
log('kartu servis: 10 stempel → 1 jasa servis gratis (maks Rp50.000)')

const MEMBERS = [
  { name: 'Andi (contoh)', phone: '081200000011', plate: 'B1234ABC', brand: 'Honda', model: 'Beat' },
  { name: 'Siti (contoh)', phone: '081200000012', plate: 'B5678XYZ', brand: 'Yamaha', model: 'NMAX' },
]
for (const m of MEMBERS) {
  const found = await owner.q('workshop.vehicles.lookup', { plate: m.plate })
  if (found.vehicle) continue
  const member = await owner.call('workshop.customers.create', { name: m.name, phone: m.phone, enrollAsMember: true })
  await owner.call('workshop.vehicles.save', { plate: m.plate, brand: m.brand, model: m.model, customerId: member.id })
  log(`member ${member.memberCode} ${m.name} + motor ${m.plate}`)
}

// Two notes waiting in the queue, ready to pay: one member, one walk-in.
const { products } = await owner.q('products.getAll', { all: true })
const byName = Object.fromEntries(products.map((p) => [p.name, p.id]))
const [rudi] = (await owner.q('workshop.mechanics.list', { includeInactive: false })).filter((m) => m.name.startsWith('Rudi'))
const QUEUE = [
  { plate: 'B1234ABC', complaint: 'Servis rutin, rem depan bunyi', km: 18250, items: [['Jasa Servis Ringan', 1], ['Oli AHM MPX1 0.8L', 1], ['Kampas Rem Depan Beat/Vario', 1]] },
  { plate: 'B9012DEF', brand: 'Honda', model: 'Vario 125', complaint: 'Ganti oli', km: 32100, items: [['Jasa Ganti Oli', 1], ['Oli AHM MPX1 0.8L', 1]] },
]
const open = await owner.q('workshop.notes.listOpen', { outletId: outlet.id })
const openPlates = new Set(open.map((n) => n.plateNumber))
for (const n of QUEUE) {
  if (openPlates.has(n.plate)) continue
  const lookup = await owner.q('workshop.vehicles.lookup', { plate: n.plate })
  const { id } = await owner.call('workshop.notes.open', {
    outletId: outlet.id, plate: n.plate, brand: n.brand, model: n.model,
    customerId: lookup.owner?.id ?? null, mechanicId: rudi?.id ?? null, complaint: n.complaint, odometerKm: n.km,
  })
  for (const [name, quantity] of n.items) {
    if (!byName[name]) throw new Error(`produk ${name} tidak ditemukan`)
    await owner.call('workshop.notes.setItem', { id, productId: byName[name], quantity })
  }
  log(`nota terbuka ${n.plate}`)
}

const cashierRow = sql(`select id from users where email=${quote(CASHIER)}`)[0]
if (!cashierRow) {
  await owner.call('users.create', {
    name: 'Kasir (uji coba)', email: CASHIER, password: cashierPassword, sendInvite: false,
    roleKey: 'CASHIER', scopeType: 'OUTLET', outletId: outlet.id,
  })
  log('akun kasir dibuat')
} else {
  sql(`update users set password_hash = ${quote(await bcrypt.hash(cashierPassword, 8))}, is_suspended = false where id = ${quote(cashierRow.id)}`)
  log('password kasir diganti')
}
const cashier = new Client()
await cashier.call('auth.login', { email: CASHIER, password: cashierPassword })
log('login kasir')

writeFileSync(process.env.DEMO_SECRETS, JSON.stringify({
  url: `${BASE}/login`, store: STORE,
  owner: { email: OWNER, password: ownerPassword, pin },
  cashier: { email: CASHIER, password: cashierPassword },
}, null, 2), { mode: 0o600 })
console.log(`\nSelesai. Akun dan password ada di ${process.env.DEMO_SECRETS}.`)
