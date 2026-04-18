'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme/ThemeContext'

interface ChatMessage {
  from: 'bot' | 'user'
  text: string
}

const QUICK_ACTIONS: { label: string; waMessage: string }[] = [
  { label: '💰 Tanya tentang harga', waMessage: 'Halo, saya ingin tanya tentang harga paket Laku POS. Boleh info lebih lanjut?' },
  { label: '📅 Jadwalkan demo', waMessage: 'Halo, saya ingin jadwalkan demo Laku POS. Kapan bisa?' },
  { label: '📞 Minta callback', waMessage: 'Halo, saya minta callback dari tim Laku POS.' },
  { label: '📧 Hubungi support', waMessage: 'Halo, saya butuh bantuan dari tim support Laku POS.' },
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  function addMessage(msg: ChatMessage) {
    setChatMessages(prev => [...prev, msg])
  }

  function openWa(waMessage: string) {
    window.open(buildWaLink(waMessage), '_blank', 'noopener,noreferrer')
  }

  function handleQuickAction(action: { label: string; waMessage: string }) {
    setQuickActionsVisible(false)
    addMessage({ from: 'user', text: action.label })
    setTimeout(() => {
      addMessage({ from: 'bot', text: 'Baik! Kami sambungkan ke tim kami sekarang. Anda akan diarahkan ke WhatsApp kami 💬' })
      setTimeout(() => openWa(action.waMessage), 800)
    }, 500)
  }

  function handleSend() {
    const text = chatMessage.trim()
    if (!text) return
    setQuickActionsVisible(false)
    addMessage({ from: 'user', text })
    setChatMessage('')
    setTimeout(() => {
      addMessage({ from: 'bot', text: 'Terima kasih! Tim kami akan membalas pesan Anda via WhatsApp sekarang 💬' })
      setTimeout(() => openWa(`Halo, saya punya pertanyaan: ${text}`), 800)
    }, 500)
  }

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏷️</span>
              <img src="/logo.svg" alt="Laku POS" className="w-8 h-8 rounded-lg" /><span className="text-2xl font-bold text-blue-600">Laku POS</span>
            </div>
            <nav className="hidden md:flex gap-8">
              <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Fitur</a>
              <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Harga</a>
              <a href="#comparison" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Perbandingan</a>
              <a href="#faq" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <Link
                href="/login"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 text-center text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full mb-6">
            <span className="font-semibold">🚀 Mulai Gratis — Cocok dari Warung hingga Enterprise</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Harga & Paket
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-95">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="#pricing"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Lihat Harga
            </a>
            <Link
              href="/login"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-20 bg-white dark:bg-gray-900" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Fitur Lengkap untuk Bisnis Modern
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Semua yang Anda butuhkan untuk mengelola bisnis retail dalam satu platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1 border border-transparent dark:border-gray-700"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Lihat Laku POS Beraksi
            </h2>
            <p className="text-xl text-gray-300">
              Demo lengkap sistem POS kami — live bersama tim kami
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center gap-6 text-center px-8">
              <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center">
                <span className="text-4xl">▶️</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white mb-2">Video Demo Segera Hadir</p>
                <p className="text-gray-400 max-w-md mx-auto">
                  Video demo sedang dalam persiapan. Sementara itu, jadwalkan sesi demo langsung bersama tim kami — gratis, tanpa komitmen.
                </p>
              </div>
              <a
                href={buildWaLink('Halo, saya ingin jadwalkan sesi demo langsung Laku POS. Kapan bisa?')}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                📅 Jadwalkan Demo Langsung
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">Gratis</div>
                <div className="text-gray-400 text-sm mt-1">Mulai tanpa biaya</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">&lt; 5 Menit</div>
                <div className="text-gray-400 text-sm mt-1">Setup pertama</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">100%</div>
                <div className="text-gray-400 text-sm mt-1">Data milik Anda</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Toggle */}
      <section className="py-12 bg-white dark:bg-gray-900" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setPricingMode('subscription')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                pricingMode === 'subscription'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Langganan Bulanan
            </button>
            <button
              onClick={() => setPricingMode('onetime')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                pricingMode === 'onetime'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Pembelian Sekali Bayar
            </button>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">💡 Hemat 20% dengan paket tahunan!</p>
        </div>
      </section>

      {/* Pricing Cards - Subscription */}
      {pricingMode === 'subscription' && (
        <section className="py-12 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <PricingCard
                name="Gratis"
                price="Rp 0"
                badge={{ text: 'SELAMANYA', color: 'bg-green-500' }}
                description="Untuk warung yang baru mau coba"
                features={[
                  '1 Outlet',
                  '1 Kasir',
                  'POS Dasar',
                  'Maks. 100 transaksi/bulan',
                  'Laporan Harian',
                  'Tanpa kartu kredit',
                ]}
                buttonText="Daftar Gratis"
                buttonVariant="secondary"
                href="/register"
              />
              <PricingCard
                name="Warung"
                price="Rp 99rb"
                period="/bulan"
                badge={{ text: 'PALING TERJANGKAU', color: 'bg-orange-500' }}
                description="Untuk warung aktif sehari-hari"
                features={[
                  '1 Outlet',
                  '2 Kasir',
                  'Transaksi Tidak Terbatas',
                  'POS + Inventori Dasar',
                  'Laporan Harian & Mingguan',
                  'Mode Offline',
                  'Dukungan WhatsApp',
                ]}
                buttonText="Pilih Warung"
                buttonVariant="secondary"
                waMessage="Halo, saya tertarik dengan paket Warung Laku POS (Rp 99rb/bulan). Boleh info lebih lanjut dan cara berlangganannya?"
              />
              <PricingCard
                name="Starter"
                price="Rp 299rb"
                period="/bulan"
                badge={{ text: '25% OFF', color: 'bg-red-500' }}
                description="Untuk toko kecil yang berkembang"
                features={[
                  '1 Outlet',
                  '3 Pengguna',
                  'Fitur POS Lengkap',
                  'Inventori Lanjutan',
                  'Laporan + Ekspor',
                  'Mode Offline',
                  'Dukungan Email & WA',
                  'Backup Cloud',
                ]}
                buttonText="Pilih Starter"
                buttonVariant="secondary"
                waMessage="Halo, saya tertarik dengan paket Starter Laku POS (Rp 299rb/bulan). Boleh info lebih lanjut dan cara berlangganannya?"
              />
              <PricingCard
                name="Professional"
                price="Rp 1,2jt"
                period="/bulan"
                badge={{ text: 'POPULER', color: 'bg-blue-500' }}
                description="Untuk bisnis dengan banyak outlet"
                features={[
                  '3 Outlet',
                  '10 Pengguna',
                  'Semua Fitur Starter',
                  'Inventori Multi-outlet',
                  'Audit Log',
                  'Akses API',
                  'Laporan Kustom',
                  'Dukungan Prioritas',
                  'Integrasi QRIS',
                ]}
                buttonText="Pilih Professional"
                buttonVariant="primary"
                popular
                waMessage="Halo, saya tertarik dengan paket Professional Laku POS (Rp 1,2jt/bulan). Boleh info lebih lanjut dan cara berlangganannya?"
              />
            </div>

            {/* Business & Enterprise CTA */}
            <div className="mt-10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-100 dark:border-gray-700">
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">Butuh lebih? Paket Business & Enterprise tersedia</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Mulai dari Rp 2,8jt/bulan — multi-outlet, white-label, SLA, dan account manager khusus.</p>
              </div>
              <a
                href={buildWaLink('Halo, saya ingin tanya tentang paket Business atau Enterprise Laku POS. Boleh info lebih lanjut?')}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Hubungi Sales
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Cards - One-Time */}
      {pricingMode === 'onetime' && (
        <section className="py-12 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingCard
                name="SME Package"
                price="Rp 75jt"
                badge={{ text: '12% OFF', color: 'bg-red-500' }}
                description="Lisensi sekali bayar untuk UKM"
                features={[
                  '1-3 Outlet',
                  '5-10 Pengguna',
                  'Dukungan Email',
                  'Setup & Pelatihan',
                  'Lisensi Seumur Hidup',
                  'Update Gratis (1 tahun)',
                  'Source Code (+30%)',
                ]}
                buttonText="Minta Penawaran"
                buttonVariant="secondary"
                waMessage="Halo, saya tertarik dengan paket One-Time SME Package Laku POS (Rp 75jt). Boleh minta penawaran dan info lebih lanjut?"
              />
              <PricingCard
                name="Business Package"
                price="Rp 150jt"
                badge={{ text: '14% OFF', color: 'bg-red-500' }}
                description="Solusi lengkap untuk bisnis"
                features={[
                  '5-10 Outlet',
                  'Pengguna Tidak Terbatas',
                  'Dukungan Prioritas',
                  'Onboarding Khusus',
                  'Source Code Termasuk',
                  '1x Kustomisasi Minor',
                  'Update Gratis (2 tahun)',
                  'Opsi Self-Host',
                ]}
                buttonText="Minta Penawaran"
                buttonVariant="primary"
                popular
                waMessage="Halo, saya tertarik dengan paket One-Time Business Package Laku POS (Rp 150jt). Boleh minta penawaran dan info lebih lanjut?"
              />
              <PricingCard
                name="Enterprise Package"
                price="Rp 300jt"
                badge={{ text: '14% OFF', color: 'bg-red-500' }}
                description="Solusi enterprise lengkap"
                features={[
                  'Outlet Tidak Terbatas',
                  'Pengguna Tidak Terbatas',
                  'Dukungan Prioritas 24/7',
                  'Account Manager Khusus',
                  'Source Code Lengkap + Dokumentasi',
                  '3 Pengembangan Fitur Utama',
                  'Opsi White-label',
                  'Garansi SLA',
                  'Update Seumur Hidup',
                ]}
                buttonText="Hubungi Sales"
                buttonVariant="primary"
                waMessage="Halo, saya ingin konsultasi mengenai paket One-Time Enterprise Package Laku POS (Rp 300jt). Mohon dihubungi kembali."
              />
            </div>
          </div>
        </section>
      )}

      {/* Comparison Table */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800" id="comparison">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            Perbandingan dengan Kompetitor
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
                    <th className="py-4 px-6 text-left font-semibold">Fitur</th>
                    <th className="py-4 px-6 text-center font-semibold">Laku POS</th>
                    <th className="py-4 px-6 text-center font-semibold">Moka POS</th>
                    <th className="py-4 px-6 text-center font-semibold">iReap POS</th>
                    <th className="py-4 px-6 text-center font-semibold">Pawoon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-gray-100">Harga Mulai Dari</td>
                    <td className="py-4 px-6 text-center text-gray-900 dark:text-gray-100 font-bold text-green-600">Gratis</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400">Rp 1,2jt</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400">Rp 800rb</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400">Rp 999rb</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100">Multi-outlet</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100">Mode Offline</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400 font-medium">Terbatas</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100">Source Code</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100">Self-hosted</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100">Audit Log Lengkap</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400 font-medium">Basic</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400 font-medium">Basic</td>
                    <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-400 font-medium">Basic</td>
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-6 text-gray-900 dark:text-gray-100">Pembelian Sekali Bayar</td>
                    <td className="py-4 px-6 text-center text-green-600 text-2xl">✓</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                    <td className="py-4 px-6 text-center text-red-600 text-2xl">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Early Adopter Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              🚀 Baru Diluncurkan
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Jadilah Pengguna Pertama Kami
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Kami baru mulai dan sedang mencari warung & toko kecil yang mau tumbuh bersama kami.
              Pengguna awal mendapat keuntungan eksklusif.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: '💰',
                title: 'Harga Terjangkau Selamanya',
                desc: 'Pengguna yang daftar sekarang dikunci di harga awal — tidak naik meski kami berkembang.',
              },
              {
                icon: '🎯',
                title: 'Feedback Langsung ke Developer',
                desc: 'Fitur yang Anda butuhkan bisa kami prioritaskan. Akses langsung ke tim pembuat aplikasi.',
              },
              {
                icon: '🤝',
                title: 'Dukungan Personal via WA',
                desc: 'Bukan chatbot. Tim kami siap bantu setup, onboarding, dan pertanyaan apapun via WhatsApp.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md text-center">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center border-2 border-blue-200 dark:border-blue-800">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Cocok untuk bisnis Anda?
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {['🏪 Warung & Toko Kelontong', '🍜 Warung Makan', '👗 Butik & Fashion', '💊 Apotek Kecil', '🛒 Minimarket'].map(label => (
                <span key={label} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-medium">
                  {label}
                </span>
              ))}
            </div>
            <a
              href={buildWaLink('Halo, saya tertarik jadi pengguna awal Laku POS. Boleh info lebih lanjut?')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-colors"
            >
              💬 Tanya Tim Kami via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white dark:bg-gray-900" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            Pertanyaan yang Sering Diajukan
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => toggleFaq(index)}
              >
                <div className="p-6 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{faq.question}</h3>
                  <span className="text-2xl text-gray-600 dark:text-gray-400">
                    {openFaq === index ? '−' : '+'}
                  </span>
                </div>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Siap Untuk Upgrade Bisnis Anda?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Dapatkan demo gratis dan konsultasi dengan tim kami
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Mulai Sekarang
            </Link>
            <a
              href={buildWaLink('Halo, saya ingin konsultasi dan request demo Laku POS. Boleh dihubungi?')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Hubungi Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏷️</span>
                <span className="text-xl font-bold">Laku POS</span>
              </div>
              <p className="text-gray-400">
                POS Enterprise dengan Harga UKM. Dibangun dengan teknologi modern untuk bisnis Indonesia.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-blue-400">Produk</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#pricing" className="hover:text-white transition-colors">Harga</a></li>
                <li><a href="#comparison" className="hover:text-white transition-colors">Fitur</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-blue-400">Perusahaan</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kontak</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-blue-400">Dukungan</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pusat Bantuan</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Dokumentasi</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Laku POS by Laku POS. Hak cipta dilindungi.</p>
          </div>
        </div>
      </footer>

      {/* Live Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold">Laku POS Support</h3>
                <p className="text-xs opacity-90">Biasanya membalas dalam hitungan menit</p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
              {/* Initial bot greeting */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                  B
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none p-4 shadow-sm max-w-[80%]">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    👋 Halo! Selamat datang di Laku POS. Ada yang bisa kami bantu?
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              {quickActionsVisible && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Quick Actions:</p>
                  {QUICK_ACTIONS.map(action => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      className="w-full text-left bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 p-3 rounded-xl shadow-sm transition-colors text-sm text-gray-700 dark:text-gray-300"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat messages */}
              {chatMessages.map((msg, i) => (
                msg.from === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm max-w-[80%]">
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                      B
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none p-4 shadow-sm max-w-[80%]">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{msg.text}</p>
                    </div>
                  </div>
                )
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ketik pesan Anda..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:border-blue-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleSend}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors font-semibold text-sm"
                >
                  Kirim
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`${
            chatOpen ? 'hidden' : 'flex'
          } items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-700 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105`}
        >
          <span className="text-2xl">💬</span>
          <span className="font-semibold">Chat dengan Kami</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      </div>
    </div>
  )
}

const WA_NUMBER = '6287874415491'

function buildWaLink(message: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}

interface PricingCardProps {
  name: string
  price: string
  period?: string
  badge?: { text: string; color: string }
  description: string
  features: string[]
  buttonText: string
  buttonVariant: 'primary' | 'secondary'
  popular?: boolean
  waMessage?: string
  href?: string
}

function PricingCard({
  name,
  price,
  period,
  badge,
  description,
  features,
  buttonText,
  buttonVariant,
  popular = false,
  waMessage,
  href,
}: PricingCardProps) {
  const buttonClass = `block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
    buttonVariant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600'
  }`

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl transition-all hover:-translate-y-2 ${
        popular ? 'border-2 border-blue-600 scale-105' : 'border border-gray-200 dark:border-gray-700'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-1 rounded-full text-sm font-bold">
          🔥 POPULER
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{name}</h3>
      <div className="mb-4 flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{price}</span>
        {period && <span className="text-gray-600 dark:text-gray-400">{period}</span>}
        {badge && (
          <span className={`text-xs px-2 py-1 rounded-full font-bold text-white ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      {href ? (
        <Link href={href} className={buttonClass}>{buttonText}</Link>
      ) : (
        <a
          href={buildWaLink(waMessage!)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          {buttonText}
        </a>
      )}
    </div>
  )
}

const faqs = [
  {
    question: 'Apa perbedaan antara one-time purchase dan subscription?',
    answer: 'One-time purchase: Anda membeli lisensi sekali dan dapat menggunakan software selamanya. Cocok untuk bisnis yang ingin full ownership. Subscription: Anda membayar bulanan dan mendapat akses + updates otomatis + cloud hosting + support.',
  },
  {
    question: 'Apakah ada biaya setup atau implementasi?',
    answer: 'Untuk paket Professional ke atas, setup dan training sudah included. Untuk Starter plan, ada biaya setup Rp 5 juta (optional) yang mencakup instalasi, konfigurasi awal, dan training 1 hari.',
  },
  {
    question: 'Apakah bisa trial dulu sebelum beli?',
    answer: 'Ya! Kami menyediakan free trial 14 hari untuk semua paket subscription. Untuk one-time purchase, kami bisa arrange demo lengkap dan POC (Proof of Concept).',
  },
  {
    question: 'Apakah data saya aman?',
    answer: 'Absolutely! Kami menggunakan enkripsi tingkat enterprise, database PostgreSQL yang reliable, dan backup otomatis harian. Untuk one-time purchase, Anda bahkan bisa self-host di server sendiri.',
  },
  {
    question: 'Bagaimana dengan support dan maintenance?',
    answer: 'Subscription: Support sudah included sesuai tier paket. One-time purchase: Free support 1 tahun, setelah itu optional maintenance contract Rp 500rb - 1,5jt/bulan.',
  },
  {
    question: 'Apakah bisa custom sesuai kebutuhan bisnis saya?',
    answer: 'Tentu! Kami menyediakan custom development mulai dari Rp 15 juta per feature. Untuk Enterprise package, Anda sudah dapat 3 major custom features included.',
  },
]

const features = [
  {
    icon: '🏪',
    title: 'Point of Sale',
    description: 'POS yang cepat dan mudah digunakan untuk transaksi harian',
    points: [
      'Multi-payment methods (Cash, Card, QRIS)',
      'Barcode scanner & camera support',
      'Receipt printing & email',
      'Discount & promotion codes',
    ],
  },
  {
    icon: '📦',
    title: 'Inventory Management',
    description: 'Kelola stok dengan mudah di multiple outlets',
    points: [
      'Real-time stock tracking',
      'Stock alerts & notifications',
      'Transfer antar outlet',
      'Stock opname & adjustment',
    ],
  },
  {
    icon: '📊',
    title: 'Reports & Analytics',
    description: 'Dashboard real-time dan laporan komprehensif',
    points: [
      'Sales trend analysis',
      'Top products ranking',
      'Revenue breakdown',
      'Export to PDF/Excel',
    ],
  },
  {
    icon: '👥',
    title: 'User Management',
    description: 'Control akses dengan role & permission system',
    points: [
      'Multi-user support',
      'Role-based access (Admin, Manager, Cashier)',
      'Activity audit logs',
      'Permission customization',
    ],
  },
  {
    icon: '💰',
    title: 'Cash Management',
    description: 'Atur cash session dan closing dengan mudah',
    points: [
      'Opening/closing balance',
      'Cash reconciliation',
      'Payment method breakdown',
      'Shift handover reports',
    ],
  },
  {
    icon: '🔄',
    title: 'Offline Mode',
    description: 'Tetap bisa transaksi walaupun internet mati',
    points: [
      'Offline transaction queue',
      'Auto-sync when online',
      'Local data cache',
      'Zero downtime operations',
    ],
  },
]

