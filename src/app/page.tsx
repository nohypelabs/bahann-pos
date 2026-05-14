'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme/ThemeContext'
import {
  ShoppingCart, Package, BarChart3, WifiOff, Users, Shield,
  Sun, Moon, MessageCircle, Check, Zap, DollarSign, Headphones,
  Store, UtensilsCrossed, Coffee, Shirt, Pill, ShoppingBag,
  ArrowRight, Globe,
} from 'lucide-react'

type Lang = 'id' | 'en'

const T = {
  nav: {
    features: { id: 'Fitur', en: 'Features' },
    pricing: { id: 'Harga', en: 'Pricing' },
    faq: { id: 'FAQ', en: 'FAQ' },
    login: { id: 'Masuk', en: 'Login' },
    register: { id: 'Daftar Gratis', en: 'Start Free' },
  },
  hero: {
    h1_1: { id: 'Kasir Digital ', en: 'Digital POS ' },
    h1_2: { id: 'untuk Warung', en: 'for Small Business' },
    h1_3: { id: ' Indonesia', en: '' },
    subtitle: {
      id: 'Kelola penjualan, stok, dan laporan dari HP. Tanpa ribet, tanpa mahal.',
      en: 'Manage sales, inventory & reports from your phone. Simple, affordable.',
    },
    cta: { id: 'Mulai Gratis Sekarang', en: 'Start Free Now' },
    demo: { id: 'Minta Demo', en: 'Request Demo' },
    demoWa: {
      id: 'Halo, saya ingin jadwalkan demo Laku POS.',
      en: 'Hi, I\'d like to schedule a demo of Laku POS.',
    },
    trust: {
      id: 'Tanpa kartu kredit · Setup < 5 menit · Data 100% milik Anda',
      en: 'No credit card · Setup < 5 min · You own 100% of your data',
    },
  },
  industries: [
    { id: 'Warung', en: 'Shop' },
    { id: 'Warung Makan', en: 'Restaurant' },
    { id: 'Kafe', en: 'Café' },
    { id: 'Fashion', en: 'Fashion' },
    { id: 'Apotek', en: 'Pharmacy' },
    { id: 'Minimarket', en: 'Minimart' },
  ],
  mockup: {
    revenue: { id: 'Omset', en: 'Revenue' },
    transactions: { id: 'Transaksi', en: 'Txns' },
    sold: { id: 'Terjual', en: 'Sold' },
    alert: { id: 'Alert', en: 'Alerts' },
    chart: { id: 'Penjualan 7 Hari', en: '7-Day Sales' },
  },
  steps: [
    { t: { id: 'Daftar Gratis', en: 'Sign Up Free' }, d: { id: 'Buat akun 1 menit', en: 'Create account in 1 min' } },
    { t: { id: 'Setup Toko', en: 'Setup Store' }, d: { id: 'Tambah produk & kasir', en: 'Add products & staff' } },
    { t: { id: 'Mulai Jualan', en: 'Start Selling' }, d: { id: 'Langsung pakai di HP', en: 'Use on your phone' } },
  ],
  features: {
    heading: { id: 'Semua yang Warung Butuhkan', en: 'Everything Your Business Needs' },
    subheading: { id: 'Satu aplikasi, tidak perlu software lain.', en: 'One app, no other software needed.' },
    items: [
      {
        title: { id: 'POS Cepat', en: 'Fast POS' },
        desc: {
          id: 'Transaksi dalam hitungan detik. Dukung cash, transfer, dan QRIS.',
          en: 'Transactions in seconds. Supports cash, bank transfer & QRIS.',
        },
        points: [
          { id: 'Multi-metode pembayaran', en: 'Multi-payment methods' },
          { id: 'Barcode & kamera scanner', en: 'Barcode & camera scanner' },
          { id: 'Cetak struk otomatis', en: 'Auto receipt printing' },
          { id: 'Diskon & promo', en: 'Discounts & promos' },
        ],
      },
      {
        title: { id: 'Stok Real-time', en: 'Real-time Stock' },
        desc: {
          id: 'Pantau stok dari mana saja. Alert otomatis saat barang hampir habis.',
          en: 'Monitor stock from anywhere. Auto-alerts when items run low.',
        },
        points: [
          { id: 'Notifikasi stok menipis', en: 'Low stock alerts' },
          { id: 'Riwayat pergerakan stok', en: 'Stock movement history' },
          { id: 'Multi-outlet', en: 'Multi-outlet' },
          { id: 'Stok opname mudah', en: 'Easy stock-taking' },
        ],
      },
      {
        title: { id: 'Laporan Lengkap', en: 'Full Reports' },
        desc: {
          id: 'Dashboard penjualan real-time. Tahu produk terlaris setiap hari.',
          en: 'Real-time sales dashboard. Know your best sellers every day.',
        },
        points: [
          { id: 'Grafik penjualan harian', en: 'Daily sales charts' },
          { id: 'Produk terlaris', en: 'Top selling products' },
          { id: 'Ekspor PDF & Excel', en: 'Export PDF & Excel' },
          { id: 'Laporan per kasir', en: 'Per-cashier reports' },
        ],
      },
      {
        title: { id: 'Mode Offline', en: 'Offline Mode' },
        desc: {
          id: 'Internet mati? Transaksi tetap jalan. Data sync otomatis saat online.',
          en: 'Internet down? Keep transacting. Data syncs automatically when back online.',
        },
        points: [
          { id: 'Transaksi tanpa internet', en: 'Transact without internet' },
          { id: 'Auto-sync real-time', en: 'Real-time auto-sync' },
          { id: 'Data tidak hilang', en: 'Zero data loss' },
          { id: 'Zero downtime', en: 'Zero downtime' },
        ],
      },
      {
        title: { id: 'Manajemen Kasir', en: 'Staff Management' },
        desc: {
          id: 'Tambah kasir, atur hak akses, dan pantau aktivitas mereka.',
          en: 'Add staff, set permissions, and monitor their activity.',
        },
        points: [
          { id: 'Multi-kasir per toko', en: 'Multi-cashier per store' },
          { id: 'Kontrol hak akses', en: 'Access control' },
          { id: 'Audit log lengkap', en: 'Full audit log' },
          { id: 'Shift & closing', en: 'Shift & closing' },
        ],
      },
      {
        title: { id: 'Aman & Terpercaya', en: 'Secure & Reliable' },
        desc: {
          id: 'Data Anda terenkripsi dan terisolasi. Hanya Anda yang bisa akses.',
          en: 'Your data is encrypted and isolated. Only you can access it.',
        },
        points: [
          { id: 'Enkripsi end-to-end', en: 'End-to-end encryption' },
          { id: 'Data terisolasi per toko', en: 'Per-store data isolation' },
          { id: 'Backup otomatis', en: 'Auto backup' },
          { id: 'Row Level Security', en: 'Row Level Security' },
        ],
      },
    ],
  },
  trustBadges: [
    { id: 'Gratis Selamanya', en: 'Free Forever' },
    { id: 'Mode Offline', en: 'Offline Mode' },
    { id: 'Multi-outlet', en: 'Multi-outlet' },
    { id: 'Open Source', en: 'Open Source' },
  ],
  pricing: {
    heading: { id: 'Harga Transparan', en: 'Transparent Pricing' },
    subheading: { id: 'Mulai gratis, upgrade kapan saja.', en: 'Start free, upgrade anytime.' },
    subscription: { id: 'Berlangganan', en: 'Subscription' },
    onetime: { id: 'Sekali Bayar', en: 'One-Time' },
    sub: [
      {
        name: 'Gratis', price: 'Rp 0',
        badge: { id: 'SELAMANYA', en: 'FOREVER' }, badgeColor: 'bg-green-500',
        desc: { id: 'Warung baru coba', en: 'Just getting started' },
        features: [
          { id: '1 Outlet, 1 Kasir', en: '1 Outlet, 1 Cashier' },
          { id: 'POS Dasar', en: 'Basic POS' },
          { id: '100 transaksi/bulan', en: '100 txns/month' },
          { id: 'Laporan Harian', en: 'Daily Reports' },
        ],
        cta: { id: 'Daftar Gratis', en: 'Sign Up Free' }, href: '/register',
      },
      {
        name: 'Warung', price: 'Rp 99rb', period: { id: '/bln', en: '/mo' },
        badge: { id: 'TERJANGKAU', en: 'AFFORDABLE' }, badgeColor: 'bg-orange-500',
        desc: { id: 'Warung aktif harian', en: 'Active daily store' },
        features: [
          { id: 'Transaksi Unlimited', en: 'Unlimited Transactions' },
          { id: 'POS + Inventori', en: 'POS + Inventory' },
          { id: 'Mode Offline', en: 'Offline Mode' },
          { id: 'Support WA', en: 'WA Support' },
        ],
        cta: { id: 'Pilih Warung', en: 'Choose Warung' },
        waMsg: {
          id: 'Halo, saya tertarik paket Warung Laku POS (Rp 99rb/bulan).',
          en: 'Hi, I\'m interested in the Warung plan (Rp 99k/mo).',
        },
      },
      {
        name: 'Starter', price: 'Rp 299rb', period: { id: '/bln', en: '/mo' },
        desc: { id: 'Toko berkembang', en: 'Growing store' },
        features: [
          { id: '3 Pengguna', en: '3 Users' },
          { id: 'Inventori Lanjutan', en: 'Advanced Inventory' },
          { id: 'Ekspor PDF & Excel', en: 'Export PDF & Excel' },
          { id: 'Backup Cloud', en: 'Cloud Backup' },
        ],
        cta: { id: 'Pilih Starter', en: 'Choose Starter' },
        waMsg: {
          id: 'Halo, saya tertarik paket Starter Laku POS (Rp 299rb/bulan).',
          en: 'Hi, I\'m interested in the Starter plan (Rp 299k/mo).',
        },
      },
      {
        name: 'Professional', price: 'Rp 1,2jt', period: { id: '/bln', en: '/mo' },
        badge: { id: 'POPULER', en: 'POPULAR' }, badgeColor: 'bg-blue-500',
        desc: { id: 'Multi-outlet', en: 'Multi-outlet' },
        features: [
          { id: '3 Outlet, 10 User', en: '3 Outlets, 10 Users' },
          { id: 'Audit Log & API', en: 'Audit Log & API' },
          { id: 'Laporan Kustom', en: 'Custom Reports' },
          { id: 'Support Prioritas', en: 'Priority Support' },
        ],
        cta: { id: 'Pilih Pro', en: 'Choose Pro' },
        waMsg: {
          id: 'Halo, saya tertarik paket Professional Laku POS (Rp 1,2jt/bulan).',
          en: 'Hi, I\'m interested in the Professional plan (Rp 1.2M/mo).',
        },
        popular: true,
      },
    ],
    once: [
      {
        name: 'SME', price: 'Rp 75jt',
        badge: { id: 'SEUMUR HIDUP', en: 'LIFETIME' }, badgeColor: 'bg-gray-600',
        desc: { id: 'UKM — bayar sekali', en: 'SME — pay once' },
        features: [
          { id: '1–3 Outlet', en: '1–3 Outlets' },
          { id: 'Setup & Pelatihan', en: 'Setup & Training' },
          { id: 'Update 1 Tahun', en: '1 Year Updates' },
          { id: 'Source Code (+30%)', en: 'Source Code (+30%)' },
        ],
        cta: { id: 'Minta Penawaran', en: 'Request Quote' },
        waMsg: {
          id: 'Halo, saya tertarik paket One-Time SME Laku POS (Rp 75jt).',
          en: 'Hi, I\'m interested in the SME one-time plan (Rp 75M).',
        },
      },
      {
        name: 'Business', price: 'Rp 150jt',
        badge: { id: 'TERLENGKAP', en: 'COMPLETE' }, badgeColor: 'bg-green-600',
        desc: { id: 'Termasuk source code', en: 'Includes source code' },
        features: [
          { id: '5–10 Outlet', en: '5–10 Outlets' },
          { id: 'Source Code', en: 'Source Code' },
          { id: 'Self-Host', en: 'Self-Host' },
          { id: 'Update 2 Tahun', en: '2 Year Updates' },
        ],
        cta: { id: 'Minta Penawaran', en: 'Request Quote' },
        waMsg: {
          id: 'Halo, saya tertarik paket One-Time Business Laku POS (Rp 150jt).',
          en: 'Hi, I\'m interested in the Business one-time plan (Rp 150M).',
        },
        popular: true,
      },
      {
        name: 'Enterprise', price: 'Rp 300jt',
        badge: { id: 'WHITE-LABEL', en: 'WHITE-LABEL' }, badgeColor: 'bg-purple-600',
        desc: { id: 'Enterprise + white-label', en: 'Enterprise + white-label' },
        features: [
          { id: 'Unlimited Outlet', en: 'Unlimited Outlets' },
          { id: 'Fitur Custom', en: 'Custom Features' },
          { id: 'SLA Garansi', en: 'SLA Guarantee' },
          { id: 'Account Manager', en: 'Account Manager' },
        ],
        cta: { id: 'Hubungi Sales', en: 'Contact Sales' },
        waMsg: {
          id: 'Halo, saya tertarik paket Enterprise Laku POS (Rp 300jt).',
          en: 'Hi, I\'m interested in the Enterprise plan (Rp 300M).',
        },
      },
    ],
    upsell: {
      title: { id: 'Pengguna awal? Harga dikunci selamanya', en: 'Early adopter? Price locked forever' },
      desc: {
        id: 'Feedback langsung ke developer + support personal via WA.',
        en: 'Direct feedback to developer + personal support via WA.',
      },
      cta: { id: 'Hubungi Sales', en: 'Contact Sales' },
      waMsg: {
        id: 'Halo, saya ingin tanya paket Laku POS.',
        en: 'Hi, I\'d like to ask about Laku POS plans.',
      },
    },
  },
  faq: {
    heading: { id: 'Pertanyaan Umum', en: 'FAQ' },
    items: [
      {
        q: { id: 'Apakah benar-benar gratis?', en: 'Is it really free?' },
        a: {
          id: 'Ya! Paket Gratis tidak perlu kartu kredit dan bisa dipakai selamanya. Limit 100 transaksi/bulan — cukup untuk warung yang baru mulai.',
          en: 'Yes! The Free plan requires no credit card and is yours forever. 100 transactions/month — enough for a store just getting started.',
        },
      },
      {
        q: { id: 'Bisa dipakai di HP?', en: 'Does it work on mobile?' },
        a: {
          id: 'Tentu! Laku POS dirancang mobile-first. Buka di browser HP, langsung bisa transaksi tanpa install aplikasi.',
          en: 'Absolutely! Laku POS is mobile-first. Open it in your phone\'s browser and start transacting — no app install needed.',
        },
      },
      {
        q: { id: 'Bagaimana kalau internet mati?', en: 'What if the internet goes down?' },
        a: {
          id: 'Ada mode offline. Transaksi tetap berjalan dan data akan sync otomatis begitu internet kembali.',
          en: 'Offline mode kicks in. Transactions keep working and data syncs automatically when you\'re back online.',
        },
      },
      {
        q: { id: 'Apakah data saya aman?', en: 'Is my data safe?' },
        a: {
          id: 'Data setiap warung terisolasi penuh. Hanya Anda yang bisa akses. Kami pakai enkripsi dan Row Level Security.',
          en: 'Each store\'s data is fully isolated. Only you can access it. We use encryption and Row Level Security.',
        },
      },
    ],
  },
  finalCta: {
    heading: { id: 'Siap Bikin Warung Makin Laku?', en: 'Ready to Grow Your Business?' },
    desc: {
      id: 'Daftar gratis sekarang. Tanpa kartu kredit, tanpa install.',
      en: 'Sign up free now. No credit card, no install.',
    },
    cta: { id: 'Mulai Gratis', en: 'Start Free' },
    contact: { id: 'Hubungi Kami', en: 'Contact Us' },
    contactWa: {
      id: 'Halo, saya ingin konsultasi Laku POS.',
      en: 'Hi, I\'d like to learn more about Laku POS.',
    },
  },
  footer: {
    tagline: {
      id: 'Kasir digital modern untuk warung dan toko kecil Indonesia.',
      en: 'Modern digital POS for small businesses.',
    },
    product: { id: 'Produk', en: 'Product' },
    help: { id: 'Bantuan', en: 'Help' },
    register: { id: 'Daftar', en: 'Sign Up' },
    helpWa: {
      id: 'Halo, butuh bantuan Laku POS.',
      en: 'Hi, I need help with Laku POS.',
    },
    copy: { id: 'Hak cipta dilindungi.', en: 'All rights reserved.' },
    madeFor: { id: 'Dibuat untuk warung Indonesia', en: 'Built for small businesses' },
  },
  chat: {
    title: { id: 'Laku POS Support', en: 'Laku POS Support' },
    subtitle: { id: 'Biasanya balas dalam menit', en: 'Usually replies in minutes' },
    greeting: { id: 'Halo! Ada yang bisa kami bantu?', en: 'Hi! How can we help you?' },
    placeholder: { id: 'Ketik pesan...', en: 'Type a message...' },
    send: { id: 'Kirim', en: 'Send' },
    redirecting: {
      id: 'Baik! Kami sambungkan ke tim kami via WhatsApp sekarang.',
      en: 'Great! We\'re connecting you to our team via WhatsApp now.',
    },
    thanks: {
      id: 'Terima kasih! Tim kami akan balas via WhatsApp sekarang.',
      en: 'Thanks! Our team will reply via WhatsApp now.',
    },
    waPrefix: {
      id: 'Halo, saya punya pertanyaan: ',
      en: 'Hi, I have a question: ',
    },
    quickActions: [
      { label: { id: 'Tanya harga', en: 'Ask pricing' }, waMessage: { id: 'Halo, saya ingin tanya harga paket Laku POS.', en: 'Hi, I\'d like to ask about Laku POS pricing.' } },
      { label: { id: 'Jadwalkan demo', en: 'Schedule demo' }, waMessage: { id: 'Halo, saya ingin jadwalkan demo Laku POS.', en: 'Hi, I\'d like to schedule a Laku POS demo.' } },
      { label: { id: 'Jadi mitra', en: 'Become a partner' }, waMessage: { id: 'Halo, saya tertarik jadi mitra Laku POS.', en: 'Hi, I\'m interested in partnering with Laku POS.' } },
      { label: { id: 'Pertanyaan lain', en: 'Other question' }, waMessage: { id: 'Halo, saya punya pertanyaan tentang Laku POS.', en: 'Hi, I have a question about Laku POS.' } },
    ],
  },
}

const INDUSTRY_ICONS = [
  <Store key={0} className="w-3.5 h-3.5" />,
  <UtensilsCrossed key={1} className="w-3.5 h-3.5" />,
  <Coffee key={2} className="w-3.5 h-3.5" />,
  <Shirt key={3} className="w-3.5 h-3.5" />,
  <Pill key={4} className="w-3.5 h-3.5" />,
  <ShoppingBag key={5} className="w-3.5 h-3.5" />,
]

const FEATURE_ICONS = [
  <ShoppingCart key={0} className="w-5 h-5" />,
  <Package key={1} className="w-5 h-5" />,
  <BarChart3 key={2} className="w-5 h-5" />,
  <WifiOff key={3} className="w-5 h-5" />,
  <Users key={4} className="w-5 h-5" />,
  <Shield key={5} className="w-5 h-5" />,
]

const TRUST_ICONS = [
  <Check key={0} className="w-3.5 h-3.5" />,
  <WifiOff key={1} className="w-3.5 h-3.5" />,
  <Store key={2} className="w-3.5 h-3.5" />,
  <Shield key={3} className="w-3.5 h-3.5" />,
]

const SECTION_COLORS = {
  light: [
    [240, 253, 244],
    [239, 246, 255],
    [255, 255, 255],
    [236, 253, 245],
  ],
  dark: [
    [5, 20, 10],
    [10, 15, 30],
    [3, 7, 18],
    [5, 25, 20],
  ],
}

function lerpColor(a: number[], b: number[], t: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `rgb(${clamp(a[0] + (b[0] - a[0]) * t)}, ${clamp(a[1] + (b[1] - a[1]) * t)}, ${clamp(a[2] + (b[2] - a[2]) * t)})`
}

const WA_NUMBER = '6287874415491'
function buildWaLink(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

interface ChatMessage { from: 'bot' | 'user'; text: string }

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('landing-lang') as Lang | null
      if (saved === 'en' || saved === 'id') return saved
    }
    return 'id'
  })
  const [activeFeature, setActiveFeature] = useState(0)
  const [pricingMode, setPricingMode] = useState<'subscription' | 'onetime'>('subscription')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [quickActionsVisible, setQuickActionsVisible] = useState(true)
  const [bgColor, setBgColor] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const { theme, toggleTheme } = useTheme()

  const toggleLang = () => {
    const next = lang === 'id' ? 'en' : 'id'
    setLang(next)
    localStorage.setItem('landing-lang', next)
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const updateBg = useCallback(() => {
    const palette = theme === 'dark' ? SECTION_COLORS.dark : SECTION_COLORS.light
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[]
    if (sections.length === 0) return

    const scrollY = window.scrollY + window.innerHeight * 0.4

    for (let i = 0; i < sections.length - 1; i++) {
      const curr = sections[i]
      const next = sections[i + 1]
      if (scrollY >= curr.offsetTop && scrollY < next.offsetTop) {
        const progress = (scrollY - curr.offsetTop) / (next.offsetTop - curr.offsetTop)
        setBgColor(lerpColor(palette[i], palette[i + 1], progress))
        return
      }
    }

    if (scrollY < sections[0].offsetTop) {
      setBgColor(lerpColor(palette[0], palette[0], 0))
    } else {
      setBgColor(lerpColor(palette[palette.length - 1], palette[palette.length - 1], 0))
    }
  }, [theme])

  useEffect(() => {
    updateBg()
    window.addEventListener('scroll', updateBg, { passive: true })
    return () => window.removeEventListener('scroll', updateBg)
  }, [updateBg])

  function openWa(msg: string) { window.open(buildWaLink(msg), '_blank', 'noopener,noreferrer') }

  function handleQuickAction(action: typeof T.chat.quickActions[number]) {
    setQuickActionsVisible(false)
    setChatMessages(p => [...p, { from: 'user', text: action.label[lang] }])
    setTimeout(() => {
      setChatMessages(p => [...p, { from: 'bot', text: T.chat.redirecting[lang] }])
      setTimeout(() => openWa(action.waMessage[lang]), 800)
    }, 500)
  }

  function handleSend() {
    const text = chatMessage.trim()
    if (!text) return
    setQuickActionsVisible(false)
    setChatMessages(p => [...p, { from: 'user', text }])
    setChatMessage('')
    setTimeout(() => {
      setChatMessages(p => [...p, { from: 'bot', text: T.chat.thanks[lang] }])
      setTimeout(() => openWa(`${T.chat.waPrefix[lang]}${text}`), 800)
    }, 500)
  }

  const feat = T.features.items[activeFeature]
  const mockupLabels = [
    { label: T.mockup.revenue[lang], value: 'Rp 1,2jt', color: 'bg-green-500' },
    { label: T.mockup.transactions[lang], value: '24', color: 'bg-blue-500' },
    { label: T.mockup.sold[lang], value: '67', color: 'bg-purple-500' },
    { label: T.mockup.alert[lang], value: '3', color: 'bg-orange-500' },
  ]

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-500 overflow-x-hidden" style={bgColor ? { backgroundColor: bgColor } : undefined}>

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/50 overflow-x-hidden" style={{ backgroundColor: bgColor ? bgColor.replace('rgb(', 'rgba(').replace(')', ', 0.85)') : undefined }}>
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Laku POS" className="w-7 h-7" />
            <span className="text-lg font-bold text-green-600">Laku POS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="#fitur" className="hover:text-green-600 transition-colors">{T.nav.features[lang]}</a>
            <a href="#harga" className="hover:text-green-600 transition-colors">{T.nav.pricing[lang]}</a>
            <a href="#faq" className="hover:text-green-600 transition-colors">{T.nav.faq[lang]}</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <button onClick={toggleLang} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300" aria-label="Toggle language">
              {lang === 'id' ? 'EN' : 'ID'}
            </button>
            <button onClick={toggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Toggle dark mode">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-green-600 transition-colors">
              {T.nav.login[lang]}
            </Link>
            <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {T.nav.register[lang]}
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section ref={el => { sectionRefs.current[0] = el }} className="pt-12 md:pt-16 pb-10 md:pb-14 px-4 overflow-x-hidden">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
              {T.hero.h1_1[lang]}<span className="text-green-600">{T.hero.h1_2[lang]}</span>{T.hero.h1_3[lang]}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              {T.hero.subtitle[lang]}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Link href="/register" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-base font-bold px-7 py-2.5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
                {T.hero.cta[lang]} <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={buildWaLink(T.hero.demoWa[lang])} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-7 py-3.5 rounded-xl hover:border-green-600 hover:text-green-600 transition-all">
                <MessageCircle className="w-4 h-4" /> {T.hero.demo[lang]}
              </a>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {T.hero.trust[lang]}
            </p>
          </div>

          {/* Industry pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {T.industries.map((ind, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                {INDUSTRY_ICONS[i]} {ind[lang]}
              </span>
            ))}
          </div>

          {/* App preview mockup */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4 bg-white dark:bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-left">
                  app.lakupos.id/dashboard
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {mockupLabels.map((s, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 shadow-sm">
                      <div className={`w-5 h-1 rounded-full ${s.color} mb-1.5`} />
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{s.label}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{T.mockup.chart[lang]}</span>
                    <span className="text-[10px] text-green-600 font-semibold">+18%</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-12">
                    {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1">
                        <div className="w-full bg-green-500 rounded-t opacity-80" style={{ height: `${h}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 steps */}
          <div className="mt-10 flex flex-wrap justify-center gap-4 max-w-4xl mx-auto" id="cara-kerja">
            {T.steps.map((step, i) => (
              <div key={i} className="text-center flex-1 min-w-[100px]">
                <div className="w-9 h-9 bg-green-600 text-white text-sm font-bold rounded-full flex items-center justify-center mx-auto mb-2">
                  {i + 1}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{step.t[lang]}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.d[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section ref={el => { sectionRefs.current[1] = el }} className="py-12 md:py-16 px-4 overflow-x-hidden" id="fitur">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-2">{T.features.heading[lang]}</h2>
            <p className="text-gray-600 dark:text-gray-400">{T.features.subheading[lang]}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8 w-full max-w-full">
            {T.features.items.map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFeature(i)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeFeature === i
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                }`}
              >
                {FEATURE_ICONS[i]}
                <span className="hidden sm:inline">{f.title[lang]}</span>
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-xl flex items-center justify-center">
                    {FEATURE_ICONS[activeFeature]}
                  </div>
                  <h3 className="text-xl font-bold">{feat.title[lang]}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{feat.desc[lang]}</p>
                <ul className="space-y-2">
                  {feat.points.map((p, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {p[lang]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:w-48 flex flex-wrap md:flex-col gap-1.5 md:border-l md:border-gray-100 md:dark:border-gray-700 md:pl-4">
                {T.trustBadges.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1.5 md:flex-none">
                    <span className="text-green-600">{TRUST_ICONS[i]}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b[lang]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section ref={el => { sectionRefs.current[2] = el }} className="py-12 md:py-16 px-4 overflow-x-hidden" id="harga">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-2">{T.pricing.heading[lang]}</h2>
            <p className="text-gray-600 dark:text-gray-400">{T.pricing.subheading[lang]}</p>

            <div className="inline-flex mt-4 bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1">
              {(['subscription', 'onetime'] as const).map(mode => (
                <button key={mode} onClick={() => setPricingMode(mode)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${pricingMode === mode ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>
                  {mode === 'subscription' ? T.pricing.subscription[lang] : T.pricing.onetime[lang]}
                </button>
              ))}
            </div>
          </div>

          {pricingMode === 'subscription' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
              {T.pricing.sub.map((plan, i) => (
                <PricingCard key={i} name={plan.name} price={plan.price}
                  period={plan.period?.[lang]}
                  badge={plan.badge?.[lang]} badgeColor={plan.badgeColor}
                  desc={plan.desc[lang]}
                  features={plan.features.map(f => f[lang])}
                  cta={plan.cta[lang]} href={plan.href}
                  waMsg={plan.waMsg?.[lang]}
                  popular={plan.popular}
                  popularLabel={lang === 'en' ? 'POPULAR' : 'POPULER'} />
              ))}
            </div>
          )}

          {pricingMode === 'onetime' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
              {T.pricing.once.map((plan, i) => (
                <PricingCard key={i} name={plan.name} price={plan.price}
                  badge={plan.badge[lang]} badgeColor={plan.badgeColor}
                  desc={plan.desc[lang]}
                  features={plan.features.map(f => f[lang])}
                  cta={plan.cta[lang]}
                  waMsg={plan.waMsg[lang]}
                  popular={plan.popular}
                  popularLabel={lang === 'en' ? 'POPULAR' : 'POPULER'} />
              ))}
            </div>
          )}

          {/* Upsell strip */}
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-green-600">
                <DollarSign className="w-5 h-5" />
                <Zap className="w-5 h-5" />
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{T.pricing.upsell.title[lang]}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{T.pricing.upsell.desc[lang]}</p>
              </div>
            </div>
            <a href={buildWaLink(T.pricing.upsell.waMsg[lang])} target="_blank" rel="noopener noreferrer"
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> {T.pricing.upsell.cta[lang]}
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section ref={el => { sectionRefs.current[3] = el }} className="py-12 md:py-16 px-4 overflow-x-hidden" id="faq">
        <div className="max-w-2xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-6">{T.faq.heading[lang]}</h2>
          <div className="space-y-2">
            {T.faq.items.map((faq, i) => (
              <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-green-300 dark:hover:border-green-700 transition-all overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3.5">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 pr-4">{faq.q[lang]}</h3>
                  <span className="text-green-600 font-bold text-lg shrink-0">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                    {faq.a[lang]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-12 md:py-16 px-4 bg-green-600 text-white text-center overflow-x-hidden">
        <div className="max-w-2xl mx-auto w-full">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">{T.finalCta.heading[lang]}</h2>
          <p className="text-base mb-6 opacity-90">{T.finalCta.desc[lang]}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="bg-white text-green-600 hover:bg-green-50 font-bold px-7 py-3.5 rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2">
              {T.finalCta.cta[lang]} <ArrowRight className="w-4 h-4" />
            </Link>
            <a href={buildWaLink(T.finalCta.contactWa[lang])} target="_blank" rel="noopener noreferrer"
              className="border-2 border-white hover:bg-white/10 font-bold px-7 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> {T.finalCta.contact[lang]}
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 text-white py-10 px-4 overflow-x-hidden">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src="/logo.svg" alt="Laku POS" className="w-6 h-6" />
                <span className="text-lg font-bold text-green-400">Laku POS</span>
              </div>
              <p className="text-gray-400 text-sm max-w-xs">{T.footer.tagline[lang]}</p>
            </div>
            <div className="flex gap-10">
              <div>
                <h4 className="font-semibold text-green-400 text-sm mb-2">{T.footer.product[lang]}</h4>
                <ul className="space-y-1.5 text-gray-400 text-sm">
                  <li><a href="#fitur" className="hover:text-white transition-colors">{T.nav.features[lang]}</a></li>
                  <li><a href="#harga" className="hover:text-white transition-colors">{T.nav.pricing[lang]}</a></li>
                  <li><Link href="/register" className="hover:text-white transition-colors">{T.footer.register[lang]}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-400 text-sm mb-2">{T.footer.help[lang]}</h4>
                <ul className="space-y-1.5 text-gray-400 text-sm">
                  <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                  <li><a href={buildWaLink(T.footer.helpWa[lang])} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">{T.nav.login[lang]}</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-gray-500 text-xs">
            <p>&copy; 2026 Laku POS. {T.footer.copy[lang]}</p>
            <p>{T.footer.madeFor[lang]}</p>
          </div>
        </div>
      </footer>

      {/* ── CHAT WIDGET ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="bg-green-600 text-white p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">L</div>
                <div>
                  <h3 className="font-bold text-sm">{T.chat.title[lang]}</h3>
                  <p className="text-[11px] opacity-80">{T.chat.subtitle[lang]}</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded-full p-1.5 transition-colors text-lg">✕</button>
            </div>
            <div className="h-72 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">L</div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-[80%]">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{T.chat.greeting[lang]}</p>
                </div>
              </div>
              {quickActionsVisible && (
                <div className="space-y-2">
                  {T.chat.quickActions.map((a, i) => (
                    <button key={i} onClick={() => handleQuickAction(a)}
                      className="w-full text-left bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-gray-700 px-3 py-2.5 rounded-xl shadow-sm transition-colors text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                      {a.label[lang]}
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
                  placeholder={T.chat.placeholder[lang]} className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-full text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-green-500" />
                <button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors">{T.chat.send[lang]}</button>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(!chatOpen)}
          className={`${chatOpen ? 'hidden' : 'flex'} relative items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 font-semibold`}>
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Chat</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
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
  popularLabel?: string
  href?: string; waMsg?: string
}

function PricingCard({ name, price, period, badge, badgeColor, desc, features, cta, popular, popularLabel, href, waMsg }: PricingCardProps) {
  const btnClass = `block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
    popular
      ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
      : 'bg-gray-50 dark:bg-gray-700 text-green-600 dark:text-green-400 border border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-gray-600'
  }`
  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl p-4 md:p-5 border transition-all hover:-translate-y-0.5 hover:shadow-lg w-full ${
      popular ? 'border-green-500 shadow-md' : 'border-gray-100 dark:border-gray-700'
    }`}>
      {popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
          {popularLabel || 'POPULER'}
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{name}</h3>
        {badge && !popular && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${badgeColor}`}>{badge}</span>}
      </div>
      <div className="mb-1 flex items-baseline gap-0.5">
        <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{price}</span>
        {period && <span className="text-gray-500 dark:text-gray-400 text-xs">{period}</span>}
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">{desc}</p>
      <ul className="space-y-1.5 mb-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />{f}
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
