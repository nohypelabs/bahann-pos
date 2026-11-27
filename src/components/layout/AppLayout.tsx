'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CheckCircle, LayoutDashboard, Receipt, Settings, Warehouse, Wrench } from 'lucide-react'
import { SidebarToggleIcon } from './SidebarToggleIcon'
import { Sidebar } from './Sidebar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { MobileScanFab } from './MobileScanFab'
import { useInventoryAccess } from './useInventoryAccess'
import { useOpsBadges } from './useOpsBadges'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useSidebarOpen, useSidebarShortcut } from '@/hooks/useSidebarOpen'

interface AppLayoutProps {
  children: ReactNode
}

const ROUTE_META = [
  {
    match: (pathname: string) => pathname.startsWith('/pos/notes'),
    title: 'Nota Servis',
    description: 'Nota per motor: isi jasa dan sparepart sambil dikerjakan, bayar saat motor diambil.',
    badge: 'Bengkel',
  },
  {
    match: (pathname: string) => pathname.startsWith('/members'),
    title: 'Member & Pelanggan',
    description: 'Kartu servis, voucher, motor, dan riwayat servis tiap pelanggan.',
    badge: 'Bengkel',
  },
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

// Every app page has frosted glass panels over the coloured light, except the first-run setup,
// which has its own full-screen design.
const PLAIN_ROUTES = ['/setup']

/** Soft brand-coloured light behind the glass panels. Static, so it costs one paint.
 * It sticks to the top of the scrolling <main>, takes no room, and stays under the page content. */
function GlassBackdrop() {
  return (
    <div aria-hidden className="glass-backdrop pointer-events-none sticky top-0 h-0">
      <div className="absolute inset-x-0 top-0 h-screen overflow-hidden">
        <div className="absolute -left-24 top-24 h-[420px] w-[520px] rounded-full bg-[#5FB3A6] opacity-35 blur-[110px]" />
        <div className="absolute right-[-120px] top-[-60px] h-[460px] w-[560px] rounded-full bg-[#BFE3DA] opacity-70 blur-[120px]" />
        <div className="absolute bottom-[-160px] left-1/3 h-[420px] w-[620px] rounded-full bg-[#F6C979] opacity-25 blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-[300px] w-[380px] rounded-full bg-[#0F5F56] opacity-15 blur-[110px]" />
      </div>
    </div>
  )
}

function getRouteMeta(pathname: string) {
  return (
    ROUTE_META.find((item) => item.match(pathname)) ?? {
      title: 'Laku POS',
      description: 'Workspace operasional untuk kasir, gudang, dan aktivitas toko harian.',
      badge: 'Workspace',
    }
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const isPosSales = pathname === '/pos/sales'
  const isGlass = !PLAIN_ROUTES.some((route) => pathname.startsWith(route))
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebar = useSidebarOpen()
  useSidebarShortcut(sidebar.toggle)
  const routeMeta = getRouteMeta(pathname)
  const inventoryAccess = useInventoryAccess()
  const { t } = useLanguage()
  const { alertCount, pendingApprovalsCount, canApprove, canUseInventory, canUseWorkshop } = useOpsBadges()
  const quickLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    // A workshop's day runs on service notes; the quick cashier is for walk-in sales.
    ...(canUseWorkshop ? [{ href: '/pos/notes', label: t('sidebar.pos.notes'), icon: Wrench }] : []),
    { href: '/pos/sales', label: 'Kasir', icon: Receipt },
    { href: '/warehouse/stock', label: 'Gudang', icon: Warehouse },
  ]
  // Always visible, phone included: an approval keeps a cashier waiting at the counter.
  const attention = [
    ...(canApprove
      ? [{ href: '/approvals', label: t('sidebar.operations.approvals'), icon: CheckCircle, count: pendingApprovalsCount, tone: 'bg-red-600' }]
      : []),
    ...(canUseInventory
      ? [{ href: '/alerts', label: t('sidebar.operations.alerts'), icon: Bell, count: alertCount, tone: 'bg-amber-500' }]
      : []),
  ]
  const attentionLinks = attention.map(({ href, label, icon: Icon, count, tone }) => (
    <Link
      key={href}
      href={href}
      title={label}
      aria-label={count > 0 ? `${label}: ${count}` : label}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
        pathname.startsWith(href)
          ? 'border-[#0b4e48] bg-[#0f5f56] text-white'
          : 'border-[#E4E6E7] bg-white text-[#5f675f] hover:bg-[#F4F5F5] hover:text-[#17201d]'
      }`}
    >
      <Icon className="h-5 w-5" />
      {count > 0 && (
        <span className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${tone}`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  ))

  return (
    <div className="flex h-screen overflow-hidden bg-[#FFFFFF]">
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopOpen={sidebar.open}
        onToggleDesktop={sidebar.toggle}
        shortcut={sidebar.shortcut}
      />
      {inventoryAccess.modal}

      <main
        className="flex-1 overflow-y-auto bg-white"
        role="main"
      >
        {isGlass && <GlassBackdrop />}
        <header className="sticky top-0 z-30 border-b border-[#E4E6E7]/90 bg-[#FFFFFF]/95 backdrop-blur-md">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {/* Phones only: opens the drawer. On desktop the toggle lives in the sidebar header. */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#E4E6E7] bg-white text-[#5f675f] transition-colors hover:bg-[#F4F5F5] hover:text-[#17201d] md:hidden"
                aria-label={t('sidebar.openMenu')}
              >
                <SidebarToggleIcon className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-[#17201d] sm:text-base">
                    {routeMeta.title}
                  </h1>
                  <span className="hidden rounded-full border border-[#E4E6E7] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5f675f] lg:inline-flex">
                    {routeMeta.badge}
                  </span>
                </div>
                <p className="hidden truncate text-xs text-[#6f776f] lg:block">
                  {routeMeta.description}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 lg:flex">
                {quickLinks.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`)

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={href.startsWith('/warehouse') ? inventoryAccess.guard : undefined}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-[#0b4e48] bg-[#0f5f56] text-white'
                          : 'border-[#E4E6E7] bg-white text-[#5f675f] hover:bg-[#F4F5F5] hover:text-[#17201d]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </div>
              {attentionLinks}
              <Link
                href="/settings/payments"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E4E6E7] bg-white text-[#5f675f] transition-colors hover:bg-[#F4F5F5] hover:text-[#17201d]"
                aria-label="Buka pengaturan"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* relative without a z-index: paints over the backdrop and keeps page modals above the header */}
        <div className={`relative min-h-full px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4 lg:px-6 lg:pb-6 lg:pt-5 ${isGlass ? 'glass-scope' : ''}`}>
          {children}
        </div>
      </main>

      {!isPosSales && <MobileScanFab />}
      <OfflineIndicator />
    </div>
  )
}
