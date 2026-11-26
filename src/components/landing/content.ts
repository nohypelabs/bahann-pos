// Landing page copy, plans and FAQ. Indonesian: the landing page speaks to Indonesian shop owners.
// Prices and plan contents carry over from the previous landing page.

export interface Plan {
  name: string
  price: string
  period?: string
  note: string
  features: string[]
  cta: string
  /** Sign-up link, or a WhatsApp message to the team. */
  href?: string
  waMessage?: string
  highlight?: boolean
  tag?: string
}

export const LANDING = {
  nav: { features: 'Fitur', pricing: 'Harga', faq: 'FAQ', login: 'Masuk', register: 'Coba gratis' },
  hero: {
    title: 'Kasir untuk bengkel dan toko yang tidak pernah berhenti jualan.',
    body: 'Nota servis, stok, member, dan laporan omzet di satu aplikasi. Tetap jalan saat internet putus, langsung dari browser tanpa instal.',
    primary: 'Coba gratis',
    secondary: 'Lihat fitur',
  },
  why: {
    title: 'Yang membuat Laku POS berbeda',
    items: [
      { title: 'Dibuat untuk bengkel', body: 'Nota per plat nomor, antrean motor, mekanik per servis, dan riwayat servis tiap kendaraan. Pelanggan boleh bayar belakangan, antrean tetap rapi.' },
      { title: 'Tidak berhenti saat offline', body: 'Internet putus, nota dan pembayaran tunai tetap jalan. Semua terkirim sendiri begitu koneksi kembali.' },
      { title: 'Scan, cetak, selesai', body: 'Barcode dan label A4 dibuat otomatis. Scan barang, struk keluar dari printer thermal tanpa dialog.' },
      { title: 'Angka yang bisa dipakai', body: 'Omzet, laba kotor, jam ramai, barang paling laku, dan kerja mekanik hari ini — dibandingkan dengan periode sebelumnya.' },
      { title: 'Harga dan dukungan lokal', body: 'Mulai gratis, bayar per bulan dalam rupiah, dan bantuan langsung lewat WhatsApp.' },
    ],
  },
  dark: {
    title: 'Lebih untung di setiap transaksi.',
    body: 'Diskon tercatat dengan alasannya, stok berkurang sendiri, dan laba dihitung dari harga modal. Pemilik tahu ke mana uangnya pergi tanpa menunggu tutup buku.',
    side: 'Setiap transaksi tercatat rapi, dari kasir sampai laporan.',
    cta: 'Tanya lewat WhatsApp',
  },
  features: {
    title: 'Semua yang dipakai setiap hari',
    items: [
      { tag: 'Kasir', title: 'Kasir cepat dengan scanner', body: 'Scan barang, keranjang terlihat di samping total, bayar tunai atau QRIS, struk langsung tercetak.' },
      { tag: 'Bengkel', title: 'Nota servis dan antrean motor', body: 'Buka nota per plat, tambah jasa dan sparepart, pilih mekanik, bayar saat motor selesai.' },
      { tag: 'Member', title: 'Kartu stempel dan voucher', body: 'Pelanggan setia dapat servis gratis otomatis. Riwayat motor dan belanja tersimpan per member.' },
      { tag: 'Gudang', title: 'Stok, barcode, dan label', body: 'Catat stok masuk, pantau stok menipis, buat barcode dan cetak label A4 untuk ditempel.' },
    ],
    more: 'Coba sekarang',
  },
  pricing: {
    title: 'Harga yang jelas',
    body: 'Mulai gratis, naik paket kapan saja.',
    subscription: 'Berlangganan',
    oneTime: 'Sekali bayar',
    sub: [
      { name: 'Gratis', price: 'Rp 0', note: 'Untuk mulai mencoba', features: ['1 outlet, 1 kasir', 'POS dasar', '100 transaksi/bulan', 'Laporan harian'], cta: 'Daftar gratis', href: '/register', tag: 'Selamanya' },
      { name: 'Warung', price: 'Rp 99rb', period: '/bulan', note: 'Toko yang aktif setiap hari', features: ['Transaksi tanpa batas', 'POS + inventori', 'Mode offline', 'Dukungan WhatsApp'], cta: 'Pilih Warung', waMessage: 'Halo, saya tertarik paket Warung Laku POS (Rp 99rb/bulan).' },
      { name: 'Starter', price: 'Rp 299rb', period: '/bulan', note: 'Usaha yang berkembang', features: ['3 pengguna', 'Inventori lanjutan', 'Ekspor PDF & Excel', 'Backup cloud'], cta: 'Pilih Starter', waMessage: 'Halo, saya tertarik paket Starter Laku POS (Rp 299rb/bulan).' },
      { name: 'Professional', price: 'Rp 1,2jt', period: '/bulan', note: 'Beberapa outlet', features: ['3 outlet, 10 pengguna', 'Audit log & API', 'Laporan kustom', 'Dukungan prioritas'], cta: 'Pilih Professional', waMessage: 'Halo, saya tertarik paket Professional Laku POS (Rp 1,2jt/bulan).', highlight: true, tag: 'Populer' },
    ] as Plan[],
    once: [
      { name: 'SME', price: 'Rp 75jt', note: 'UKM, bayar sekali', features: ['1–3 outlet', 'Setup & pelatihan', 'Update 1 tahun', 'Source code (+30%)'], cta: 'Minta penawaran', waMessage: 'Halo, saya tertarik paket sekali bayar SME Laku POS (Rp 75jt).', tag: 'Seumur hidup' },
      { name: 'Business', price: 'Rp 150jt', note: 'Termasuk source code', features: ['5–10 outlet', 'Source code', 'Self-host', 'Update 2 tahun'], cta: 'Minta penawaran', waMessage: 'Halo, saya tertarik paket sekali bayar Business Laku POS (Rp 150jt).', highlight: true, tag: 'Terlengkap' },
      { name: 'Enterprise', price: 'Rp 300jt', note: 'Enterprise + white-label', features: ['Outlet tanpa batas', 'Fitur kustom', 'Jaminan SLA', 'Account manager'], cta: 'Hubungi kami', waMessage: 'Halo, saya tertarik paket Enterprise Laku POS (Rp 300jt).', tag: 'White-label' },
    ] as Plan[],
  },
  faq: {
    title: 'Pertanyaan umum',
    items: [
      { q: 'Apakah benar-benar gratis?', a: 'Ya. Paket Gratis tidak perlu kartu kredit dan bisa dipakai selamanya, dengan batas 100 transaksi per bulan — cukup untuk usaha yang baru mulai.' },
      { q: 'Bisa dipakai untuk usaha selain toko?', a: 'Bisa. Laku POS mendukung toko/retail, kuliner, jasa (bengkel, barbershop, laundry, cuci motor), dan campuran. Perilaku stok dan harga menyesuaikan jenis usaha.' },
      { q: 'Bisa dipakai di HP?', a: 'Bisa. Buka di browser HP atau komputer, langsung transaksi tanpa instal aplikasi.' },
      { q: 'Bagaimana kalau internet mati?', a: 'Ada mode offline. Nota dan pembayaran tunai tetap jalan, lalu terkirim otomatis begitu internet kembali.' },
      { q: 'Apakah data saya aman?', a: 'Data setiap usaha terpisah penuh dan hanya bisa dibuka akun usaha itu. Data dicadangkan setiap hari dan tersimpan terenkripsi.' },
    ],
  },
  cta: {
    title: 'Siap jualan lebih rapi?',
    body: 'Daftar gratis sekarang. Tanpa kartu kredit, tanpa instal.',
    primary: 'Daftar gratis',
    secondary: 'Chat WhatsApp',
    waMessage: 'Halo, saya ingin konsultasi Laku POS.',
  },
  footer: {
    tagline: 'Kasir dan stok untuk bengkel dan toko di Indonesia.',
    product: 'Produk',
    company: 'Bantuan',
    contact: 'Hubungi kami',
    rights: 'Hak cipta dilindungi.',
  },
}
