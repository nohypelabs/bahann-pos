// End-to-end cashier flow: registers one throwaway tenant per business type and
// drives the same tRPC calls the UI makes — verify email, products (with HPP),
// stock, shift open, cash and bank-transfer checkout, oversell refusal,
// expenses, transaction filters, dashboard profit, void with PIN approval, shift
// close. Every step asserts the result and the run ends with a pass/fail count.
//
// It writes real data to the target environment's database, so point it at a
// deployment whose database you are allowed to fill with test tenants.
//
// Usage (from the repo root, Supabase CLI logged in):
//   E2E_EMAIL=you@gmail.com SUPABASE_PROJECT_REF=<ref> \
//     node scripts/e2e-cashier-flow.mjs RETAIL FNB SERVICE
//
// Env:
//   E2E_EMAIL             base address; tenants use plus-addresses (you+e2e-retail-<run>@…)
//   SUPABASE_PROJECT_REF  project the target deployment uses (read-only queries:
//                         verification tokens and assertions)
//   E2E_BASE_URL          deployment to test (default https://lakupos.vercel.app)
//   E2E_REUSE_RUN         reuse tenants from an earlier run id instead of registering;
//                         registration is rate limited to 3 per 15 minutes per IP.
//                         Clear their data first with scripts/e2e-reset-tenants.sql.
import { execSync } from 'node:child_process'

const BASE = process.env.E2E_BASE_URL || 'https://lakupos.vercel.app'
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
const BASE_EMAIL = process.env.E2E_EMAIL
if (!PROJECT_REF || !BASE_EMAIL || !BASE_EMAIL.includes('@')) {
  console.error('Set E2E_EMAIL and SUPABASE_PROJECT_REF (see the header of this file).')
  process.exit(2)
}
const RUN = process.env.E2E_REUSE_RUN || Date.now().toString(36)
const REUSE = !!process.env.E2E_REUSE_RUN
const PASSWORD = 'E2eTest!' + RUN
const PIN = '4321'

function e2eEmail(type) {
  const [local, domain] = BASE_EMAIL.split('@')
  return `${local}+e2e-${type.toLowerCase()}-${RUN}@${domain}`
}

const types = process.argv.slice(2).map((t) => t.toUpperCase())
if (!types.length || types.some((t) => !['RETAIL', 'FNB', 'SERVICE'].includes(t))) {
  console.error('Pass one or more business types: RETAIL FNB SERVICE')
  process.exit(2)
}
const results = []

function sql(q) {
  const out = execSync(
    `supabase db query --linked --project-ref ${PROJECT_REF} ${JSON.stringify(q)}`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  )
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
    let res
    if (kind === 'query') {
      const qs = input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
      res = await fetch(`${BASE}/api/trpc/${path}${qs}`, { headers })
    } else {
      res = await fetch(`${BASE}/api/trpc/${path}`, { method: 'POST', headers, body: JSON.stringify({ json: input ?? null }) })
    }
    this.store(res)
    const body = await res.json().catch(() => ({}))
    if (body.error) {
      const e = new Error(body.error.json?.message ?? JSON.stringify(body.error))
      e.code = body.error.json?.data?.code
      throw e
    }
    return body.result?.data?.json
  }
  q(path, input) { return this.call(path, input, 'query') }
}

async function step(type, name, fn) {
  try {
    const detail = await fn()
    results.push({ type, name, ok: true, detail: detail ?? '' })
    console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`)
    return true
  } catch (e) {
    results.push({ type, name, ok: false, detail: e.message })
    console.log(`  ❌ ${name} — ${e.message}`)
    return false
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg) }
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID')

const PRODUCTS = {
  RETAIL: [
    { sku: 'E2E-AQUA', name: 'Air Mineral 600ml', price: 5000, costPrice: 3000, itemType: 'PRODUCT', stockBehavior: 'TRACKED' },
    { sku: 'E2E-ROTI', name: 'Roti Coklat', price: 8000, costPrice: 5000, itemType: 'PRODUCT', stockBehavior: 'TRACKED' },
  ],
  FNB: [
    { sku: 'E2E-NASGOR', name: 'Nasi Goreng', price: 20000, costPrice: 9000, itemType: 'MENU', stockBehavior: 'UNTRACKED' },
    { sku: 'E2E-ESTEH', name: 'Es Teh Manis', price: 5000, costPrice: 1500, itemType: 'MENU', stockBehavior: 'UNTRACKED' },
  ],
  SERVICE: [
    { sku: 'E2E-CUKUR', name: 'Potong Rambut', price: 35000, costPrice: 0, itemType: 'SERVICE', stockBehavior: 'UNTRACKED' },
    { sku: 'E2E-CUCI', name: 'Cuci Rambut', price: 15000, costPrice: 2000, itemType: 'SERVICE', stockBehavior: 'UNTRACKED' },
  ],
}

async function runFlow(type) {
  console.log(`\n=== ${type} ===`)
  const c = new Client()
  const email = e2eEmail(type)
  const ctx = {}

  if (!REUSE) {
  if (!await step(type, 'Daftar akun', async () => {
    await c.call('auth.register', {
      email, password: PASSWORD, name: `E2E ${type}`, storeName: `E2E Toko ${type}`,
      whatsappNumber: '081234567890', businessType: type,
    })
    return email
  })) return

  if (!await step(type, 'Login ditolak sebelum verifikasi email', async () => {
    try { await new Client().call('auth.login', { email, password: PASSWORD }) } catch (e) {
      assert(/verifikasi/i.test(e.message), `pesan tak terduga: ${e.message}`); return 'ditolak dengan benar'
    }
    throw new Error('login berhasil padahal email belum diverifikasi')
  })) return

  if (!await step(type, 'Verifikasi email lewat link', async () => {
    const [row] = sql(`select email_verify_token t from users where email='${email}'`)
    assert(row?.t, 'token verifikasi tidak ada')
    const r = await c.call('auth.verifyEmail', { token: row.t })
    assert(r && r.alreadyVerified === false, 'verifikasi gagal')
  })) return
  }

  if (!await step(type, 'Login', async () => {
    await c.call('auth.login', { email, password: PASSWORD })
    assert(c.cookies['auth_token'], 'cookie auth_token tidak diset')
  })) return

  await step(type, 'Trial Starter aktif 14 hari setelah verifikasi', async () => {
    const plan = await c.q('auth.getPlan')
    assert(plan.plan === 'starter' && plan.isTrial, `paket ${plan.plan}, trial ${plan.isTrial}`)
    assert(plan.daysLeft === 14, `sisa ${plan.daysLeft} hari`)
    assert(!plan.inGrace, 'tertulis masa tenggang')
    return `berakhir ${plan.periodEndsAt?.slice(0, 10)}`
  })

  await step(type, 'Profil usaha sesuai jenis', async () => {
    const p = await c.q('businessProfile.getMyProfile')
    assert(p?.businessType === type, `businessType=${p?.businessType}`)
    ctx.modules = p.enabledModules
    return `modul: ${JSON.stringify(p.enabledModules)}`
  })

  if (!await step(type, 'Outlet awal tersedia', async () => {
    const r = await c.q('outlets.getAll')
    ctx.outlet = r.outlets?.[0]
    assert(ctx.outlet, 'tidak ada outlet')
    return ctx.outlet.name
  })) return

  ctx.products = []
  for (const p of PRODUCTS[type]) {
    await step(type, `Tambah produk "${p.name}" (${p.itemType}/${p.stockBehavior}, HPP ${rp(p.costPrice)})`, async () => {
      const created = await c.call('products.create', { ...p, category: 'E2E', pricingModel: 'FIXED' })
      assert(Number(created.cost_price) === p.costPrice, `cost_price tersimpan ${created.cost_price}`)
      ctx.products.push({ ...p, id: created.id })
    })
  }
  if (ctx.products.length < 2) return

  if (type === 'RETAIL') {
    for (const p of ctx.products) {
      await step(type, `Catat stok awal 20 untuk ${p.name}`, async () => {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
        await c.call('stock.record', { productId: p.id, outletId: ctx.outlet.id, stockDate: today, stockAwal: 20, stockIn: 0, stockOut: 0, stockAkhir: 20 })
      })
    }
  }

  if (!await step(type, 'Buka shift (kas awal Rp200.000)', async () => {
    const s = await c.call('shifts.open', { outletId: ctx.outlet.id, openingCash: 200000 })
    ctx.shift = s
    assert(s?.id && s.status === 'open', `status shift ${s?.status}`)
  })) return

  const [p1, p2] = ctx.products
  const cashTotal = p1.price * 2 + p2.price
  await step(type, `Transaksi tunai (2× ${p1.name} + 1× ${p2.name} = ${rp(cashTotal)}, bayar Rp100.000)`, async () => {
    const r = await c.call('payments.startCheckout', {
      outletId: ctx.outlet.id, shiftId: ctx.shift.id, method: 'cash', amountPaid: 100000,
      items: [{ productId: p1.id, quantity: 2 }, { productId: p2.id, quantity: 1 }],
    })
    assert(r.status === 'paid', `status pembayaran ${r.status}`)
    assert(Number(r.amount) === cashTotal, `total ${r.amount} != ${cashTotal}`)
    ctx.cashTx = r
    const [tx] = sql(`select status, change_amount from transactions where id='${r.transactionId}'`)
    assert(tx.status === 'completed', `status transaksi ${tx.status}`)
    assert(Number(tx.change_amount) === 100000 - cashTotal, `kembalian ${tx.change_amount}`)
    return `${r.transactionNumber}, kembalian ${rp(tx.change_amount)}`
  })

  const bankAccount = { bankName: 'BCA', accountNumber: `${{ RETAIL: '111', FNB: '222', SERVICE: '333' }[type]}${RUN}`, accountHolder: `E2E ${type}` }

  await step(type, 'Pengaturan pembayaran toko baru masih kosong (tidak bocor dari toko lain)', async () => {
    const settings = await c.q('payments.getSettings')
    assert(!settings.bankTransfer.accountNumber, `rekening sudah terisi: ${settings.bankTransfer.accountNumber}`)
    assert(!settings.qris.imageBase64, 'QRIS sudah terisi')
    const methods = await c.q('payments.getActiveMethods')
    const codes = methods.map((m) => m.code)
    assert(!codes.includes('bank_transfer') && !codes.includes('qris_static'), `metode belum diatur ikut tampil: ${codes.join(',')}`)
    assert(codes.includes('cash'), 'tunai tidak tampil')
  })

  await step(type, 'Checkout transfer ditolak sebelum rekening diatur', async () => {
    try {
      await c.call('payments.startCheckout', {
        outletId: ctx.outlet.id, shiftId: ctx.shift.id, method: 'bank_transfer', items: [{ productId: p2.id, quantity: 1 }],
      })
    } catch (e) { assert(/belum diatur/i.test(e.message), e.message); return e.message }
    throw new Error('checkout transfer diterima tanpa rekening toko')
  })

  await step(type, `Atur rekening transfer toko (${bankAccount.bankName} ${bankAccount.accountNumber})`, async () => {
    await c.call('payments.updateBankTransfer', bankAccount)
    const settings = await c.q('payments.getSettings')
    assert(settings.bankTransfer.accountNumber === bankAccount.accountNumber, `tersimpan ${settings.bankTransfer.accountNumber}`)
  })

  await step(type, `Transaksi transfer bank (1× ${p2.name}) lalu konfirmasi bayar`, async () => {
    const r = await c.call('payments.startCheckout', {
      outletId: ctx.outlet.id, shiftId: ctx.shift.id, method: 'bank_transfer',
      items: [{ productId: p2.id, quantity: 1 }],
    })
    assert(r.status === 'pending', `status awal ${r.status}`)
    assert(r.displayDetails?.accountNumber === bankAccount.accountNumber,
      `rekening di checkout ${r.displayDetails?.accountNumber}, harusnya milik toko ini ${bankAccount.accountNumber}`)
    await c.call('payments.confirmCheckout', { paymentId: r.paymentId })
    const [tx] = sql(`select status from transactions where id='${r.transactionId}'`)
    assert(tx.status === 'completed', `status setelah konfirmasi ${tx.status}`)
    ctx.qrisTx = r
    return r.transactionNumber
  })

  await step(type, 'HPP tersimpan di item transaksi', async () => {
    const rows = sql(`select product_name, unit_cost from transaction_items where transaction_id='${ctx.cashTx?.transactionId}' order by product_name`)
    assert(rows.length === 2, `jumlah item ${rows.length}`)
    for (const r of rows) {
      const p = ctx.products.find((x) => x.name === r.product_name)
      assert(Number(r.unit_cost) === p.costPrice, `${r.product_name} unit_cost ${r.unit_cost}`)
    }
  })

  if (type === 'RETAIL') {
    await step(type, 'Stok berkurang sesuai penjualan', async () => {
      const inv = await c.q('stock.getInventoryList', { outletId: ctx.outlet.id })
      const list = inv?.items ?? inv?.inventory ?? inv
      const find = (id) => list.find((x) => (x.productId ?? x.product_id ?? x.id) === id)
      const s1 = find(p1.id), s2 = find(p2.id)
      const v = (x) => Number(x?.currentStock ?? x?.stockAkhir ?? x?.stock ?? NaN)
      assert(v(s1) === 18, `${p1.name} stok ${v(s1)} (harusnya 18)`)
      const want2 = ctx.qrisTx ? 18 : 19
      assert(v(s2) === want2, `${p2.name} stok ${v(s2)} (harusnya ${want2})`)
      return `${p1.name}=18, ${p2.name}=${want2}`
    })
    await step(type, 'Jual melebihi stok ditolak', async () => {
      try {
        await c.call('payments.startCheckout', {
          outletId: ctx.outlet.id, shiftId: ctx.shift.id, method: 'cash', amountPaid: 1000000,
          items: [{ productId: p1.id, quantity: 50 }],
        })
      } catch (e) { assert(/stock|stok/i.test(e.message), e.message); return e.message }
      throw new Error('penjualan 50 unit diterima padahal stok 18')
    })
    await step(type, 'Stok tidak berubah setelah penolakan', async () => {
      const inv = await c.q('stock.getInventoryList', { outletId: ctx.outlet.id })
      const list = inv?.items ?? inv?.inventory ?? inv
      const s1 = list.find((x) => (x.productId ?? x.product_id ?? x.id) === p1.id)
      const v = Number(s1?.currentStock ?? s1?.stockAkhir ?? s1?.stock ?? NaN)
      assert(v === 18, `${p1.name} stok ${v}`)
      const [n] = sql(`select count(*) n from transactions where outlet_id='${ctx.outlet.id}'`)
      assert(Number(n.n) === 2, `jumlah transaksi ${n.n} (harusnya 2, yang ditolak tidak boleh tercatat)`)
    })
  } else {
    await step(type, 'Produk tanpa stok bisa dijual berulang', async () => {
      const r = await c.call('payments.startCheckout', {
        outletId: ctx.outlet.id, shiftId: ctx.shift.id, method: 'cash', amountPaid: p1.price * 30,
        items: [{ productId: p1.id, quantity: 30 }],
      })
      assert(r.status === 'paid', r.status)
      ctx.bulkTx = r
      return `30× ${p1.name}`
    })
  }

  await step(type, 'Catat pengeluaran (Transport Rp25.000)', async () => {
    await c.call('expenses.create', { outletId: ctx.outlet.id, category: 'transport', description: 'E2E bensin operasional', amount: 25000 })
    const s = await c.q('expenses.getDailySummary', { outletId: ctx.outlet.id })
    assert(s.totalExpenses === 25000, `total pengeluaran hari ini ${s.totalExpenses}`)
  })

  const txs = [ctx.cashTx, ctx.qrisTx, ctx.bulkTx].filter(Boolean)
  const expectedRevenue = txs.reduce((s, t) => s + Number(t.amount), 0)

  await step(type, 'Daftar transaksi hari ini (filter Dari=Sampai=hari ini)', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
    const r = await c.q('transactions.list', { dateFrom: today, dateTo: today })
    assert(r.total === txs.length, `muncul ${r.total}, harusnya ${txs.length}`)
    return `${r.total} transaksi`
  })

  await step(type, 'Dashboard: pendapatan, HPP, laba', async () => {
    const s = await c.q('dashboard.getStats', { days: 1 })
    const cogs = (p1.costPrice * 2 + p2.costPrice) + p2.costPrice + (ctx.bulkTx ? p1.costPrice * 30 : 0)
    assert(s.totalRevenue === expectedRevenue, `pendapatan ${s.totalRevenue} != ${expectedRevenue}`)
    assert(s.totalCogs === cogs, `HPP ${s.totalCogs} != ${cogs}`)
    assert(s.totalExpenses === 25000, `pengeluaran ${s.totalExpenses}`)
    assert(s.operatingProfit === expectedRevenue - cogs - 25000, `laba ${s.operatingProfit}`)
    assert(s.uncostedLines === 0, `uncostedLines ${s.uncostedLines}`)
    return `pendapatan ${rp(s.totalRevenue)}, HPP ${rp(s.totalCogs)}, laba operasional ${rp(s.operatingProfit)}`
  })

  await step(type, 'Void transaksi transfer lewat approval + PIN', async () => {
    await c.call('users.setPin', { pin: PIN, currentPassword: PASSWORD })
    assert(ctx.qrisTx, 'tidak ada transaksi transfer untuk di-void')
    const req = await c.call('transactions.void', { transactionId: ctx.qrisTx.transactionId, reason: 'E2E pelanggan batal beli' })
    const approvalId = req?.approvalId ?? req?.id ?? req?.approval?.id
    assert(approvalId, `respons void: ${JSON.stringify(req)}`)
    await c.call('transactionApprovals.approve', { approvalId, pin: PIN })
    const [tx] = sql(`select status from transactions where id='${ctx.qrisTx.transactionId}'`)
    assert(tx.status === 'voided', `status ${tx.status}`)
  })

  if (type === 'RETAIL') {
    await step(type, 'Stok kembali setelah void', async () => {
      const inv = await c.q('stock.getInventoryList', { outletId: ctx.outlet.id })
      const list = inv?.items ?? inv?.inventory ?? inv
      const s2 = list.find((x) => (x.productId ?? x.product_id ?? x.id) === p2.id)
      const v = Number(s2?.currentStock ?? s2?.stockAkhir ?? s2?.stock ?? NaN)
      assert(v === 19, `${p2.name} stok ${v} (harusnya 19)`)
    })
  }

  await step(type, 'Tutup shift (setor kas)', async () => {
    const cashSales = Number(ctx.cashTx.amount) + (ctx.bulkTx ? Number(ctx.bulkTx.amount) : 0)
    const r = await c.call('shifts.submit', { shiftId: ctx.shift.id, actualCash: 200000 + cashSales, cashierNote: 'E2E tutup shift' })
    const [s] = sql(`select status, expected_cash, actual_cash from shifts where id='${ctx.shift.id}'`)
    assert(Number(s.expected_cash) === 200000 + cashSales, `kas seharusnya ${s.expected_cash}, harusnya ${200000 + cashSales}`)
    assert(s.status === 'closed', `status shift ${s.status} (setoran pas harusnya langsung closed)`)
    return `status ${s.status}, kas seharusnya ${rp(s.expected_cash)}, disetor ${rp(s.actual_cash)}`
  })
}

for (const t of types) await runFlow(t)

const failed = results.filter((r) => !r.ok)
console.log(`\nRUN ${RUN}: ${results.length - failed.length}/${results.length} langkah lolos`)
if (failed.length) process.exit(1)
