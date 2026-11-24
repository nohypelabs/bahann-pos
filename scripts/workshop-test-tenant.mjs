// Creates (or reuses) a workshop test tenant on a deployment and seeds it the way
// Mr Bengkel will be set up: business type HYBRID, plan 'custom', labour and parts
// with opening stock, mechanics, the stamp card, and one member with a motor.
// Everything goes through the same tRPC calls the UI makes, so it doubles as a
// smoke test of the workshop API. Safe to rerun: existing rows are reused.
//
// Usage:
//   E2E_EMAIL=you@gmail.com SUPABASE_PROJECT_REF=<ref> WORKSHOP_TEST_PASSWORD=<pw> node scripts/workshop-test-tenant.mjs
// The account is <local>+bengkel-uji@<domain>. Optional: E2E_BASE_URL (default https://lakupos.vercel.app).
import { execSync } from 'node:child_process'

const BASE = process.env.E2E_BASE_URL || 'https://lakupos.vercel.app'
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
const BASE_EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.WORKSHOP_TEST_PASSWORD
if (!PROJECT_REF || !BASE_EMAIL?.includes('@') || !PASSWORD || PASSWORD.length < 8) {
  console.error('Set E2E_EMAIL, SUPABASE_PROJECT_REF and WORKSHOP_TEST_PASSWORD (8+ chars).')
  process.exit(2)
}
const [local, domain] = BASE_EMAIL.split('@')
const EMAIL = `${local}+bengkel-uji@${domain}`

function sql(q) {
  const out = execSync(`supabase db query --linked --project-ref ${PROJECT_REF} ${JSON.stringify(q)}`, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  })
  return JSON.parse(out.slice(out.indexOf('{'))).rows
}

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

const PRODUCTS = [
  { sku: 'JASA-SRV-RINGAN', name: 'Jasa Servis Ringan', price: 50000, costPrice: 0, itemType: 'SERVICE', stockBehavior: 'UNTRACKED', category: 'Jasa' },
  { sku: 'JASA-GANTI-OLI', name: 'Jasa Ganti Oli', price: 15000, costPrice: 0, itemType: 'SERVICE', stockBehavior: 'UNTRACKED', category: 'Jasa' },
  { sku: 'OLI-MPX1-08', name: 'Oli AHM MPX1 0.8L', price: 55000, costPrice: 45000, itemType: 'PRODUCT', stockBehavior: 'TRACKED', category: 'Oli' },
  { sku: 'KAMPAS-REM-DPN', name: 'Kampas Rem Depan', price: 45000, costPrice: 32000, itemType: 'PRODUCT', stockBehavior: 'TRACKED', category: 'Sparepart' },
  { sku: 'BUSI-NGK-C7', name: 'Busi NGK C7HSA', price: 25000, costPrice: 18000, itemType: 'PRODUCT', stockBehavior: 'TRACKED', category: 'Sparepart' },
]

const c = new Client()
console.log(`\nTenant uji bengkel: ${EMAIL} on ${BASE}`)

const existing = sql(`select id, email_verified_at from users where email='${EMAIL}'`)[0]
if (!existing) {
  await c.call('auth.register', {
    email: EMAIL, password: PASSWORD, name: 'Uji Bengkel', storeName: 'Uji Bengkel (test)',
    whatsappNumber: '081234567890', businessType: 'HYBRID',
  })
  log('akun didaftarkan (HYBRID)')
}
if (!existing?.email_verified_at) {
  const [row] = sql(`select email_verify_token t from users where email='${EMAIL}'`)
  if (row?.t) await c.call('auth.verifyEmail', { token: row.t })
  log('email diverifikasi')
}
await c.call('auth.login', { email: EMAIL, password: PASSWORD })
log('login')

sql(`select grant_plan(id, 'custom') from users where email='${EMAIL}' and plan <> 'custom'`)
const plan = await c.q('auth.getPlan')
if (plan.plan !== 'custom') throw new Error(`paket ${plan.plan}, bukan custom`)
log(`paket ${plan.plan} (tanpa masa habis: periodEndsAt=${plan.periodEndsAt})`)

const profile = await c.q('businessProfile.getMyProfile')
if (profile?.businessType !== 'HYBRID') throw new Error(`businessType=${profile?.businessType}`)
const outlet = (await c.q('outlets.getAll')).outlets[0]
log(`outlet ${outlet.name}`)

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const skus = new Set(sql(`select p.sku from products p join users u on u.tenant_id = p.tenant_id where u.email='${EMAIL}'`).map((r) => r.sku))
for (const p of PRODUCTS) {
  if (skus.has(p.sku)) continue
  const created = await c.call('products.create', { ...p, pricingModel: 'FIXED' })
  if (p.stockBehavior === 'TRACKED') {
    await c.call('stock.record', { productId: created.id, outletId: outlet.id, stockDate: today, stockAwal: 20, stockIn: 0, stockOut: 0, stockAkhir: 20 })
  }
  log(`produk ${p.name}${p.stockBehavior === 'TRACKED' ? ' (stok 20)' : ''}`)
}

const mechanics = await c.q('workshop.mechanics.list', { includeInactive: true })
for (const name of ['Budi (mekanik uji)', 'Dedi (mekanik uji)']) {
  if (mechanics.some((m) => m.name === name)) continue
  await c.call('workshop.mechanics.save', { name, isActive: true })
  log(`mekanik ${name}`)
}

await c.call('workshop.loyalty.saveStampProgram', {
  name: 'Kartu Servis', isActive: true,
  config: { requiredStamps: 10, minSpend: 0, reward: { type: 'free_service', maxValue: 50000 }, voucherValidDays: 90 },
})
log('program kartu servis: 10 stempel → 1 jasa servis gratis (maks Rp50.000), voucher 90 hari')

const plate = 'B1234UJI'
const lookup = await c.q('workshop.vehicles.lookup', { plate })
if (!lookup.vehicle) {
  const member = await c.call('workshop.customers.create', { name: 'Andi (member uji)', phone: '081200000001', enrollAsMember: true })
  await c.call('workshop.vehicles.save', { plate, brand: 'Honda', model: 'Beat', customerId: member.id })
  log(`member ${member.memberCode} + motor ${plate}`)
}
const after = await c.q('workshop.vehicles.lookup', { plate })
log(`cek nopol ${plate}: pemilik ${after.owner?.name}, kartu ${after.stampCard?.balance}/${after.stampCard?.required}`)
console.log('\nSelesai.')
