'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Section {
  id: string
  title: string
  icon: string
  content: {
    subtitle?: string
    items?: string[]
    description?: string
    subsections?: {
      title: string
      items: string[]
    }[]
    steps?: {
      title: string
      description: string
    }[]
    faqs?: {
      question: string
      answer: string
    }[]
  }
}

const sections: Section[] = [
  {
    id: 'overview',
    title: 'Ringkasan Sistem',
    icon: '🎯',
    content: {
      description: 'Laku POS adalah sistem Point of Sale dan warehouse management yang dirancang untuk memudahkan pengelolaan bisnis retail Anda. Sistem ini dilengkapi dengan fitur-fitur modern seperti barcode scanning, forgot password, manajemen multi-outlet, tracking stok real-time, dan laporan penjualan yang komprehensif.',
      items: [
        'Multi-outlet management dengan kontrol stok per cabang',
        'Real-time inventory tracking',
        'Barcode scanning untuk transaksi cepat',
        'Dashboard analytics dengan visualisasi data',
        'Role-based access control (Admin, Manager, Kasir)',
        'Audit logging untuk keamanan',
        'Mobile-responsive design',
        'Forgot password dengan email verification'
      ]
    }
  },
  {
    id: 'security',
    title: 'Keamanan & Login',
    icon: '🔐',
    content: {
      subsections: [
        {
          title: 'Login & Registrasi',
          items: [
            'Login dengan email dan password',
            'Auto logout setelah 24 jam untuk keamanan',
            'Session management dengan refresh token',
            'Remember me untuk kenyamanan'
          ]
        },
        {
          title: 'Lupa Password (Baru ✨)',
          items: [
            'Request reset via email',
            'Token berlaku 1 jam',
            'Single-use token (tidak bisa dipakai 2x)',
            'Auto logout semua device setelah reset',
            'Email enumeration protection'
          ]
        },
        {
          title: 'Role Management',
          items: [
            'Admin: Akses penuh ke semua fitur',
            'Manager: Akses laporan dan stok',
            'Kasir: Akses transaksi dan POS saja'
          ]
        }
      ]
    }
  },
  {
    id: 'outlets',
    title: 'Manajemen Outlet',
    icon: '🏪',
    content: {
      description: 'Kelola multiple cabang/outlet dengan mudah',
      items: [
        'Tambah/edit/hapus outlet',
        'Set outlet status (Active/Inactive)',
        'Tracking stok per outlet',
        'Lihat performa penjualan per outlet',
        'Transfer stok antar outlet'
      ]
    }
  },
  {
    id: 'products',
    title: 'Manajemen Produk',
    icon: '📦',
    content: {
      subsections: [
        {
          title: 'Master Produk',
          items: [
            'Tambah produk baru dengan barcode',
            'Edit informasi produk (nama, harga, deskripsi)',
            'Upload gambar produk',
            'Set kategori produk',
            'Atur harga jual'
          ]
        },
        {
          title: 'Barcode Management',
          items: [
            'Generate barcode otomatis',
            'Manual input barcode',
            'Scan barcode saat transaksi',
            'Print barcode label'
          ]
        }
      ]
    }
  },
  {
    id: 'stock',
    title: 'Manajemen Stok',
    icon: '📊',
    content: {
      description: 'Kontrol inventory dengan presisi',
      items: [
        'Real-time stock tracking per outlet',
        'Stock in (penambahan stok)',
        'Stock out (pengurangan stok)',
        'Stock transfer antar outlet',
        'Stock opname/audit',
        'Low stock alerts (stok menipis)',
        'Stock history & audit trail'
      ]
    }
  },
  {
    id: 'pos',
    title: 'Point of Sale (Kasir)',
    icon: '🛒',
    content: {
      subsections: [
        {
          title: 'Transaksi Penjualan',
          items: [
            'Pilih outlet terlebih dahulu',
            'Tambah produk ke cart (manual atau scan)',
            'Lihat stock availability real-time',
            'Input jumlah pembelian',
            'Pilih metode pembayaran',
            'Hitung kembalian otomatis',
            'Print/download struk'
          ]
        },
        {
          title: 'Scan Barcode (Baru ✨)',
          items: [
            'Buka kamera scanner',
            'Scan barcode produk',
            'Produk otomatis masuk ke cart',
            'Cepat dan akurat'
          ]
        },
        {
          title: 'Metode Pembayaran',
          items: [
            'Cash (tunai)',
            'Debit Card',
            'Credit Card',
            'E-Wallet (QRIS)',
            'Transfer Bank'
          ]
        }
      ]
    }
  },
  {
    id: 'dashboard',
    title: 'Dashboard & Laporan',
    icon: '📈',
    content: {
      description: 'Analytics dan insights bisnis Anda',
      items: [
        'Total revenue hari ini',
        'Total transaksi',
        'Produk terlaris',
        'Grafik penjualan (harian/mingguan/bulanan)',
        'Stock alerts & notifikasi',
        'Revenue per outlet',
        'Export laporan ke Excel/PDF'
      ]
    }
  },
  {
    id: 'settings',
    title: 'Pengaturan Sistem',
    icon: '⚙️',
    content: {
      subsections: [
        {
          title: 'User Management (Admin Only)',
          items: [
            'Tambah user baru',
            'Edit role user',
            'Aktifkan/nonaktifkan user',
            'Reset password user'
          ]
        },
        {
          title: 'Audit Logs (Admin Only)',
          items: [
            'Lihat semua aktivitas user',
            'Track login/logout',
            'Monitor transaksi',
            'Detect anomali'
          ]
        },
        {
          title: 'Profile',
          items: [
            'Edit nama',
            'Ganti password',
            'Update email'
          ]
        }
      ]
    }
  },
  {
    id: 'mobile',
    title: 'Penggunaan di Mobile',
    icon: '📱',
    content: {
      description: 'Aplikasi fully responsive untuk smartphone dan tablet',
      items: [
        'Buka browser (Chrome/Safari)',
        'Akses URL sistem',
        'Login seperti biasa',
        'Sidebar auto-collapse di mobile',
        'Tap menu untuk navigasi',
        'Barcode scanner menggunakan kamera HP',
        'Touch-friendly buttons',
        'Swipe untuk scroll'
      ]
    }
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQ',
    icon: '❓',
    content: {
      faqs: [
        {
          question: 'Lupa password, bagaimana cara reset?',
          answer: 'Klik "Lupa Password" di halaman login, masukkan email, cek inbox untuk link reset. Link berlaku 1 jam.'
        },
        {
          question: 'Email reset password tidak masuk?',
          answer: 'Cek folder Spam/Junk. Tunggu 5 menit. Pastikan email yang diinput benar. Hubungi admin jika masih tidak masuk.'
        },
        {
          question: 'Kenapa tidak bisa tambah produk ke cart?',
          answer: 'Pastikan sudah memilih outlet terlebih dahulu. Cek stock availability, jika stock 0 tidak bisa ditambahkan.'
        },
        {
          question: 'Barcode scanner tidak berfungsi?',
          answer: 'Izinkan akses kamera pada browser. Pastikan barcode cukup terang dan fokus. Gunakan browser Chrome/Safari untuk hasil terbaik.'
        },
        {
          question: 'Struk tidak bisa di-print?',
          answer: 'Gunakan fitur "Download Struk" lalu print dari PDF viewer. Atau tekan Ctrl+P (Windows) / Cmd+P (Mac) saat modal struk terbuka.'
        },
        {
          question: 'Data dashboard tidak real-time?',
          answer: 'Refresh halaman (F5). Dashboard update otomatis setiap transaksi baru, tapi bisa delay 1-2 detik.'
        },
        {
          question: 'Tidak bisa akses menu User Management?',
          answer: 'Fitur ini khusus Admin. Jika Anda Manager/Kasir, hubungi Admin untuk upgrade role atau minta bantuan.'
        },
        {
          question: 'Stock tidak berkurang setelah transaksi?',
          answer: 'Cek apakah transaksi berhasil (ada di History). Refresh halaman stock. Jika masih tidak update, hubungi admin - mungkin ada issue di background job.'
        }
      ]
    }
  },
  {
    id: 'guide-admin',
    title: 'Panduan untuk Admin',
    icon: '👑',
    content: {
      steps: [
        {
          title: 'Setup Awal Sistem',
          description: 'Tambahkan outlet, produk, dan user. Set role untuk masing-masing user.'
        },
        {
          title: 'Monitor Dashboard',
          description: 'Cek laporan penjualan, revenue, dan stock alerts setiap hari.'
        },
        {
          title: 'Kelola User',
          description: 'Tambah/edit/hapus user sesuai kebutuhan. Reset password user jika diperlukan.'
        },
        {
          title: 'Audit Logs',
          description: 'Review audit logs secara berkala untuk detect aktivitas mencurigakan.'
        },
        {
          title: 'Stock Management',
          description: 'Lakukan stock opname minimal 1 bulan sekali untuk akurasi data.'
        }
      ]
    }
  },
  {
    id: 'guide-manager',
    title: 'Panduan untuk Manager',
    icon: '👔',
    content: {
      steps: [
        {
          title: 'Monitor Stock',
          description: 'Cek stock alerts setiap hari. Lakukan stock in jika ada produk yang menipis.'
        },
        {
          title: 'Lihat Laporan',
          description: 'Review laporan penjualan mingguan/bulanan. Identifikasi produk terlaris.'
        },
        {
          title: 'Stock Transfer',
          description: 'Transfer stock antar outlet sesuai demand untuk optimasi inventory.'
        },
        {
          title: 'Koordinasi dengan Kasir',
          description: 'Pastikan kasir menggunakan sistem dengan benar dan lapor jika ada issue.'
        }
      ]
    }
  },
  {
    id: 'guide-cashier',
    title: 'Panduan untuk Kasir',
    icon: '💼',
    content: {
      steps: [
        {
          title: 'Login Setiap Shift',
          description: 'Login dengan akun Anda di awal shift. Logout di akhir shift.'
        },
        {
          title: 'Pilih Outlet',
          description: 'Pilih outlet yang sesuai sebelum melakukan transaksi.'
        },
        {
          title: 'Proses Transaksi',
          description: 'Scan barcode atau pilih produk manual. Input jumlah. Pilih metode pembayaran. Selesaikan transaksi.'
        },
        {
          title: 'Print Struk',
          description: 'Setelah transaksi berhasil, print atau download struk untuk customer.'
        },
        {
          title: 'Cek Stock',
          description: 'Jika produk habis saat transaksi, informasikan ke manager untuk stock in.'
        }
      ]
    }
  },
  {
    id: 'tech-stack',
    title: 'Teknologi yang Digunakan',
    icon: '🚀',
    content: {
      subsections: [
        {
          title: 'Frontend',
          items: [
            'Next.js 16 (React Framework)',
            'TypeScript (Type Safety)',
            'Tailwind CSS (Styling)',
            'Recharts (Data Visualization)',
            'html5-qrcode (Barcode Scanner)'
          ]
        },
        {
          title: 'Backend',
          items: [
            'tRPC (Type-safe API)',
            'Supabase (PostgreSQL Database)',
            'Resend (Email Service)',
            'Redis (Caching & Sessions)'
          ]
        },
        {
          title: 'Security',
          items: [
            'JWT Authentication',
            'Role-based Access Control (RBAC)',
            'Bcrypt Password Hashing',
            'HTTPS/TLS Encryption',
            'Audit Logging'
          ]
        }
      ]
    }
  }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('overview')

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections

    const query = searchQuery.toLowerCase()
    return sections.filter(section => {
      // Search in title
      if (section.title.toLowerCase().includes(query)) return true

      // Search in description
      if (section.content.description?.toLowerCase().includes(query)) return true

      // Search in items
      if (section.content.items?.some(item => item.toLowerCase().includes(query))) return true

      // Search in subsections
      if (section.content.subsections?.some(sub =>
        sub.title.toLowerCase().includes(query) ||
        sub.items.some(item => item.toLowerCase().includes(query))
      )) return true

      // Search in steps
      if (section.content.steps?.some(step =>
        step.title.toLowerCase().includes(query) ||
        step.description.toLowerCase().includes(query)
      )) return true

      // Search in FAQs
      if (section.content.faqs?.some(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      )) return true

      return false
    })
  }, [searchQuery])

  const currentSection = sections.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 md:mb-6 md:mb-8 text-center">
          <h1 className="text-lg md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 md:mb-3">
            📖 Pusat Bantuan
          </h1>
          <p className="text-sm md:text-lg text-gray-500 dark:text-gray-400 mb-4 md:mb-6">
            Dokumentasi lengkap sistem Laku POS
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4 md:mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Cari topik, fitur, atau pertanyaan..."
                className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-2 border-gray-300 dark:border-gray-600 rounded-2xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 text-sm md:text-xl md:text-2xl"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">
                {filteredSections.length} hasil ditemukan untuk "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {/* Table of Contents - Tablet & Desktop (sticky sidebar) */}
          <div className="hidden md:block md:col-span-1">
            <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-6 border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                <span>📑</span> Daftar Isi
              </h2>
              <nav className="space-y-1">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      // Scroll to top
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className={`
                      w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-xs md:text-sm
                      ${activeSection === section.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Mobile TOC Dropdown (phone only) */}
          <div className="md:hidden col-span-1">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full px-2 py-2 md:px-4 md:py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base font-semibold shadow-lg"
            >
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.icon} {section.title}
                </option>
              ))}
            </select>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {currentSection ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-6 lg:p-8 border-2 border-gray-200 dark:border-gray-700">
                {/* Section Header */}
                <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b-2 border-gray-200 dark:border-gray-700">
                  <h2 className="text-base md:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2 md:gap-3">
                    <span className="text-xs md:text-lg md:text-3xl md:text-4xl">{currentSection.icon}</span>
                    {currentSection.title}
                  </h2>
                  {currentSection.content.description && (
                    <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-2 md:mt-3">
                      {currentSection.content.description}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3 md:space-y-6">
                  {/* Simple Items List */}
                  {currentSection.content.items && (
                    <ul className="space-y-3">
                      {currentSection.content.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                          <span className="text-blue-500 font-bold text-xs md:text-lg mt-1">•</span>
                          <span className="flex-1 text-base leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Subsections */}
                  {currentSection.content.subsections?.map((subsection, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 rounded-xl p-4 md:p-6 border-2 border-blue-200 dark:border-blue-800">
                      <h3 className="text-xs md:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
                        {subsection.title}
                      </h3>
                      <ul className="space-y-2 md:space-y-3">
                        {subsection.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2 md:gap-3 text-gray-700 dark:text-gray-300">
                            <span className="text-purple-500 font-bold text-base md:text-lg mt-1">✓</span>
                            <span className="flex-1 text-sm md:text-base leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {/* Steps */}
                  {currentSection.content.steps?.map((step, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/40 dark:to-teal-950/40 rounded-xl p-4 md:p-6 border-2 border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 text-white font-bold flex items-center justify-center text-base md:text-lg">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xs md:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 md:mb-2">
                            {step.title}
                          </h3>
                          <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* FAQs */}
                  {currentSection.content.faqs?.map((faq, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/40 dark:to-orange-950/40 rounded-xl p-4 md:p-6 border-2 border-yellow-200 dark:border-yellow-800">
                      <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 md:mb-3 flex items-start gap-2">
                        <span className="text-yellow-600">Q:</span>
                        <span className="flex-1">{faq.question}</span>
                      </h3>
                      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed ml-6 md:ml-7">
                        <span className="font-bold text-green-600">A:</span> {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-8 border-2 border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm md:text-xl text-gray-600 dark:text-gray-400">
                  {searchQuery
                    ? 'Tidak ada hasil yang ditemukan. Coba kata kunci lain.'
                    : 'Pilih topik dari daftar isi untuk melihat dokumentasi.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 md:mt-8 md:mt-12 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-3 md:p-6 md:p-8 border-2 border-gray-200 dark:border-gray-700">
          <h3 className="text-sm md:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
            Masih Ada Pertanyaan?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 text-base md:text-lg">
            Jika Anda tidak menemukan jawaban yang Anda cari, hubungi administrator sistem atau tim support.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <Link
              href="/about"
              className="px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              ℹ️ Tentang Sistem
            </Link>
            <Link
              href="/dashboard"
              className="px-5 md:px-6 py-2.5 md:py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              📊 Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
