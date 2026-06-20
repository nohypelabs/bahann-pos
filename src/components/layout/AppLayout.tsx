'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Menu, Receipt, Settings, Warehouse } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { MobileScanFab } from './MobileScanFab'

interface AppLayoutProps {
  children: ReactNode
}

const ROUTE_META = [
  {
    match: (pathname: string) => pathname.startsWith('/pos'),
    title: 'Kasir Cepat',
    description: 'Cari barang, scan SKU, lalu checkout tanpa langkah tambahan yang tidak perlu.',
    badge: 'Core POS',
  },
  {
    match: (pathname: string) => pathname.startsWith('/warehouse'),
    title: 'Gudang Operasional',
    description: 'Stok masuk, penyesuaian, dan pemantauan inventori ditempatkan sebagai alur harian.',
    badge: 'Core Warehouse',
  },
  {
    match: (pathname: string) => pathname.startsWith('/transactions'),
    title: 'Monitor Transaksi',
    description: 'Pantau histori transaksi, pembayaran, dan tindak lanjut operasional.',
    badge: 'Operations',
  },
  {
    match: (pathname: string) => pathname.startsWith('/dashboard'),
    title: 'Ringkasan Toko',
    description: 'Lihat kondisi outlet, peringatan, dan performa penjualan dari satu tempat.',
    badge: 'Overview',
  },
]

function getRouteMeta(pathname: string) {
  return (
    ROUTE_META.find((item) => item.match(pathname)) ?? {
      title: 'Bahann POS',
      description: 'Workspace operasional untuk kasir, gudang, dan aktivitas toko harian.',
      badge: 'Workspace',
    }
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const isPosSales = pathname === '/pos/sales'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const routeMeta = getRouteMeta(pathname)
  const quickLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pos/sales', label: 'Kasir', icon: Receipt },
    { href: '/warehouse/stock', label: 'Gudang', icon: Warehouse },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f1ea]">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} desktopOpen={desktopOpen} />

      <main
        className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(243,241,234,0.92)_38%,_rgba(236,233,223,0.98)_100%)]"
        role="main"
      >
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f8f6ef]/95 backdrop-blur-md">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => { setMobileOpen(true); setDesktopOpen(!desktopOpen) }}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-100"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="Laku POS" className="hidden h-7 w-7 rounded-xl sm:block" />
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                    Bahann POS
                  </p>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-stone-900 sm:text-base">
                    {routeMeta.title}
                  </h1>
                  <span className="hidden rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 lg:inline-flex">
                    {routeMeta.badge}
                  </span>
                </div>
                <p className="hidden truncate text-xs text-stone-500 lg:block">
                  {routeMeta.description}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              {quickLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`)

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                )
              })}
              <Link
                href="/settings/payments"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                aria-label="Buka pengaturan"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>

            <Link
              href="/settings/payments"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 lg:hidden"
              aria-label="Buka pengaturan"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <div className="min-h-full px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4 lg:px-6 lg:pb-6 lg:pt-5">
          {children}
        </div>
      </main>

      {!isPosSales && <MobileScanFab />}
      <OfflineIndicator />
    </div>
  )
}
