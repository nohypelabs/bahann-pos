// Contrast QA: on every app page, checks each visible text run and icon against the colour actually behind it
// (backgrounds stacked over the light glass backdrop). Flags text under 3:1 and icons under 2.2:1.
// Catches things like a white icon left on a white card. Run before pushing UI changes.
// After the pages it opens the main modals and drawers (STATES) and checks inside them.
//
//   QA_EMAIL=… QA_PASSWORD=… node scripts/contrast-qa.mjs [desk|phone] [base-url]
//
// Needs a running app (default http://localhost:3000) and a test login (try-out or test tenant, never a real one).
// Uses Playwright's Chromium, or the system one with CHROMIUM_PATH. Exits 1 when anything is flagged.
import { chromium, devices } from '@playwright/test'

const [mode = 'desk', base = 'http://localhost:3000'] = process.argv.slice(2)
const email = process.env.QA_EMAIL, password = process.env.QA_PASSWORD
if (!email || !password) { console.error('Set QA_EMAIL and QA_PASSWORD'); process.exit(2) }
const routes = '/about /alerts /approvals /dashboard /eod /expenses /help /members /outlets /payments /pos/history /pos/notes /pos/revenue /pos/sales /products /products/labels /profile /promotions /settings/audit-logs /settings/business /settings/payments /settings/reset /settings/subscriptions /settings/users /settings/workshop /transactions /warehouse/inventory /warehouse/movements /warehouse/reports /warehouse/stock'.split(' ')
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const ctx = await browser.newContext(mode === 'phone' ? { ...devices['iPhone 13'], locale: 'id-ID', serviceWorkers: 'block' } : { viewport: { width: 1440, height: 900 }, locale: 'id-ID', serviceWorkers: 'block' })
const page = await ctx.newPage()
await page.goto(`${base}/login`, { waitUntil: 'load' })
await page.locator('input[type=email]').fill(email)
await page.locator('input[type=password]').fill(password)
await page.locator('button[type=submit]').click()
await page.waitForURL((u) => /^\/(dashboard|pos|setup)/.test(new URL(u).pathname), { timeout: 60000 })
// Checks every visible text run and lucide icon under <main>, or under the open dialog.
const scan = (rootSel) => page.evaluate((rootSel) => {
    // Any CSS colour (oklch included) to rgba, by painting one pixel.
    const cv = document.createElement('canvas'); cv.width = cv.height = 1
    const cx = cv.getContext('2d', { willReadFrequently: true })
    const cache = new Map()
    const parse = (c) => {
      if (!c || c === 'transparent') return null
      if (cache.has(c)) return cache.get(c)
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data
      const v = { r, g, b, a: a / 255 }; cache.set(c, v); return v
    }
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
    const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 })
    // What is behind an element: stack its ancestors' backgrounds over the light backdrop.
    const PAGE = { r: 240, g: 246, b: 244, a: 1 }
    const behind = (el) => {
      const layers = []
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url')) return null // gradient: unknown
        const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 0.999) break }
      }
      return layers.reverse().reduce((acc, l) => over(l, acc), PAGE)
    }
    const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.6) return false } return true }
    const root = rootSel === 'overlay' ? document.querySelector('[data-qa-overlay]') : document.querySelector('main') || document.body
    if (!root) return []
    const out = []
    const seen = new Set()
    const check = (el, kind) => {
      if (!visible(el) || el.closest('[aria-hidden="true"] svg, .glass-backdrop, [disabled], input, textarea, select')) return
      const fg = parse(getComputedStyle(el).color); if (!fg) return
      const bg = behind(el); if (!bg) return
      const fgEff = fg.a < 1 ? over(fg, bg) : fg
      const cr = ratio(fgEff, bg)
      const limit = kind === 'icon' ? 2.2 : 3
      if (cr < limit) {
        const label = kind === 'icon' ? (el.getAttribute('class') || 'svg').split(' ').find((c) => c.startsWith('lucide-')) || 'svg' : el.textContent.trim().slice(0, 40)
        const key = kind + label + Math.round(cr * 10)
        if (seen.has(key)) return; seen.add(key)
        out.push({ kind, label, ratio: Math.round(cr * 100) / 100, cls: (el.closest('[class]')?.getAttribute('class') || '').slice(0, 110) })
      }
    }
    root.querySelectorAll('svg.lucide').forEach((el) => check(el, 'icon'))
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if (t.textContent.trim().length > 1 && t.parentElement) check(t.parentElement, 'text')
    return out
  }, rootSel)

// Click-to-open states: [route, button name, viewport or both]. A trigger that is missing is listed as skipped
// (for example Buka Shift while a shift is already open), not as passing.
const STATES = [
  ['/products', /^Tambah$/], ['/products', /Import Excel/], ['/outlets', /^Tambah Outlet$/],
  ['/members', /Pelanggan baru/], ['/settings/users', /Tambah Pengguna/],
  ['/pos/notes', /Nota baru/], ['/pos/sales', /^Buka Shift$/], ['/pos/sales', /Keranjang Belanja/, 'phone'],
]
const all = [], skipped = []
let opened = 0
for (const r of routes) {
  await page.goto(base + r, { waitUntil: 'load' }); await page.waitForTimeout(4500)
  for (const f of await scan('main')) all.push({ route: r, ...f })
}
for (const [r, name, only] of STATES) {
  if (only && only !== mode) continue
  const at = `${r} [${name.source}]`
  await page.goto(base + r, { waitUntil: 'load' }); await page.waitForTimeout(4500)
  const trigger = page.getByRole('button', { name }).filter({ visible: true }).first()
  if (!(await trigger.count())) { skipped.push(`${at}: no visible button`); continue }
  // Many modals here are hand-rolled fixed overlays without role="dialog", so look for a full-screen fixed
  // layer that was not there before the click.
  const fullScreenFixed = `[...document.querySelectorAll('body *')].filter((el) => {
    if (getComputedStyle(el).position !== 'fixed' || !el.textContent.trim()) return false
    const r = el.getBoundingClientRect(); return r.width * r.height >= innerWidth * innerHeight * 0.8 })`
  await page.evaluate(`${fullScreenFixed}.forEach((el) => el.setAttribute('data-qa-before', ''))`)
  await trigger.click()
  let shown = false
  for (let i = 0; i < 10 && !shown; i++) {
    await page.waitForTimeout(500)
    shown = await page.evaluate(`(() => { const el = ${fullScreenFixed}.find((n) => !n.hasAttribute('data-qa-before'))
      if (el) el.setAttribute('data-qa-overlay', ''); return !!el })()`)
  }
  if (!shown) { skipped.push(`${at}: nothing opened over the page`); continue }
  await page.waitForTimeout(800); opened++
  for (const f of await scan('overlay')) all.push({ route: at, ...f })
}
await browser.close()
for (const f of all) console.log(`${f.route}  ${f.kind}  ${f.ratio}:1  ${JSON.stringify(f.label)}  (${f.cls})`)
for (const k of skipped) console.log(`skipped  ${k}`)
console.log(`${all.length} low-contrast item(s) on ${routes.length} pages and ${opened} open states (${mode})`)
process.exit(all.length ? 1 : 0)
