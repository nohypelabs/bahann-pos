# UI polish plan

Goal: every screen looks like one product made by one team, calm and practical for a cashier, without the marks of
generated UI. Written 27 Nov 2026 from a survey of `src/` (numbers below). Nothing here is built yet.

## 1. What makes it look generated today

Found in the code, with counts:

| Pattern | Where | Count |
|---|---|---|
| Five colour families mixed for the same job (`gray` 2938, `blue` 584, `green` 476, `purple` 215, `amber` 165, `stone` 130, `emerald` 73, `teal` 63) plus hand-written hex (`#0F5F56`, `#DDD8CC`, `#17201D`, `#FCFBF7`…) | all pages | ~4,600 classes |
| Emoji as icons (✕ ✓ ❌ ✅ 👁 ⚠ 🙈 🚀 📋 👤 👑 🗑 🛒 💳 🖨️) next to lucide icons | 35 files | ~110 |
| Eyebrow labels: tiny upper-case text with wide letter spacing ("KASIR AKTIF", "GUDANG OPERASIONAL", "CHECKOUT") above a title that says the same | Kasir, Gudang, cards | 8+ |
| Two headers per page: the top bar shows a title and a sentence ("Workspace operasional untuk kasir…"), then the page repeats a title and another sentence | every app page | 44 pages |
| Marketing sentences as subtitles ("…tanpa harus pindah-pindah halaman", "…tetap cepat saat toko sedang ramai") | page headers | most pages |
| Decorative chips that carry no decision (date chip, "Core POS", "Workspace", "10 produk tracked") | headers | ~15 |
| Gradients and soft blurred shadows (`shadow-[0_20px_45px…]`) | 12 files, 9 shadows | 35 |
| Font sizes outside the scale: `text-[10px]` 86, `text-[11px]` 91, `text-[9px]` 6 | everywhere | ~190 |
| Browser `alert()` / `confirm()` dialogs | 6 places | 6 |
| Pages that build their own header instead of `PageHeader` | 20 of 44 pages | 20 |
| Text hard-coded in Indonesian inside JSX (the rule is i18n keys) | many pages | — |
| `framer-motion` is installed but used only on the landing page | 1 file | — |

## 2. Foundations (do first, then every page uses them)

### 2.1 Colour tokens

One neutral and one brand colour, plus four status colours. Defined once in `globals.css` (`@theme`), used as
Tailwind names (`bg-surface`, `text-muted`, `border-default`, `bg-brand`, …). Hex and raw palette classes are not
used in pages any more.

| Token | Use | Value (light) |
|---|---|---|
| `canvas` | page background | `#F7F6F2` |
| `surface` / `surface-muted` | cards / table headers, inputs | `#FFFFFF` / `#F3F2EE` |
| `border` / `border-strong` | dividers / inputs, focus-less outlines | `#E4E1D8` / `#CFCBBF` |
| `text` / `text-muted` / `text-subtle` | body / secondary / hints | `#17201D` / `#5F675F` / `#8A9188` |
| `brand` / `brand-hover` / `brand-soft` | primary actions, active nav | `#0F5F56` / `#0C4D46` / `#E3F1EE` |
| `success`, `warning`, `danger`, `info` (+ `-soft`) | statuses only, never decoration | green, amber, red, blue |

Purple, indigo, emerald-as-decoration and gradients go. Blue stays only as `info`.

Dark mode: **decided 27 Nov 2026 — light only for now.** The app already forces light (`ThemeProvider` removes the
`dark` class and `dark:` only applies under `.dark`), so an OS in dark mode does not change it. The ~2,300 `dark:`
classes are dead weight: each page drops them when it is polished. Tokens stay theme-ready, so dark mode can come back
later as one set of token values instead of per-class overrides.

### 2.2 Radius, spacing, shadow, type

| Scale | Values |
|---|---|
| Radius | `sm` 6 px (badges, chips), `md` 10 px (inputs, buttons), `lg` 14 px (cards, table wrappers), `xl` 18 px (dialogs). Login/sign-up fields stay pill-shaped. |
| Spacing | 4-px grid; cards 16 px padding (20 on desktop); 24 px between page sections; 12 px inside groups |
| Shadow | `none` on cards (border only), `sm` on sticky bars, `lg` on dialogs and popovers. No coloured or 40-px-blur shadows |
| Type | 12 / 13 / 14 (body) / 16 / 20 / 24 / 30 px, weights 400/500/600. `text-[9-11px]` replaced by 12 (13 for table cells) |
| Numbers | `tabular-nums` on prices, quantities and totals so columns line up |

### 2.3 Icons and copy

- lucide icons only, 16 px in text and buttons, 20 px in empty states. Every emoji replaced (list in §5).
- Titles say what the page is ("Produk", "Catat stok masuk"). Subtitles only when they tell the user something they
  need (a rule, a limit), otherwise removed.
- No eyebrow labels. No decorative chips. Numbers and states are shown where they are used.
- All text through `t()` keys; Indonesian first, English kept in sync.
- Messages follow `friendlyError` style: what happened, what to do.

## 3. Components to fix or add (in `src/components/ui/`)

| Component | Change |
|---|---|
| `AppShell` top bar | One header per page: the top bar keeps breadcrumbs, search and shortcuts only; the page title lives in `PageHeader`. |
| `PageHeader` | Title, optional one-line description, actions on the right; used by all 44 pages (20 build their own today). |
| `Button` | Variants `primary`, `secondary`, `outline`, `ghost`, `danger`; sizes `sm` 32, `md` 40, `lg` 48 px; loading state with spinner; icon-only variant with `aria-label`. |
| `Input`, `Select`, `Textarea`, `SearchInput`, `MoneyInput` | Same height, radius, focus ring and error text; `MoneyInput` formats Rp while typing. |
| `Card`, `SectionCard`, `StatCard`, `MetricCard` | Merge into `Card` (+ `Card.Header`, `Card.Body`) and one `Stat`; border, no shadow, no tinted backgrounds except status. |
| `Table` | Header row, row height 44 px, zebra off, hover on, numeric columns right-aligned with `tabular-nums`, sticky header, empty and loading states built in. |
| `Badge` / `StatusBadge` | One component, status colours only. |
| `Dialog` (`Modal`) | Title, body, footer with actions right; ESC and backdrop close; focus trap; framer-motion enter/exit. |
| `ConfirmDialog` | Replaces the 6 `alert()` / `confirm()` calls (deleting a product, PIN steps…). |
| `Toast` | lucide icons, stacked bottom-right, framer-motion slide/fade, error toasts stay 6 s. |
| `EmptyState`, `ErrorState`, `Skeleton` | One look; skeletons match the real layout of each table/card. |
| `Tabs`, `SegmentedControl` | For filters that are buttons today (grid/list, Semua/Jasa/Barang). |

Each gets a small story page (`/dev/ui`, local only) to check every variant at phone and desktop width.

## 4. Motion with framer-motion

Use `LazyMotion` + `domAnimation` (small bundle) and `MotionConfig reducedMotion="user"` at the root, so people who
turn motion off in their OS get none. Durations 150–220 ms, ease-out in, ease-in out. Motion explains a change; it
never decorates.

| Where | Motion |
|---|---|
| Dialogs and drawers (cart drawer on phone, payment, preview) | fade backdrop; panel scale 0.98→1 + fade (dialog) or slide in (drawer); `AnimatePresence` on exit |
| Toasts | slide up + fade in, height collapse on dismiss |
| Cart lines and service-note lines | new line fades in with the green highlight fading out over 1.2 s; removed line collapses (`layout`) |
| Open-notes queue | `layout` animation when a note is paid and leaves, so the others slide up instead of jumping |
| Sidebar collapse / section expand | width and height animation, 180 ms |
| Tabs / segmented control | the active pill slides between options (`layoutId`) |
| Page content | a 120 ms fade on route change only; no slide, no stagger |
| Totals | none: money must not animate or count up |

Not animated: tables while loading, receipts and labels, anything printed, form fields.

## 5. Page-by-page

Order: what the cashier uses every day first, then stock, then owner/admin, then public pages.

| # | Page(s) | Main work |
|---|---|---|
| 1 | Kasir `/pos/sales` | Remove hero block and eyebrow labels; product list as a `Table`/grid with one style; cart card as built (compact lines) with motion; emoji (🛒 🗑️ 💳 🖨️ 👁) → lucide; mobile bottom bar and drawer to the same tokens |
| 2 | Nota Servis `/pos/notes`, note editor, new-note dialog | Queue cards in one style with `layout` motion; note lines like the cart; banners as one `Alert` component |
| 3 | Member list and detail `/members`, `/members/[id]` | Table from the new component; detail page with `PageHeader`, cards for profile, stamp card, vouchers, motors |
| 4 | Riwayat, Pendapatan `/pos/history`, `/pos/revenue` | `Table`, date filter as `SegmentedControl`, remove gradients |
| 5 | Shift & Tutup Hari `/eod`, Persetujuan `/approvals` | `PageHeader`, status badges, `ConfirmDialog` for closing a shift |
| 6 | Gudang: Catat Stok, Pergerakan, Inventori, Laporan | Remove the "Gudang Operasional" hero; form in one card; stepper input restyled; tables |
| 7 | Produk, Label, Outlet, Kategori | Table; label page with preview dialog (done); delete via `ConfirmDialog` |
| 8 | Dasbor `/dashboard` | Stats as `Stat`, charts in the brand colour + neutrals only, remove decorative chips |
| 9 | Transaksi, Pembayaran, Pengeluaran, Promosi, Alerts | Tables, badges, `ConfirmDialog` for void/refund |
| 10 | Pengaturan (usaha, pengguna, pembayaran, bengkel, langganan, reset) and Audit log | One settings layout: left list of sections, right form card; `SettingsPayments` gradient removed |
| 11 | Admin (superadmin) pages | Same components; lower priority, internal |
| 12 | Login, daftar, lupa/reset password, verifikasi email, setup | Already close; tokens only, keep pill fields; setup wizard steps as a `Stepper` |
| 13 | Landing `/`, Bantuan, Tentang | Content pages: typography and spacing; framer-motion already here, align durations |

For each page: before/after screenshots at 390 px and 1440 px, no hard-coded colour or emoji left, every string
through `t()`, keyboard path works (tab order, Enter/Esc), Playwright smoke test still passes.

## 6. Phases

| Phase | Scope | Size |
|---|---|---|
| 0 | Tokens in `globals.css`, lint rule that flags raw palette classes, hex colours and `text-[Npx]` in `src/app` | 1 day |
| 1 | Components of §3 + `/dev/ui` story page + motion setup | 2–3 days |
| 2 | Pages 1–3 (cashier daily work) | 2 days |
| 3 | Pages 4–9 | 3 days |
| 4 | Pages 10–13, remove dead styles from `globals.css` (old `.card-mobile`, tablet overrides) | 2 days |

Each phase is its own set of commits and gets an entry in `docs/testing/WORKSHOP_E2E_LOG.md` (screenshots compared,
smoke tests run). Phases 2–3 should land before the Mr Bengkel training so staff learn the final screens.

## 7. Done when

- No raw palette class, hex colour, emoji, `dark:` class or `text-[Npx]` in `src/app` (lint passes).
- All 44 pages use `PageHeader` and the shared components; no `alert()`/`confirm()`.
- One header per page; no eyebrow labels, decorative chips or gradients.
- Motion only where §4 lists it, and none with reduced motion on.
- Screens checked at phone and desktop width; workshop E2E suite passes.
