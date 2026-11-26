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
  tag?: string
  highlight?: boolean
}

export const LANDING = {
  nav: { features: 'Fitur', how: 'Cara kerja', pricing: 'Harga', faq: 'FAQ', contact: 'Kontak', login: 'Masuk' },
  hero: {
    title: 'Laku POS adalah kasir untuk bengkel dan toko.',
    body: 'Nota servis, stok, member, dan laporan omzet dalam satu aplikasi di browser. Tetap jalan saat internet putus.',
    primary: 'Coba gratis',
    secondary: 'Lihat cara kerja',
  },
  problem: {
    title: 'Usaha yang paling sering dilupakan software kasir.',
    p1: 'Bengkel dan toko kecil menggerakkan ekonomi sehari-hari, tapi kebanyakan masih mencatat di buku nota. Antrean motor ditulis tangan, stok dihitung kira-kira, dan pemilik baru tahu untung-rugi saat tutup bulan.',
    p2: 'Yang dibutuhkan bukan aplikasi kasir umum lagi, tapi kasir yang paham cara kerja bengkel: nota per plat, mekanik per servis, pelanggan yang bayar belakangan, dan sparepart yang keluar-masuk setiap jam.',
    builtFor: 'Dibuat untuk',
    builtForItems: ['Bengkel motor', 'Toko sparepart', 'Cuci motor', 'Warung', 'Laundry'],
    worksWith: 'Siap dengan perangkat',
    worksWithItems: ['Printer 58/80 mm', 'Scanner USB', 'Laci kasir', 'QRIS', 'Label A4'],
  },
  why: {
    title: 'Yang membuat Laku POS berbeda.',
    items: [
      { title: 'Dibuat untuk bengkel', body: 'Nota per plat nomor, antrean motor, mekanik per servis, dan riwayat servis tiap kendaraan. Pelanggan boleh bayar belakangan, antrean tetap rapi.' },
      { title: 'Tidak berhenti saat offline', body: 'Internet putus, nota dan pembayaran tunai tetap jalan. Semua terkirim sendiri begitu koneksi kembali.' },
      { title: 'Scan, cetak, selesai', body: 'Barcode dan label A4 dibuat otomatis. Scan barang, struk langsung keluar dari printer thermal tanpa dialog.' },
      { title: 'Angka yang bisa dipakai', body: 'Omzet, laba kotor, jam ramai, barang paling laku, dan kerja mekanik hari ini, dibandingkan dengan periode sebelumnya.' },
    ],
  },
  steps: [
    { n: '01', title: 'Daftar dan atur toko.', body: 'Buat akun gratis, pilih jenis usaha, impor daftar barang dari Excel. Barcode dibuat otomatis.' },
    { n: '02', title: 'Jualan dan servis.', body: 'Buka nota per motor, scan sparepart, pilih mekanik, terima tunai atau QRIS. Struk langsung tercetak.' },
    { n: '03', title: 'Pantau dari mana saja.', body: 'Omzet, laba, stok menipis, dan antrean hari ini terlihat dari HP pemilik, kapan saja.' },
  ],
  statement: {
    title: 'Kasir yang ikut kerja keras.',
    body: 'Untuk bengkel dan toko yang buka dari pagi sampai malam: cepat di jam ramai, rapi saat tutup buku.',
  },
  dark: {
    title: 'Lebih untung di setiap transaksi.',
    body: 'Diskon tercatat dengan alasannya, stok berkurang sendiri, dan laba dihitung dari harga modal. Pemilik tahu ke mana uangnya pergi tanpa menunggu tutup buku.',
    side: 'Setiap transaksi tercatat rapi, dari kasir sampai laporan pemilik.',
    cta: 'Tanya lewat WhatsApp',
  },
  platform: {
    title: 'Laku POS: satu aplikasi untuk seluruh usaha.',
    body: 'Kasir, bengkel, dan gudang memakai data yang sama. Begitu barang terjual atau motor selesai diservis, stok, laporan, dan kartu member langsung ikut berubah:',
    primary: 'Coba gratis',
    secondary: 'Lihat harga',
    cards: [
      { title: 'Kasir dan pembayaran', body: 'Scan barang, keranjang terlihat di samping total, tunai atau QRIS, struk langsung tercetak.' },
      { title: 'Nota servis dan member', body: 'Antrean per plat, mekanik per servis, kartu stempel dan voucher untuk pelanggan setia.' },
      { title: 'Gudang dan laporan', body: 'Stok masuk, stok menipis, label barcode, dan laporan omzet serta laba setiap hari.' },
    ],
  },
  ready: {
    title: 'Siap dipakai hari ini, tumbuh bersama usaha Anda.',
    body: 'Mulai dari satu kasir di satu outlet. Tambah kasir, outlet, dan fitur saat usaha berkembang, tanpa pindah aplikasi dan tanpa kehilangan data.',
    cta: 'Lihat harga',
  },
  pricing: {
    title: 'Harga yang jelas',
    subscription: 'Berlangganan',
    oneTime: 'Sekali bayar',
    showOnce: 'Lihat paket sekali bayar',
    showSub: 'Lihat paket berlangganan',
    body: 'Mulai gratis, naik paket kapan saja. Semua harga dalam rupiah, tanpa biaya tersembunyi.',
    footnote: 'Butuh paket khusus untuk beberapa cabang? Hubungi kami, kami siapkan penawarannya.',
    contact: 'Hubungi kami',
    sub: [
      { name: 'Gratis', price: 'Rp 0', note: 'Untuk mulai mencoba.', features: ['1 outlet, 1 kasir', 'POS dasar', '100 transaksi per bulan', 'Laporan harian'], cta: 'Daftar gratis', href: '/register', tag: 'Selamanya' },
      { name: 'Warung', price: 'Rp 99rb', period: '/bulan', note: 'Toko yang aktif setiap hari.', features: ['Transaksi tanpa batas', 'POS + inventori', 'Mode offline', 'Dukungan WhatsApp'], cta: 'Pilih paket', waMessage: 'Halo, saya tertarik paket Warung Laku POS (Rp 99rb/bulan).', tag: 'Terjangkau' },
      { name: 'Starter', price: 'Rp 299rb', period: '/bulan', note: 'Usaha yang mulai berkembang.', features: ['3 pengguna', 'Inventori lanjutan', 'Ekspor PDF & Excel', 'Backup cloud'], cta: 'Pilih paket', waMessage: 'Halo, saya tertarik paket Starter Laku POS (Rp 299rb/bulan).', tag: 'Berkembang' },
      { name: 'Professional', price: 'Rp 1,2jt', period: '/bulan', note: 'Usaha dengan beberapa outlet.', features: ['3 outlet, 10 pengguna', 'Audit log & API', 'Laporan kustom', 'Dukungan prioritas'], cta: 'Pilih paket', waMessage: 'Halo, saya tertarik paket Professional Laku POS (Rp 1,2jt/bulan).', tag: 'Populer', highlight: true },
    ] as Plan[],
    once: [
      { name: 'SME', price: 'Rp 75jt', period: 'sekali bayar', note: 'UKM, bayar sekali.', features: ['1–3 outlet', 'Setup & pelatihan', 'Update 1 tahun', 'Source code (+30%)'], cta: 'Minta penawaran', waMessage: 'Halo, saya tertarik paket sekali bayar SME Laku POS (Rp 75jt).', tag: 'Seumur hidup' },
      { name: 'Business', price: 'Rp 150jt', period: 'sekali bayar', note: 'Termasuk source code.', features: ['5–10 outlet', 'Termasuk source code', 'Bisa self-host', 'Update 2 tahun'], cta: 'Minta penawaran', waMessage: 'Halo, saya tertarik paket sekali bayar Business Laku POS (Rp 150jt).', tag: 'Terlengkap', highlight: true },
      { name: 'Enterprise', price: 'Rp 300jt', period: 'sekali bayar', note: 'Skala besar dan white-label.', features: ['Outlet tanpa batas', 'Fitur kustom', 'Jaminan SLA', 'Account manager & white-label'], cta: 'Hubungi kami', waMessage: 'Halo, saya tertarik paket Enterprise Laku POS (Rp 300jt).', tag: 'White-label' },
    ] as Plan[],
  },
  faq: {
    title: 'Pertanyaan umum.',
    items: [
      { q: 'Apakah benar-benar gratis?', a: 'Ya. Paket Gratis tidak perlu kartu kredit dan bisa dipakai selamanya, dengan batas 100 transaksi per bulan — cukup untuk usaha yang baru mulai.' },
      { q: 'Bisa dipakai untuk usaha selain bengkel?', a: 'Bisa. Laku POS mendukung toko/retail, kuliner, jasa (bengkel, barbershop, laundry, cuci motor), dan campuran. Perilaku stok dan harga menyesuaikan jenis usaha.' },
      { q: 'Bisa dipakai di HP?', a: 'Bisa. Buka di browser HP atau komputer, langsung transaksi tanpa instal aplikasi.' },
      { q: 'Bagaimana kalau internet mati?', a: 'Ada mode offline. Nota dan pembayaran tunai tetap jalan, lalu terkirim otomatis begitu internet kembali.' },
      { q: 'Apakah data saya aman?', a: 'Data setiap usaha terpisah penuh dan hanya bisa dibuka akun usaha itu. Data dicadangkan setiap hari dan tersimpan terenkripsi.' },
    ],
  },
  contact: {
    title: 'Mari bikin usaha Anda makin laku.',
    body: 'Pemilik bengkel, toko, atau calon mitra — ceritakan usaha Anda, kami bantu memilih paket dan menyiapkan kasirnya.',
    whatsapp: 'WhatsApp',
    tabs: ['Umum', 'Bengkel', 'Toko', 'Kemitraan'],
    name: 'Nama lengkap',
    phone: 'Nomor WhatsApp',
    business: 'Nama usaha',
    message: 'Ceritakan kebutuhan Anda',
    agree: 'Saya setuju dihubungi lewat WhatsApp',
    submit: 'Mulai percakapan',
    sending: 'Mengirim…',
    failed: 'Pesan gagal terkirim. Coba lagi atau hubungi kami lewat WhatsApp.',
    sentTitle: 'Pesan Anda sudah kami terima.',
    sentBody: 'Tim Laku POS akan menghubungi Anda lewat WhatsApp. Kalau mendesak, langsung chat kami saja.',
    sentWhatsapp: 'Chat sekarang',
    sendAnother: 'Kirim pesan lain',
  },
  footer: {
    company: 'Perusahaan',
    product: 'Produk',
    account: 'Akun',
    rights: 'Hak cipta dilindungi.',
    tagline: 'Kasir dan stok untuk bengkel dan toko di Indonesia.',
  },
}
