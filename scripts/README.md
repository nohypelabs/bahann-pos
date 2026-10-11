# 📄 Documentation Scripts

## Generate Customer Documentation PDF

Script ini digunakan untuk generate dokumentasi customer dalam format PDF dari file markdown.

### Prerequisites

```bash
npm install marked puppeteer --save-dev
```

### Usage

```bash
node scripts/generate-pdf.js
```

### Output

- **File:** `CUSTOMER_DOCUMENTATION.pdf`
- **Location:** Root project folder
- **Size:** ~0.7 MB
- **Format:** A4, professional styling

### Features

- ✅ Professional styling dengan Pop!OS color scheme
- ✅ Cover page dengan branding
- ✅ Table of contents friendly
- ✅ Print-optimized layout
- ✅ Syntax highlighting untuk code blocks
- ✅ Responsive tables
- ✅ Footer dengan timestamp

### Note

PDF file sudah ditambahkan ke `.gitignore` sehingga tidak akan di-push ke repository.
Generate ulang PDF setiap kali ada perubahan di `CUSTOMER_DOCUMENTATION.md`.

### Editing Documentation

1. Edit file `CUSTOMER_DOCUMENTATION.md`
2. Run `node scripts/generate-pdf.js`
3. PDF akan di-update otomatis

### Troubleshooting

**Error: Cannot find module 'marked'**
```bash
npm install marked puppeteer --save-dev
```

**Error: Browser not found**
```bash
# Puppeteer will download Chromium automatically
# Just run the script again
```

**PDF too large**
```bash
# Reduce image sizes in markdown
# Or compress PDF using online tools
```

---

# 🧪 E2E Cashier Flow

`scripts/e2e-cashier-flow.mjs` runs the daily cashier flow against a deployed
environment, one throwaway tenant per business type: register → verify email →
login → products with HPP → stock (retail) → open shift → cash and bank-transfer
checkout → oversell refusal → expense → today's transaction filter → dashboard
profit → void with PIN approval (stock restored) → close shift. Each step is
asserted, and the command exits non-zero if any step fails.

It writes real data to the target's database. Run it only where test tenants are
acceptable, and clean up afterwards.

```bash
# from the repo root, with the Supabase CLI logged in
E2E_EMAIL=you@gmail.com SUPABASE_PROJECT_REF=<ref> pnpm test:flow RETAIL FNB SERVICE
```

- Tenants are named `E2E Toko <TYPE>` and use plus-addresses (`you+e2e-retail-<run>@…`),
  so their verification emails land in your inbox.
- Registration is rate limited (3 per 15 minutes per IP). To run again sooner, reuse
  the tenants: run `scripts/e2e-reset-tenants.sql`, then add `E2E_REUSE_RUN=<run id>`.
- Remove the tenants completely with `scripts/e2e-delete-tenants.sql`:

```bash
supabase db query --linked --project-ref <ref> -f scripts/e2e-delete-tenants.sql
```

