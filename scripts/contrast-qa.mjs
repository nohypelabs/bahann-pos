// Contrast QA: on every app page, checks each visible text run and icon against the colour actually behind it
// (backgrounds stacked over the light glass backdrop). Flags text under 3:1 and icons under 2.2:1.
// Catches things like a white icon left on a white card. Run before pushing UI changes.
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
const all = []
for (const r of routes) {
  await page.goto(base + r, { waitUntil: 'load' }); await page.waitForTimeout(4500)
  const found = await page.evaluate(() => {
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
    document.querySelectorAll('main svg.lucide').forEach((el) => check(el, 'icon'))
    const walker = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT)
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if (t.textContent.trim().length > 1 && t.parentElement) check(t.parentElement, 'text')
    return out
  })
  for (const f of found) all.push({ route: r, ...f })
}
await browser.close()
for (const f of all) console.log(`${f.route}  ${f.kind}  ${f.ratio}:1  ${JSON.stringify(f.label)}  (${f.cls})`)
console.log(`${all.length} low-contrast item(s) on ${routes.length} pages (${mode})`)
process.exit(all.length ? 1 : 0)
