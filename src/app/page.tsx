'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme/ThemeContext'

const WA_NUMBER = '6287874415491'
function buildWaLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

interface ChatMessage { from: 'bot' | 'user'; text: string }

const QUICK_ACTIONS = [
  { label: '💰 Tanya harga', waMessage: 'Halo, saya ingin tanya harga paket Laku POS.' },
  { label: '📅 Jadwalkan demo', waMessage: 'Halo, saya ingin jadwalkan demo Laku POS.' },
  { label: '🤝 Jadi mitra', waMessage: 'Halo, saya tertarik jadi mitra Laku POS.' },
  { label: '❓ Pertanyaan lain', waMessage: 'Halo, saya punya pertanyaan tentang Laku POS.' },
]

const INDUSTRIES = [
  { icon: '🏪', label: 'Warung Kelontong' },
  { icon: '🍜', label: 'Warung Makan' },
  { icon: '☕', label: 'Kafe & Minuman' },
  { icon: '👗', label: 'Toko Fashion' },
  { icon: '💊', label: 'Apotek Kecil' },
  { icon: '🛒', label: 'Minimarket' },
]

const STEPS = [
  { n: '1', title: 'Daftar Gratis', desc: 'Buat akun dalam 1 menit. Tidak perlu kartu kredit.' },
  { n: '2', title: 'Setup Toko', desc: 'Masukkan nama toko, tambah produk, dan undang kasir.' },
  { n: '3', title: 'Mulai Jualan', desc: 'Langsung pakai POS di HP atau laptop. Semudah itu.' },
]

const FEATURES = [
  {
    icon: '🏪',
    title: 'POS Cepat',
    desc: 'Transaksi dalam hitungan detik. Dukung cash, transfer, dan QRIS.',
    points: ['Multi-metode pembayaran', 'Barcode & kamera scanner', 'Cetak struk otomatis', 'Diskon & promo'],
  },
  {
    icon: '📦',
    title: 'Stok Real-time',
    desc: 'Pantau stok dari mana saja. Alert otomatis saat barang hampir habis.',
    points: ['Notifikasi stok menipis', 'Riwayat pergerakan stok', 'Multi-outlet', 'Stok opname mudah'],
  },
  {
    icon: '📊',
    title: 'Laporan Lengkap',
    desc: 'Dashboard penjualan real-time. Tahu produk terlaris setiap hari.',
    points: ['Grafik penjualan harian', 'Produk terlaris', 'Ekspor PDF & Excel', 'Laporan per kasir'],
  },
  {
    icon: '📱',
    title: 'Mode Offline',
    desc: 'Internet mati? Transaksi tetap jalan. Data sync otomatis saat online lagi.',
    points: ['Transaksi tanpa internet', 'Auto-sync real-time', 'Data tidak hilang', 'Zero downtime'],
  },
  {
    icon: '👥',
    title: 'Manajemen Kasir',
    desc: 'Tambah kasir, atur hak akses, dan pantau aktivitas mereka.',
    points: ['Multi-kasir per toko', 'Kontrol hak akses', 'Audit log lengkap', 'Shift & closing'],
  },
  {
    icon: '🔒',
    title: 'Aman & Terpercaya',
    desc: 'Data Anda terenkripsi dan terisolasi. Hanya Anda yang bisa akses.',
    points: ['Enkripsi end-to-end', 'Data terisolasi per toko', 'Backup otomatis', 'RLS database'],
  },
]

const FAQS = [
  { q: 'Apakah benar-benar gratis?', a: 'Ya! Paket Gratis tidak perlu kartu kredit dan bisa dipakai selamanya. Limit 100 transaksi/bulan — cukup untuk warung yang baru mulai.' },
  { q: 'Apakah bisa dipakai di HP?', a: 'Tentu! Laku POS dirancang mobile-first. Buka di browser HP Anda, langsung bisa transaksi tanpa install aplikasi.' },
  { q: 'Bagaimana kalau internet mati?', a: 'Ada mode offline. Transaksi tetap berjalan dan data akan sync otomatis begitu internet kembali.' },
  { q: 'Apakah data saya aman?', a: 'Data setiap warung terisolasi penuh. Hanya Anda yang bisa akses data toko Anda. Kami pakai enkripsi dan Row Level Security di database.' },
  { q: 'Bisa untuk beberapa kasir?', a: 'Bisa! Admin (pemilik warung) bisa tambah kasir dari menu Pengaturan dan atur hak akses masing-masing.' },
  { q: 'Kalau mau upgrade gimana?', a: 'Hubungi kami via WhatsApp, proses upgrade cepat dan data tidak hilang sama sekali.' },
]

export default function LandingPage() {
  const [pricingMode, setPricingMode] = useState<'subscription' | 'onetime'>('subscription')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [quickActionsVisible, setQuickActionsVisible] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  function openWa(msg: string) { window.open(buildWaLink(msg), '_blank', 'noopener,noreferrer') }

  function handleQuickAction(action: { label: string; waMessage: string }) {
    setQuickActionsVisible(false)
    setChatMessages(p => [...p, { from: 'user', text: action.label }])
    setTimeout(() => {
      setChatMessages(p => [...p, { from: 'bot', text: 'Baik! Kami sambungkan ke tim kami via WhatsApp sekarang 💬' }])
      setTimeout(() => openWa(action.waMessage), 800)
    }, 500)
  }

  function handleSend() {
    const text = chatMessage.trim()
    if (!text) return
    setQuickActionsVisible(false)
    setChatMessages(p => [...p, { from: 'user', text }])
    setChatMessage('')
    setTimeout(() => {
      setChatMessages(p => [...p, { from: 'bot', text: 'Terima kasih! Tim kami akan balas via WhatsApp sekarang 💬' }])
      setTimeout(() => openWa(`Halo, saya punya pertanyaan: ${text}`), 800)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Laku POS" className="w-8 h-8" />
            <span className="text-xl font-bold text-green-600">Laku POS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="#cara-kerja" className="hover:text-green-600 transition-colors">Cara Kerja</a>
            <a href="#fitur" className="hover:text-green-600 transition-colors">Fitur</a>
            <a href="#harga" className="hover:text-green-600 transition-colors">Harga</a>
            <a href="#faq" className="hover:text-green-600 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-base" aria-label="Toggle dark mode">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link href="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-green-600 transition-colors">
              Masuk
            </Link>
            <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-20 pb-24 px-4 text-center bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            🚀 Gratis selamanya untuk warung kecil
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            Kasir Digital<br />
            <span className="text-green-600">untuk Warung</span><br />
            Indonesia
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Kelola penjualan, stok, dan laporan dari HP Anda. Tanpa ribet, tanpa mahal.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-lg font-bold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5">
              Mulai Gratis Sekarang →
            </Link>
            <a href={buildWaLink('Halo, saya ingin jadwalkan demo Laku POS. Kapan bisa?')} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-lg font-semibold px-8 py-4 rounded-xl hover:border-green-600 hover:text-green-600 transition-all">
              💬 Minta Demo
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Tidak perlu kartu kredit · Setup &lt; 5 menit · Data 100% milik Anda
          </p>
        </div>

        {/* App preview mockup */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 mx-4 bg-white dark:bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-left">
                app.lakupos.id/dashboard
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Omset Hari Ini', value: 'Rp 1,2jt', color: 'bg-green-500' },
                  { label: 'Transaksi', value: '24', color: 'bg-blue-500' },
                  { label: 'Produk Terjual', value: '67', color: 'bg-purple-500' },
                  { label: 'Stok Menipis', value: '3', color: 'bg-orange-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                    <div className={`w-6 h-1.5 rounded-full ${s.color} mb-2`}></div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
                    <div className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Penjualan 7 Hari Terakhir</span>
                  <span className="text-xs text-green-600 font-semibold">+18% vs minggu lalu</span>
                </div>
                <div className="flex items-end gap-2 h-16">
                  {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 flex items-end">
                      <div className="w-full bg-green-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                    <span key={d} className="text-xs text-gray-400 flex-1 text-center">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRY VERTICALS ── */}
      <section className="py-12 border-y border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">Cocok untuk berbagai jenis usaha</p>
          <div className="flex flex-wrap justify-center gap-3">
            {INDUSTRIES.map((ind, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <span>{ind.icon}</span>
                <span>{ind.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-4 bg-white dark:bg-gray-950" id="cara-kerja">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Cara Kerja</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-16">Mulai dalam 3 Langkah</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-green-100 dark:bg-green-900/40"></div>
                )}
                <div className="w-16 h-16 bg-green-600 text-white text-2xl font-extrabold rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200 dark:shadow-green-900/30">
                  {step.n}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="inline-block mt-12 bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-xl transition-all hover:shadow-lg">
            Coba Sekarang — Gratis
          </Link>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900" id="fitur">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Fitur</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Semua yang Warung Butuhkan</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Dari POS sampai laporan — satu aplikasi, tidak perlu software lain.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg transition-all group">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-green-600 transition-colors">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">{f.desc}</p>
                <ul className="space-y-1.5">
                  {f.points.map((p, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-green-500 font-bold">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 px-4 bg-white dark:bg-gray-950" id="harga">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Harga</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Transparan, Tanpa Biaya Tersembunyi</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Mulai gratis, upgrade kapan saja.</p>

            <div className="inline-flex mt-8 bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1">
              {(['subscription', 'onetime'] as const).map(mode => (
                <button key={mode} onClick={() => setPricingMode(mode)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${pricingMode === mode ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                  {mode === 'subscription' ? 'Berlangganan' : 'Sekali Bayar'}
                </button>
              ))}
            </div>
          </div>

          {pricingMode === 'subscription' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PricingCard name="Gratis" price="Rp 0" badge="SELAMANYA" badgeColor="bg-green-500"
                desc="Untuk warung yang baru coba"
                features={['1 Outlet', '1 Kasir', 'POS Dasar', 'Maks. 100 transaksi/bulan', 'Laporan Harian', 'Tanpa kartu kredit']}
                cta="Daftar Gratis" href="/register" />
              <PricingCard name="Warung" price="Rp 99rb" period="/bulan" badge="TERJANGKAU" badgeColor="bg-orange-500"
                desc="Untuk warung aktif sehari-hari"
                features={['1 Outlet', '2 Kasir', 'Transaksi Tidak Terbatas', 'POS + Inventori', 'Laporan Harian & Mingguan', 'Mode Offline', 'Support WhatsApp']}
                cta="Pilih Warung" waMsg="Halo, saya tertarik paket Warung Laku POS (Rp 99rb/bulan)." />
              <PricingCard name="Starter" price="Rp 299rb" period="/bulan" badge="HEMAT 25%" badgeColor="bg-red-500"
                desc="Untuk toko kecil yang berkembang"
                features={['1 Outlet', '3 Pengguna', 'Fitur POS Lengkap', 'Inventori Lanjutan', 'Laporan + Ekspor', 'Mode Offline', 'Support Email & WA', 'Backup Cloud']}
                cta="Pilih Starter" waMsg="Halo, saya tertarik paket Starter Laku POS (Rp 299rb/bulan)." />
              <PricingCard name="Professional" price="Rp 1,2jt" period="/bulan" badge="POPULER" badgeColor="bg-blue-500"
                desc="Untuk bisnis multi-outlet"
                features={['3 Outlet', '10 Pengguna', 'Semua Fitur Starter', 'Multi-outlet Inventori', 'Audit Log', 'Akses API', 'Laporan Kustom', 'Support Prioritas', 'Integrasi QRIS']}
                cta="Pilih Professional" waMsg="Halo, saya tertarik paket Professional Laku POS (Rp 1,2jt/bulan)." popular />
            </div>
          )}

          {pricingMode === 'onetime' && (
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <PricingCard name="SME Package" price="Rp 75jt" badge="LISENSI SEUMUR HIDUP" badgeColor="bg-gray-600"
                desc="Untuk UKM — bayar sekali, pakai selamanya"
                features={['1–3 Outlet', '5–10 Pengguna', 'Setup & Pelatihan', 'Update Gratis 1 Tahun', 'Support Email', 'Source Code (+30%)']}
                cta="Minta Penawaran" waMsg="Halo, saya tertarik paket One-Time SME Laku POS (Rp 75jt)." />
              <PricingCard name="Business" price="Rp 150jt" badge="TERLENGKAP" badgeColor="bg-green-600"
                desc="Solusi lengkap termasuk source code"
                features={['5–10 Outlet', 'Pengguna Tak Terbatas', 'Source Code Termasuk', '1x Kustomisasi Minor', 'Update Gratis 2 Tahun', 'Opsi Self-Host', 'Onboarding Khusus']}
                cta="Minta Penawaran" waMsg="Halo, saya tertarik paket One-Time Business Laku POS (Rp 150jt)." popular />
              <PricingCard name="Enterprise" price="Rp 300jt" badge="WHITE-LABEL" badgeColor="bg-purple-600"
                desc="Solusi enterprise + white-label"
                features={['Outlet Tak Terbatas', 'Pengguna Tak Terbatas', 'Source Code Lengkap', '3 Fitur Custom', 'White-label', 'SLA Garansi', 'Update Seumur Hidup', 'Account Manager']}
                cta="Hubungi Sales" waMsg="Halo, saya tertarik paket Enterprise Laku POS (Rp 300jt)." />
            </div>
          )}

          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">Butuh lebih? Paket Business & Enterprise tersedia</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Multi-outlet, white-label, SLA, dan account manager khusus.</p>
            </div>
            <a href={buildWaLink('Halo, saya ingin tanya paket Business/Enterprise Laku POS.')} target="_blank" rel="noopener noreferrer"
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
              Hubungi Sales
            </a>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">Perbandingan</p>
            <h2 className="text-4xl font-extrabold">Kenapa Pilih Laku POS?</h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="py-4 px-6 text-left font-semibold">Fitur</th>
                    <th className="py-4 px-6 text-center font-semibold">✅ Laku POS</th>
                    <th className="py-4 px-6 text-center font-semibold text-green-200">Moka POS</th>
                    <th className="py-4 px-6 text-center font-semibold text-green-200">iReap POS</th>
                    <th className="py-4 px-6 text-center font-semibold text-green-200">Pawoon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    ['Harga Mulai Dari', <span className="text-green-600 font-bold">Gratis</span>, 'Rp 1,2jt', 'Rp 800rb', 'Rp 999rb'],
                    ['Mode Offline', '✅', '❌', 'Terbatas', '❌'],
                    ['Multi-outlet', '✅', '✅', '✅', '✅'],
                    ['Source Code Tersedia', '✅', '❌', '❌', '❌'],
                    ['Self-hosted', '✅', '❌', '❌', '❌'],
                    ['Audit Log Lengkap', '✅', 'Basic', 'Basic', 'Basic'],
                    ['Pembelian Sekali Bayar', '✅', '❌', '❌', '❌'],
                    ['Support WhatsApp', '✅', 'Terbatas', '❌', '❌'],
                  ].map(([feat, ...vals], i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="py-3 px-6 font-medium text-gray-900 dark:text-gray-100">{feat}</td>
                      <td className="py-3 px-6 text-center font-bold text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20">{vals[0]}</td>
                      {vals.slice(1).map((v, j) => (
                        <td key={j} className="py-3 px-6 text-center text-gray-500 dark:text-gray-400">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── EARLY ADOPTER ── */}
      <section className="py-24 px-4 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            🚀 Baru Diluncurkan
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Jadilah Pengguna Pertama</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
            Kami sedang mencari warung & toko kecil yang mau tumbuh bersama kami. Pengguna awal dapat keuntungan eksklusif.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: '💰', title: 'Harga Terjangkau Selamanya', desc: 'Daftar sekarang, harga dikunci — tidak naik meski kami berkembang.' },
              { icon: '🎯', title: 'Feedback Langsung', desc: 'Fitur yang Anda butuhkan bisa kami prioritaskan. Akses langsung ke developer.' },
              { icon: '🤝', title: 'Support Personal via WA', desc: 'Bukan chatbot. Tim kami siap bantu setup dan pertanyaan apapun.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-green-600 rounded-2xl p-8 text-white">
            <p className="text-lg font-semibold mb-4">Cocok untuk jenis usaha Anda?</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {INDUSTRIES.map(ind => (
                <span key={ind.label} className="bg-white/20 px-3 py-1.5 rounded-full text-sm font-medium">
                  {ind.icon} {ind.label}
                </span>
              ))}
            </div>
            <a href={buildWaLink('Halo, saya tertarik jadi pengguna awal Laku POS. Boleh info lebih lanjut?')} target="_blank" rel="noopener noreferrer"
              className="inline-block bg-white text-green-600 hover:bg-green-50 font-bold px-8 py-3 rounded-xl transition-colors">
              💬 Tanya Tim Kami via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-600 font-semibold text-sm uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-extrabold">Pertanyaan Umum</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-green-300 dark:hover:border-green-700 transition-all overflow-hidden">
                <div className="flex justify-between items-center p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 pr-4">{faq.q}</h3>
                  <span className="text-green-600 font-bold text-xl shrink-0">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-4 bg-green-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Siap Bikin Warung Makin Laku?</h2>
          <p className="text-xl mb-10 opacity-90">Daftar gratis sekarang. Tidak perlu kartu kredit, tidak perlu install aplikasi.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-green-600 hover:bg-green-50 font-bold text-lg px-8 py-4 rounded-xl transition-all hover:shadow-lg">
              Mulai Gratis Sekarang →
            </Link>
            <a href={buildWaLink('Halo, saya ingin konsultasi dan demo Laku POS.')} target="_blank" rel="noopener noreferrer"
              className="border-2 border-white text-white hover:bg-white/10 font-bold text-lg px-8 py-4 rounded-xl transition-all">
              💬 Hubungi Kami
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.svg" alt="Laku POS" className="w-8 h-8" />
                <span className="text-xl font-bold text-green-400">Laku POS</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-sm">
                Kasir digital modern untuk warung dan toko kecil Indonesia. Gratis, mudah, dan aman.
              </p>
              <a href={buildWaLink('Halo, saya ingin tanya tentang Laku POS.')} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                💬 Chat via WhatsApp
              </a>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-green-400">Produk</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#fitur" className="hover:text-white transition-colors">Fitur</a></li>
                <li><a href="#harga" className="hover:text-white transition-colors">Harga</a></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Daftar Gratis</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-green-400">Bantuan</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href={buildWaLink('Halo, saya butuh bantuan Laku POS.')} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Support WhatsApp</a></li>
                <li><a href="#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
            <p>© 2025 Laku POS. Hak cipta dilindungi.</p>
            <p>Dibuat dengan ❤️ untuk warung Indonesia</p>
          </div>
        </div>
      </footer>

      {/* ── CHAT WIDGET ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="bg-green-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">L</div>
                <div>
                  <h3 className="font-bold text-sm">Laku POS Support</h3>
                  <p className="text-xs opacity-80">Biasanya balas dalam menit</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded-full p-1.5 transition-colors text-lg">✕</button>
            </div>
            <div className="h-80 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">L</div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-[80%]">
                  <p className="text-sm text-gray-800 dark:text-gray-200">👋 Halo! Ada yang bisa kami bantu?</p>
                </div>
              </div>
              {quickActionsVisible && (
                <div className="space-y-2">
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.label} onClick={() => handleQuickAction(a)}
                      className="w-full text-left bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-gray-700 px-3 py-2.5 rounded-xl shadow-sm transition-colors text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {chatMessages.map((msg, i) => (
                msg.from === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="bg-green-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm max-w-[80%] text-sm">{msg.text}</div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">L</div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-[80%] text-sm text-gray-800 dark:text-gray-200">{msg.text}</div>
                  </div>
                )
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <input value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ketik pesan..." className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-full text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-500" />
                <button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors">Kirim</button>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(!chatOpen)}
          className={`${chatOpen ? 'hidden' : 'flex'} relative items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 font-semibold`}>
          <span className="text-xl">💬</span>
          <span>Chat dengan Kami</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      </div>
    </div>
  )
}

interface PricingCardProps {
  name: string; price: string; period?: string
  badge?: string; badgeColor?: string
  desc: string; features: string[]
  cta: string; popular?: boolean
  href?: string; waMsg?: string
}

function PricingCard({ name, price, period, badge, badgeColor, desc, features, cta, popular, href, waMsg }: PricingCardProps) {
  const btnClass = `block w-full text-center py-3 rounded-xl font-semibold transition-all ${
    popular
      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30'
      : 'bg-gray-50 dark:bg-gray-700 text-green-600 dark:text-green-400 border-2 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-gray-600'
  }`
  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-all hover:-translate-y-1 hover:shadow-xl ${
      popular ? 'border-green-500 shadow-lg shadow-green-100 dark:shadow-green-900/20' : 'border-gray-100 dark:border-gray-700'
    }`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          🔥 POPULER
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{name}</h3>
        {badge && <span className={`text-xs px-2 py-1 rounded-full font-bold text-white ${badgeColor}`}>{badge}</span>}
      </div>
      <div className="mb-1 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{price}</span>
        {period && <span className="text-gray-500 dark:text-gray-400 text-sm">{period}</span>}
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{desc}</p>
      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500 font-bold mt-0.5">✓</span>{f}
          </li>
        ))}
      </ul>
      {href ? (
        <Link href={href} className={btnClass}>{cta}</Link>
      ) : (
        <a href={buildWaLink(waMsg!)} target="_blank" rel="noopener noreferrer" className={btnClass}>{cta}</a>
      )}
    </div>
  )
}
