# POS Multi-Tenant — UI/UX Specification v1

**Tujuan dokumen:** Acuan desain dan implementasi UI/UX untuk seluruh role dalam sistem.
Bisa diaudit oleh tim/klien, dan langsung diturunkan jadi komponen oleh developer.

**Scope:** Web dashboard (Next.js) untuk Kepala Toko, Area Manager, Admin Tenant, Owner.
Android native app (Expo/React Native) untuk Kasir.

**Versi:** 1.0
**Tanggal:** 2026-06-17
**Stack referensi:** Next.js, tRPC, Tailwind/shadcn, Expo

---

## Daftar Isi

1. [Prinsip Desain](#1-prinsip-desain)
2. [Design Token System](#2-design-token-system)
3. [Model Layer per Role](#3-model-layer-per-role)
4. [Spesifikasi Layar: Kasir](#4-spesifikasi-layar-kasir)
5. [Spesifikasi Layar: Kepala Toko](#5-spesifikasi-layar-kepala-toko)
6. [Spesifikasi Layar: Area Manager](#6-spesifikasi-layar-area-manager)
7. [Spesifikasi Layar: Admin Tenant](#7-spesifikasi-layar-admin-tenant)
8. [Spesifikasi Layar: Tenant Owner](#8-spesifikasi-layar-tenant-owner)
9. [Component Library](#9-component-library)
10. [Voice & Tone — Microcopy](#10-voice--tone--microcopy)
11. [Aturan Aksesibilitas & Responsiveness](#11-aturan-aksesibilitas--responsiveness)
12. [Empty States & Error States](#12-empty-states--error-states)
13. [Acceptance Criteria UI/UX](#13-acceptance-criteria-uiux)
14. [Prompt untuk AI CLI / Claude Code](#14-prompt-untuk-ai-cli--claude-code)

---

## 1. Prinsip Desain

### 1.1 Satu sistem, lima lensa

```
Tidak ada 5 aplikasi berbeda.
Satu backend, satu skema data (lihat dokumen schema v1).
Setiap role melihat "lensa" yang berbeda dari kebenaran yang sama.

Kasir          → detail penuh, real-time, write-heavy
Kepala Toko    → exception-driven, approval queue di depan
Area Manager   → tabel sortable, anomaly naik ke atas
Admin Tenant   → command center, drill-down tersedia
Tenant Owner   → satu angka besar, narasi, channel luar app (WhatsApp)
```

### 1.2 Hierarki: makin tinggi posisi, makin sedikit default detail

```
Kasir          ████████████████████  (semua detail visible)
Kepala Toko    ███████████████░░░░░  (exception + ringkas)
Area Manager   ██████████░░░░░░░░░░  (tabel ringkas, sortable)
Admin Tenant   ████████░░░░░░░░░░░░  (command center + drill-down)
Tenant Owner   ███░░░░░░░░░░░░░░░░░  (1 angka, narasi)
```

Tapi drill-down selalu tersedia ke bawah — owner bisa klik masuk sampai ke level admin tenant, admin tenant bisa klik masuk sampai transaksi individual.

### 1.3 Non-negotiable principles

```
P1 — Satu sumber kebenaran data.
     Tidak boleh ada "angka versi owner" yang beda dari "angka versi admin".
     Kalau beda, itu bug.

P2 — Permission digate di backend, UI hanya menentukan tampilan.
     UI tidak pernah jadi satu-satunya pertahanan untuk data sensitif.

P3 — Setiap aksi sensitif (void, refund, approve) butuh konfirmasi eksplisit
     dan menampilkan konsekuensinya sebelum dieksekusi.

P4 — Kasir tidak pernah perlu berpikir tentang "outlet mana" — itu
     ditentukan oleh device, bukan pilihan manual.

P5 — Tidak ada dead-end. Setiap empty state dan error state harus
     punya 1 aksi jelas yang bisa diambil pengguna.

P6 — Microcopy dalam Bahasa Indonesia, register santai-profesional —
     bukan kaku formal, bukan terlalu gaul.
```

---

## 2. Design Token System

### 2.1 Warna

```
Prinsip: warna membawa makna status, bukan dekorasi.
Hindari warna brand yang berlebihan di area kerja (kasir, approval).
Warna brand (axi-blue, axi-gold) dipakai di area "non-urgent"
(navigasi, branding, marketing surface) — bukan di area kerja kritis.

┌─────────────────┬───────────┬──────────────────────────────────┐
│ Token            │ Hex        │ Penggunaan                       │
├─────────────────┼───────────┼──────────────────────────────────┤
│ --color-bg        │ #FAFAF9   │ Background utama                 │
│ --color-surface    │ #FFFFFF   │ Card, panel                      │
│ --color-border     │ #E5E3DD   │ Border default                   │
│ --color-text       │ #1C1C1A   │ Teks utama                       │
│ --color-text-muted │ #6B6A64   │ Teks sekunder, label              │
│                                                                    │
│ --color-success     │ #15803D  │ Shift seimbang, approved, online │
│ --color-success-bg  │ #EFFAF1  │ Background untuk status success  │
│ --color-warning      │ #B45309  │ Perlu perhatian, mendekati batas │
│ --color-warning-bg   │ #FFF8EC  │ Background untuk warning         │
│ --color-danger        │ #B91C1C  │ Selisih kas, offline, ditolak    │
│ --color-danger-bg     │ #FEF1F1  │ Background untuk danger          │
│ --color-info           │ #1D4ED8  │ Info netral, QRIS, link           │
│ --color-info-bg        │ #EFF5FF  │ Background untuk info            │
│                                                                    │
│ --color-axi-blue   │ #0B4F6C   │ Brand — navigasi, header          │
│ --color-axi-gold    │ #FBBF24   │ Brand — aksen, CTA non-kritis    │
└─────────────────┴───────────┴──────────────────────────────────┘
```

> **Aturan kontras:** semua kombinasi teks-di-atas-background-status wajib lolos
> WCAG AA (rasio kontras ≥ 4.5:1 untuk teks normal, ≥ 3:1 untuk teks besar/bold).

### 2.2 Tipografi

```
Display / Heading : Inter (600/500)       — UI, dashboard, label
Body               : Inter (400/500)       — paragraf, deskripsi
Angka / Numerik     : Space Mono atau Inter Tabular Nums
                      — WAJIB tabular nums untuk semua nilai uang/angka
                      agar kolom rata dan tidak "loncat" saat update realtime

Skala (desktop):
  display   32px / 600   — angka headline owner, total transaksi besar
  h1        24px / 600   — judul halaman
  h2        18px / 500   — judul section/card
  body      14px / 400   — teks umum
  small     12px / 400   — label, caption, metadata
  numeric-lg 28px / 600  — angka metric card
  numeric-md 20px / 500  — angka di tabel/list

Skala (Android kasir — wajib lebih besar dari web):
  total-display  28px / 600  — total belanja
  button-label   16px / 500  — label tombol
  item-text      15px / 400  — nama produk di keranjang
  caption        13px / 400  — info shift, waktu
```

### 2.3 Spacing & Layout Grid

```
Unit dasar: 4px

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

Touch target minimum:
  Web (mouse/desktop)     : 36px tinggi minimum
  Web (tablet kepala toko) : 44px tinggi minimum
  Android kasir            : 56px tinggi minimum (WAJIB, bukan rekomendasi)

Border radius:
  Card / panel    : 12px
  Button          : 8px
  Badge / pill    : 999px (full pill)
  Input           : 8px

Container width:
  Dashboard web max-width  : 1280px, dengan sidebar 240px
  Mobile breakpoint         : < 768px → sidebar jadi bottom nav atau drawer
```

### 2.4 Motion

```
Prinsip: motion fungsional, bukan dekoratif. Untuk POS, motion berlebih
mengganggu kecepatan kerja kasir.

Durasi standar     : 150ms (micro, hover/tap feedback)
                      250ms (transisi panel/modal)
Easing              : ease-out untuk masuk, ease-in untuk keluar
Reduced motion      : WAJIB hormati prefers-reduced-motion — matikan
                      semua transisi non-esensial

Yang BOLEH dianimasikan:
  - Konfirmasi sukses (checkmark, toast)
  - Transisi modal/drawer masuk-keluar
  - Loading skeleton

Yang TIDAK BOLEH dianimasikan:
  - Update angka realtime (selisih kas, total) — harus instant,
    supaya tidak menimbulkan keraguan "ini angka final atau masih jalan?"
  - Tombol bayar / approve — tidak ada delay animasi sebelum aksi
    benar-benar tereksekusi
```

---

## 3. Model Layer per Role

### 3.1 Pemetaan role ke aplikasi & layout

```
┌────────────────┬──────────────────┬─────────────────────────────┐
│ Role             │ Platform          │ Layout utama                  │
├────────────────┼──────────────────┼─────────────────────────────┤
│ Kasir            │ Android (Expo)    │ Single screen, full-bleed,    │
│                  │                   │ tanpa sidebar/navigasi         │
│ Kepala Toko      │ Web (tablet-first)│ Sidebar + approval queue utama │
│ Area Manager     │ Web (desktop)     │ Sidebar + tabel outlet         │
│ Admin Tenant     │ Web (desktop)     │ Sidebar + command center        │
│ Tenant Owner     │ Web (mobile-first)│ Single card view + WA channel  │
└────────────────┴──────────────────┴─────────────────────────────┘
```

### 3.2 Shared shell untuk Web Dashboard

Kepala Toko, Area Manager, Admin Tenant, Owner berbagi **satu Next.js app**
dengan shell yang sama. Yang berubah adalah:

```
1. Menu sidebar yang muncul (berdasarkan permission)
2. Default landing page setelah login (berdasarkan role)
3. Scope picker (outlet mana yang sedang dilihat) — muncul HANYA
   jika user punya akses ke >1 outlet

Default landing per role:
  Kepala Toko    → /dashboard/shift-approval
  Area Manager   → /dashboard/outlets
  Admin Tenant   → /dashboard/overview
  Owner          → /dashboard/summary
```

### 3.3 Komponen shell

```
┌──────────────────────────────────────────────────┐
│ [Logo]                          [Outlet picker ▾] [Avatar ▾] │ ← Top bar, 56px
├───────────┬────────────────────────────────────────┤
│           │                                          │
│ Sidebar   │  Konten utama (berbeda per role)         │
│ (menu     │                                          │
│ sesuai    │                                          │
│ permission)│                                         │
│           │                                          │
└───────────┴────────────────────────────────────────┘

Sidebar width: 240px (desktop), collapsible jadi icon-only 64px
Mobile (<768px): sidebar jadi bottom navigation, max 5 item
```

---

## 4. Spesifikasi Layar: Kasir

**Platform:** Android native (Expo)
**Prinsip:** Minim ketukan, font besar, satu fokus, tidak ada menu tersembunyi.

### 4.1 Inventory Layar

```
1. Login Screen        — employee_code + PIN
2. Home / Open Shift    — input modal awal
3. Transaction Screen    — keranjang + pembayaran (LAYAR UTAMA)
4. Payment Confirmation — pilih metode, hitung kembalian
5. Receipt Screen        — preview struk, print, kirim WA
6. Void/Refund Request   — form alasan
7. Close Shift Screen     — hitung uang fisik, submit
8. Shift Summary          — hasil setelah approved/rejected
```

### 4.2 Transaction Screen (layar utama, paling sering dipakai)

```
┌─────────────────────────────────┐
│ [Avatar] Rina · Outlet 03   [Shift●]│  ← 48px, selalu visible
├─────────────────────────────────┤
│  Ayam Geprek      2x    Rp 30.000  │  ← list item, 56px per row
│  Es Teh           2x    Rp 10.000  │
│                                    │
│  [+ Tambah Produk]                │  ← tombol 56px, full width
├─────────────────────────────────┤
│  Total              Rp 40.000       │  ← 28px bold, paling kontras
├─────────────────────────────────┤
│ [Cash]      [QRIS]      [Debit]    │  ← 3 tombol metode, 64px tinggi
├─────────────────────────────────┤
│      Bayar Rp 40.000               │  ← CTA utama, 52px, full width
└─────────────────────────────────┘

Akses sekunder (tidak di layar utama, perlu 1 tap masuk menu):
  - Void transaksi
  - Diskon manual
  - Buka laci manual
  - Riwayat transaksi sendiri
```

### 4.3 Aturan interaksi kasir

```
R1 — Tombol "Bayar" hanya aktif kalau keranjang tidak kosong.
R2 — Setelah tap metode bayar, langsung tampil layar konfirmasi —
     tidak ada langkah tambahan sebelum itu.
R3 — Untuk cash, kalkulator kembalian WAJIB muncul otomatis,
     kasir tidak perlu hitung manual.
R4 — Print struk otomatis setelah bayar sukses. Re-print tersedia
     1 tap dari receipt screen.
R5 — Void/refund SELALU minta alasan (free text, min 5 karakter)
     sebelum bisa submit request.
R6 — Status shift (aktif/pending/closed) SELALU visible di top bar,
     tidak pernah tersembunyi di menu.
R7 — Kasir tidak pernah disuruh pilih outlet. Device sudah
     menentukan itu sejak aktivasi.
```

### 4.4 Close Shift Screen

```
┌─────────────────────────────────┐
│  Tutup Shift                       │
├─────────────────────────────────┤
│  Modal awal           Rp 500.000    │
│  Penjualan cash       Rp 2.150.000  │
│  Refund cash          Rp 0          │
│  Kas masuk manual     Rp 0          │
│  Kas keluar manual    Rp 50.000     │
│  ─────────────────────────────    │
│  Seharusnya ada       Rp 2.600.000  │  ← computed, read-only
├─────────────────────────────────┤
│  Uang fisik di laci                 │
│  [Rp ______________ ]              │  ← input besar, numeric keypad
├─────────────────────────────────┤
│  Selisih               Rp 0          │  ← muncul setelah input,
│                                     │     hijau jika 0, merah jika ≠0
│  [Catatan jika ada selisih...]      │  ← muncul HANYA jika selisih ≠ 0
├─────────────────────────────────┤
│         Kirim untuk Disetujui       │
└─────────────────────────────────┘
```

```
R8 — "Seharusnya ada" (expected_cash) read-only, dihitung server,
     tidak bisa diedit kasir.
R9 — Field catatan WAJIB muncul dan wajib diisi jika selisih ≠ 0.
R10 — Tombol submit berubah teks tergantung kondisi:
      selisih = 0   → "Tutup Shift"
      selisih ≠ 0   → "Kirim untuk Disetujui"
```

---

## 5. Spesifikasi Layar: Kepala Toko

**Platform:** Web (tablet-first, juga harus baik di desktop)
**Prinsip:** Approval queue di atas, exception-driven, 1 tap untuk approve/tolak.

### 5.1 Inventory Layar

```
1. Dashboard Outlet (landing)   — approval queue + 3 metric utama
2. Approval Detail               — detail 1 request sebelum approve/tolak
3. Shift Monitor                 — daftar shift aktif & pending hari ini
4. Transaction List (outlet)      — semua transaksi outlet, filterable
5. Inventory Outlet                — stok, adjustment, opname
6. Laporan Outlet                  — sales report, export
```

### 5.2 Dashboard Outlet (landing page)

```
┌──────────────────────────────────────────────┐
│ Outlet 03 — Buah Batu          [⚠ 2 perlu approval]│
├──────────────────────────────────────────────┤
│ [Penjualan]  [Kasir aktif]  [Selisih kas]         │  ← 3 metric card
│  Rp 4,75jt     3 / 4           Rp 0                 │
├──────────────────────────────────────────────┤
│ Menunggu approval                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ Refund — Rina · TRX-0231 · Rp 35.000          │ │
│ │ "Salah pesan menu"          [Tolak] [Setuju]   │ │
│ └────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────┐ │
│ │ Diskon besar — Budi · TRX-0245 · 25%          │ │
│ │ "Customer komplain"          [Tolak] [Setuju]  │ │
│ └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 5.3 Aturan interaksi kepala toko

```
R1 — Approval queue selalu di posisi paling atas/depan, tidak pernah
     di-bury di bawah metric atau grafik.
R2 — Badge jumlah pending SELALU visible di header, bahkan saat
     pindah ke halaman lain (persistent badge).
R3 — Approve/Tolak bisa dilakukan langsung dari card list (1 tap),
     TANPA wajib buka detail — tapi detail tetap bisa diakses
     dengan klik card untuk kasus yang butuh konteks lebih.
R4 — Aksi "Tolak" WAJIB minta alasan singkat sebelum konfirmasi.
     Aksi "Setuju" boleh tanpa alasan tambahan (alasan asal dari
     kasir sudah cukup), tapi sediakan field opsional.
R5 — Setelah approve/tolak, card hilang dari queue dengan transisi
     halus (250ms fade+slide), TIDAK instant disappear (supaya
     kepala toko yakin aksinya berhasil).
R6 — 3 metric card di atas TIDAK BOLEH lebih dari 4. Kalau perlu
     metric tambahan, taruh di halaman terpisah, bukan tambah card.
```

### 5.4 Approval Detail (saat butuh konteks lebih)

```
┌─────────────────────────────────┐
│  Request Refund                    │
├─────────────────────────────────┤
│  Diminta oleh    Rina (Kasir)         │
│  Transaksi        TRX-0231             │
│  Jumlah            Rp 35.000           │
│  Alasan kasir      "Salah pesan menu"  │
│  Waktu transaksi   17 Jun, 14:32        │
│  Waktu request     17 Jun, 14:35        │
├─────────────────────────────────┤
│  Item dalam transaksi:               │
│  - Ayam Geprek x1    Rp 15.000        │
│  - Es Teh x2          Rp 20.000        │
├─────────────────────────────────┤
│  [Catatan keputusan (opsional)]       │
├─────────────────────────────────┤
│  [Tolak]              [Setuju & Proses]│
└─────────────────────────────────┘
```

---

## 6. Spesifikasi Layar: Area Manager

**Platform:** Web (desktop-first)
**Prinsip:** Tabel sortable, anomali naik ke atas otomatis, scan cepat banyak outlet.

### 6.1 Inventory Layar

```
1. Outlet Overview (landing)   — tabel semua outlet dalam grup
2. Outlet Detail                  — drill-down ke 1 outlet (mirip
                                     dashboard kepala toko, read-only)
3. Approval Queue (lintas outlet)  — agregat semua pending di grup
4. Laporan Area                     — perbandingan antar outlet
```

### 6.2 Outlet Overview (landing page)

```
┌─────────────────────────────────────────────┐
│ Area Bandung Selatan — 6 outlet    [7 hari ▾]   │
├─────────────────────────────────────────────┤
│ Outlet            Penjualan   Selisih kas  Status │
│ ┌───────────────────────────────────────┐ │
│ │ Outlet 01 — Dago    Rp 6,2jt    Rp 0      ✓  │ │
│ │ Outlet 03 — B.Batu   Rp 4,75jt  -Rp 85rb  ⚠  │ │ ← border merah
│ │ Outlet 05 — Kopo     Rp 3,9jt    Rp 0      ✓  │ │
│ │ Outlet 06 — Mrghyu   Rp 1,1jt    Rp 0      ⏱  │ │ ← border kuning
│ └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 6.3 Aturan interaksi & sorting

```
R1 — Default sort: outlet dengan status bermasalah (⚠ merah) di
     posisi teratas, lalu (⏱ kuning), baru (✓ hijau) di bawah.
     User BISA ubah sort manual (nama, penjualan, dll), tapi
     default-nya prioritaskan anomali.
R2 — Definisi "bermasalah" (⚠):
       - selisih kas ≠ 0
       - outlet offline > 30 menit selama jam operasional
       - tidak ada transaksi > 2 jam saat jam operasional
R3 — Definisi "perlu perhatian" (⏱, kuning):
       - penjualan < 50% dari rata-rata 7 hari di jam yang sama
       - shift belum dibuka padahal sudah lewat jam buka biasa
R4 — Area manager TIDAK BISA approve/reject langsung dari tabel
     ini — itu tugas kepala toko. Area manager hanya MELIHAT dan
     bisa eskalasi/komentar jika diberi permission approve cadangan.
R5 — Klik 1 baris outlet → masuk ke Outlet Detail (read-only view
     dari dashboard kepala toko outlet itu).
```

---

## 7. Spesifikasi Layar: Admin Tenant

**Platform:** Web (desktop-first)
**Prinsip:** Command center, anomaly-first, drill-down ke semua level.

### 7.1 Inventory Layar

```
1. Overview (landing)        — 4 metric + anomali + top performer
2. Semua Outlet                — tabel 28 outlet, full filter
3. Semua Transaksi              — searchable, filterable, export
4. Manajemen User & Role         — CRUD user, assign role
5. Manajemen Produk & Harga      — CRUD produk, price override per outlet
6. Manajemen Inventory            — stok semua outlet, transfer, approve
7. Audit Log Viewer                — searchable log semua aksi sensitif
8. Pengaturan Tenant                — profil bisnis, kebijakan diskon, dst
```

### 7.2 Overview (landing page)

```
┌────────────────────────────────────────────────┐
│ Semua outlet — 28 lokasi      [Hari ini ▾] [Export]│
├────────────────────────────────────────────────┤
│ [Total Penjualan] [Transaksi] [Outlet Online] [⚠ 3 outlet]│
│   Rp 142jt           3.842        27 / 28                │
├────────────────────────────────────────────────┤
│ Anomali terdeteksi          │ Top 5 outlet                │
│ ⚠ Outlet 14 offline 2 jam    │ Outlet 01 — Rp 8,4jt         │
│ ⚠ Outlet 06 turun 60%        │ Outlet 11 — Rp 7,9jt         │
│ ⚠ Outlet 03 selisih -85rb    │ Outlet 22 — Rp 7,2jt          │
└────────────────────────────────────────────────┘
```

### 7.3 Aturan interaksi admin tenant

```
R1 — Card metric ke-4 (paling kanan) berubah warna merah HANYA
     ketika ada minimal 1 outlet bermasalah. Default-nya netral.
R2 — Anomali list dan Top performer list TIDAK BOLEH lebih dari
     5 item masing-masing di overview. "Lihat semua" untuk sisanya.
R3 — Export selalu di top-right, dan SETIAP export WAJIB tercatat
     ke audit_log (siapa, kapan, data apa) — lihat dokumen schema.
R4 — Setiap anomali item harus clickable, langsung ke detail
     terkait (outlet detail / shift detail / transaction detail).
R5 — Aksi sensitif (ubah harga, suspend user, ubah role) WAJIB
     modal konfirmasi dengan ringkasan dampak sebelum eksekusi.
     Contoh: "Mengubah harga Ayam Geprek dari Rp 15.000 menjadi
     Rp 17.000 di 28 outlet. Lanjutkan?"
```

### 7.4 Audit Log Viewer

```
┌─────────────────────────────────────────────┐
│ Audit Log                  [Filter: Semua aksi ▾]  │
├─────────────────────────────────────────────┤
│ Waktu       Aktor        Aksi             Detail      │
│ 14:35      Budi (Kepala)  void_approved    TRX-0245 ↗ │
│ 14:30      Rina (Kasir)   void_requested   TRX-0245 ↗ │
│ 14:12      Admin Tenant   price_change      Ayam Geprek ↗│
└─────────────────────────────────────────────┘

R6 — Audit log read-only total. Tidak ada tombol edit/hapus
     di UI manapun untuk entri log.
R7 — Setiap baris log clickable → expand detail before/after
     data (jsonb) dalam format yang readable, bukan raw JSON.
```

---

## 8. Spesifikasi Layar: Tenant Owner

**Platform:** Web (mobile-first — owner sering buka dari HP)
**Prinsip:** Satu angka besar, narasi bukan tabel, channel utama di luar app (WhatsApp).

### 8.1 Inventory Layar

```
1. Summary (landing, dan biasanya satu-satunya layar yang dibuka)
2. Outlet List (drill-down, mirip Admin Tenant tapi read-only)
3. Pengaturan Notifikasi WA
```

### 8.2 Summary Screen

```
┌─────────────────────────────────┐
│ Senin, 17 Juni 2026                 │
│ Ringkasan bisnis lo hari ini         │
├─────────────────────────────────┤
│   Rp 142jt    ↑ 8% vs kemarin       │  ← angka besar, 32px
│   Total penjualan dari 27 outlet     │
├─────────────────────────────────┤
│ [Outlet terbaik]   [Perlu dicek]      │
│  Dago — Rp 8,4jt    3 outlet           │
├─────────────────────────────────┤
│ 💬 Ringkasan ini juga dikirim ke WA    │
│    Setiap hari jam 23:00, otomatis     │
├─────────────────────────────────┤
│      Lihat semua outlet ↗               │
└─────────────────────────────────┘
```

### 8.3 Aturan interaksi owner

```
R1 — Tidak ada tabel multi-baris di landing page owner. Maksimal
     2 angka pendukung selain headline.
R2 — Bahasa headline selalu naratif dan personal ("bisnis lo"),
     bukan label teknis ("Daily Sales Report").
R3 — Notifikasi WA adalah CHANNEL UTAMA, bukan pelengkap. Owner
     harus bisa dapat semua insight penting tanpa pernah buka app,
     kalau mereka pilih begitu.
R4 — "Perlu dicek" hanya muncul kalau ada anomali (lihat definisi
     di section 6.3). Kalau tidak ada, tampilkan pesan positif:
     "Semua outlet aman hari ini" — bukan card kosong/hilang.
R5 — Drill-down "Lihat semua outlet" membawa owner ke view yang
     SAMA dengan yang admin tenant pakai (read-only), bukan view
     terpisah yang harus di-maintain dua kali.
```

---

## 9. Component Library

> Spesifikasi ini ditulis sebagai kontrak — implementasi detail
> (shadcn/ui, Tailwind, atau custom) bebas, tapi behavior dan
> visual rule di bawah wajib diikuti.

### 9.1 Button

```
Variant: primary, secondary, danger, ghost

primary    — bg solid (axi-blue / text-primary), untuk 1 aksi utama
             per layar. Tidak boleh ada >1 primary button yang
             terlihat bersamaan di viewport yang sama.
secondary  — outline, untuk aksi sejajar/alternatif
danger     — bg merah, untuk aksi destruktif (void, tolak, hapus)
ghost      — tanpa border/bg, untuk aksi tersier (lihat detail, batal)

States wajib: default, hover, active (scale 0.98), disabled (opacity 0.5,
              cursor not-allowed), loading (spinner inline, label tetap ada)

Ukuran:
  sm   32px — aksi sekunder dalam tabel/list
  md   40px — default web
  lg   52px — CTA utama / mobile owner
  xl   56-64px — WAJIB untuk semua tombol di Android kasir
```

### 9.2 Metric Card

```
┌──────────────────────┐
│ Label (13px, muted)     │
│ Rp 142jt (24-28px, bold) │
│ ↑ 8% (opsional, 13px)    │
└──────────────────────┘

Background : --color-bg-secondary (netral) ATAU
             --color-danger-bg / --color-warning-bg (kalau status butuh alert)
Tidak ada border kecuali versi alert (border tipis sesuai status)
Maksimal 4 metric card per row pada satu pandangan.
```

### 9.3 Approval Card

```
┌────────────────────────────────────────────┐
│ [Tipe aksi] — [Nama aktor]                       │
│ [ID referensi] · [jumlah jika ada]                │
│ "[alasan dari pemohon]"            [Tolak] [Setuju]│
└────────────────────────────────────────────┘

Wajib menampilkan: siapa yang minta, apa yang diminta, alasan,
referensi yang bisa diklik untuk detail.
Tombol aksi selalu di kanan, "Tolak" di kiri "Setuju" (urutan ini
konsisten di semua tempat — jangan ditukar antar halaman).
```

### 9.4 Status Badge

```
●  Aktif / Online       — hijau
●  Pending               — kuning/amber
●  Ditolak / Offline      — merah
●  Netral / Draft          — abu-abu

Bentuk: pill (border-radius full), padding 4px 10px, font 12px medium.
Selalu pasangan warna fill+text dari ramp yang sama (lihat token warna).
```

### 9.5 Data Table (Area Manager, Admin Tenant)

```
Wajib:
  - Sticky header saat scroll vertikal
  - Default sort yang mencerminkan urgensi (anomali dulu), bukan
    alfabetis atau ID
  - Setiap baris clickable ke detail, dengan hover state jelas
  - Kolom angka rata kanan, tabular-nums
  - Empty state kalau filter tidak menghasilkan apa-apa (lihat
    section 12)

Tidak boleh:
  - Horizontal scroll tanpa indikator visual bahwa ada kolom
    tersembunyi di kanan
  - Pagination tanpa info "menampilkan X dari Y total"
```

### 9.6 Confirmation Modal (untuk aksi sensitif)

```
┌─────────────────────────────────┐
│  [Judul aksi]                       │
│                                     │
│  [Ringkasan dampak dalam 1-2 kalimat,│
│   sebutkan angka/scope konkret]      │
│                                     │
│  [Field alasan, jika diperlukan]      │
│                                     │
│         [Batal]      [Konfirmasi]     │
└─────────────────────────────────┘

Wajib dipakai untuk: void, refund approval, ubah harga massal,
suspend user, ubah role, hapus data apapun.
Tombol konfirmasi pakai warna sesuai dampak (danger untuk
destruktif, primary untuk approval netral).
```

---

## 10. Voice & Tone — Microcopy

### 10.1 Prinsip

```
- Aktif, bukan pasif: "Simpan perubahan" bukan "Perubahan akan disimpan"
- Spesifik, bukan generic: "Selisih kas Rp 85.000" bukan "Ada masalah"
- Bahasa Indonesia conversational-profesional, sentence case
- Konsisten: nama aksi di tombol = nama aksi di toast konfirmasi
  Tombol "Setuju & Proses" → toast "Refund diproses"
  (BUKAN tombol "Approve" → toast "Disetujui")
```

### 10.2 Contoh microcopy per situasi

```
┌──────────────────────┬──────────────────────────────────────┐
│ Situasi                  │ Microcopy                              │
├──────────────────────┼──────────────────────────────────────┤
│ Sukses bayar               │ "Pembayaran berhasil"                  │
│ Void diajukan               │ "Permintaan void dikirim ke kepala toko"│
│ Void disetujui               │ "Transaksi TRX-0245 dibatalkan"          │
│ Selisih kas terdeteksi        │ "Ada selisih Rp 85.000. Tambahkan catatan│
│                              │  sebelum lanjut."                       │
│ Login gagal                  │ "PIN salah. Sisa 3 percobaan."           │
│ Outlet offline                │ "Outlet 14 belum mengirim data 2 jam."   │
│ Export selesai                │ "File siap. Unduh laporan ↓"            │
│ Tidak ada data (filter)        │ "Tidak ada transaksi untuk filter ini.   │
│                               │  Coba ubah rentang tanggal."             │
└──────────────────────┴──────────────────────────────────────┘
```

### 10.3 Error message — format wajib

```
Format: [Apa yang terjadi]. [Apa yang bisa dilakukan].

BENAR  : "Koneksi terputus. Transaksi disimpan lokal, akan
          tersinkron otomatis saat online."
SALAH  : "Error: NetworkException at line 245"
SALAH  : "Terjadi kesalahan, silakan coba lagi" (terlalu generic)
```

---

## 11. Aturan Aksesibilitas & Responsiveness

```
A1 — Semua interactive element punya visible focus state
     (outline 2px, warna info/primary) — wajib untuk navigasi keyboard.
A2 — Kontras warna teks-background minimal WCAG AA (4.5:1 teks normal,
     3:1 teks besar/bold ≥ 18px).
A3 — Semua ikon yang membawa makna (bukan dekorasi) WAJIB
     disertai teks atau aria-label — terutama status badge dan
     ikon anomali.
A4 — prefers-reduced-motion WAJIB dihormati di semua platform.
A5 — Web dashboard responsive minimum sampai 768px (tablet kepala
     toko). Di bawah itu, sidebar berubah jadi bottom nav.
A6 — Android app WAJIB mendukung minimum Android 9 (API 28) ke atas,
     mengikuti device Sunmi V2 Pro/T2 Mini yang jadi target hardware.
A7 — Semua form input WAJIB punya label visible (bukan hanya
     placeholder) — placeholder hilang saat user mulai mengetik,
     yang membuat konteks hilang terutama untuk kasir yang terburu-buru.
```

---

## 12. Empty States & Error States

### 12.1 Prinsip

```
Setiap empty state dan error state WAJIB punya:
  1. Penjelasan singkat kenapa kosong/error
  2. Satu aksi jelas yang bisa diambil (bukan dead-end)

Tidak boleh ada halaman yang hanya menampilkan "Tidak ada data"
tanpa konteks atau aksi lanjutan.
```

### 12.2 Contoh per konteks

```
┌─────────────────────┬──────────────────────────────────────┐
│ Konteks                  │ Empty/Error State                       │
├─────────────────────┼──────────────────────────────────────┤
│ Approval queue kosong      │ "Tidak ada yang perlu disetujui.        │
│                            │ Semua transaksi outlet aman."  [✓ ikon] │
│ Tabel outlet, filter kosong │ "Tidak ada outlet sesuai filter.        │
│                            │ Coba ubah filter." [Reset filter]       │
│ Kasir: keranjang kosong      │ "Keranjang masih kosong."                │
│                            │ [+ Tambah Produk] (tombol besar)         │
│ Android offline              │ "Tidak ada koneksi. Transaksi tetap     │
│                            │ bisa dibuat, akan tersinkron nanti."     │
│ Export gagal                  │ "Export gagal — coba lagi." [Coba lagi]  │
│ Owner: tidak ada anomali        │ "Semua outlet aman hari ini." [✓ ikon]  │
└─────────────────────┴──────────────────────────────────────┘
```

---

## 13. Acceptance Criteria UI/UX

### Kasir (Android)

- [ ] Semua tombol aksi utama ≥ 56px tinggi
- [ ] Total transaksi adalah elemen paling kontras di layar
- [ ] Tidak ada menu hamburger/tersembunyi untuk aksi primer
- [ ] Status shift selalu visible tanpa perlu navigasi
- [ ] Kasir tidak pernah diminta pilih outlet manual
- [ ] Void/refund selalu minta alasan sebelum submit
- [ ] expected_cash read-only, dihitung server, tidak bisa diedit
- [ ] Catatan selisih wajib muncul kalau selisih ≠ 0
- [ ] Mode offline: transaksi tetap bisa dibuat, ada indikator status sync
- [ ] Auto re-lock PIN setelah idle N menit (konfigurasi tenant)

### Kepala Toko (Web)

- [ ] Approval queue selalu di posisi teratas landing page
- [ ] Badge jumlah pending persistent di semua halaman
- [ ] Approve/tolak bisa 1 tap dari card list
- [ ] Tolak wajib alasan, setuju alasan opsional
- [ ] Maksimal 4 metric card di landing
- [ ] Transisi card setelah aksi tidak instant-disappear (250ms)

### Area Manager (Web)

- [ ] Default sort tabel: anomali di atas, bukan alfabetis
- [ ] Definisi anomali konsisten dengan dokumen ini (selisih kas,
      offline, sales drop)
- [ ] Tidak ada tombol approve/reject langsung di tabel (read-only
      kecuali permission khusus)
- [ ] Klik baris outlet membawa ke detail read-only

### Admin Tenant (Web)

- [ ] Maksimal 5 item di list anomali dan top performer overview
- [ ] Export selalu tercatat di audit log
- [ ] Aksi sensitif (harga massal, suspend, role) wajib confirmation
      modal dengan ringkasan dampak konkret
- [ ] Audit log 100% read-only, tidak ada tombol edit/hapus
- [ ] Setiap log entry expandable untuk before/after data

### Tenant Owner (Web/Mobile)

- [ ] Landing page tidak ada tabel multi-baris
- [ ] Headline number adalah elemen paling besar di layar
- [ ] WA notification channel dijelaskan eksplisit di UI
- [ ] "Tidak ada anomali" ditampilkan sebagai pesan positif, bukan
      card kosong
- [ ] Drill-down ke outlet list memakai komponen yang sama dengan
      admin tenant (tidak duplikasi maintenance)

### Lintas Role

- [ ] Semua warna status lolos kontras WCAG AA
- [ ] Semua ikon bermakna punya label/aria-label
- [ ] prefers-reduced-motion dihormati di semua platform
- [ ] Microcopy konsisten: nama aksi di tombol = nama aksi di toast
- [ ] Setiap empty/error state punya 1 aksi jelas

---

## 14. Prompt untuk AI CLI / Claude Code

```
Implement UI/UX for a multi-role POS system following this specification.

CONTEXT:
- One backend (Next.js + tRPC), one database, multiple UI "lenses" per role.
- Cashier uses native Android (Expo). Store Manager, Area Manager, Admin
  Tenant, and Owner share ONE Next.js web dashboard with a shared shell —
  sidebar menu and landing page differ based on role permissions, not
  separate codebases.

DESIGN TOKENS:
- Colors: status-driven (success/warning/danger/info), brand colors
  (axi-blue, axi-gold) reserved for navigation/non-critical surfaces only.
- Typography: Inter for UI/body, tabular-nums mandatory for all currency
  and numeric values.
- Touch targets: 36px web minimum, 44px tablet, 56-64px mandatory on
  Android cashier app.
- Motion: functional only. Never animate real-time number updates
  (cash difference, totals). Respect prefers-reduced-motion everywhere.

ROLE-SPECIFIC PRINCIPLES (do not mix these up):
1. Cashier: single-focus screen, no hidden menus, device determines
   outlet (never ask cashier to pick outlet manually). expected_cash is
   always server-computed and read-only.
2. Store Manager: approval queue is always the top element on landing.
   Approve/reject must work from list view in 1 tap; reject requires a
   reason, approve's reason is optional.
3. Area Manager: data table with anomaly-first default sort (not
   alphabetical). Read-only — no approve/reject actions from this table.
4. Admin Tenant: command center pattern — overview metrics, anomaly list,
   top performer list, max 5 items each on landing, drill-down available.
   Every export and every sensitive action (bulk price change, user
   suspend, role change) must write to audit_log and show a confirmation
   modal with concrete impact summary before executing.
5. Owner: single headline number with comparison, narrative tone, max 2
   supporting stats, WhatsApp as explicit primary notification channel.
   "No anomalies" must render as a positive message, never an empty card.

NON-NEGOTIABLE RULES:
- One source of truth: never compute the same metric differently across
  role views — if numbers differ across roles, that's a bug.
- All permission checks happen server-side (see user_has_permission()
  from the schema doc). UI only controls what's displayed, never the
  only gate for sensitive data.
- Every empty state and error state needs exactly one clear action —
  no dead ends.
- All Indonesian microcopy: active voice, sentence case, specific not
  generic, action name in button must match action name in confirmation
  toast.
- Confirmation modals required for: void, refund approval, bulk price
  change, user suspend, role change, any delete action.

REFERENCE DOCS:
- This UI/UX spec (sections 1-13)
- 01_schema.sql, 02_seed.sql, 03_query_patterns.sql (database layer)
- README.md (business logic / operational flows)

BUILD ORDER:
1. Design tokens (Tailwind config / CSS variables matching section 2)
2. Shared web dashboard shell (top bar, sidebar, outlet picker)
3. Component library (Button, MetricCard, ApprovalCard, StatusBadge,
   DataTable, ConfirmationModal) per section 9
4. Cashier Android screens (section 4) — highest priority, most
   frequently used
5. Store Manager screens (section 5)
6. Area Manager screens (section 6)
7. Admin Tenant screens (section 7)
8. Owner screens (section 8)
9. Empty/error states for every screen (section 12)
10. Accessibility audit pass (section 11)
```

---

*Dokumen ini adalah acuan UI/UX untuk LakuPOS / axi multi-tenant POS.*
*Update dokumen ini setiap ada perubahan flow bisnis atau penambahan role baru.*
