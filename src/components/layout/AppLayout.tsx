'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Settings } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { MobileScanFab } from './MobileScanFab'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const isPosSales = pathname === '/pos/sales'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} desktopOpen={desktopOpen} />

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60">
          <button
            onClick={() => { setMobileOpen(true); setDesktopOpen(!desktopOpen) }}
            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 active:scale-95"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Laku POS" className="w-7 h-7 rounded-lg" />
            <span className="text-base font-bold text-green-600">Laku POS</span>
          </div>
          <Link href="/settings/payments" className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </header>

        <div className="min-h-full px-3 pb-3 sm:px-4 sm:pb-4 md:p-6 lg:p-8 xl:p-12">
          {children}
        </div>
      </main>

      {!isPosSales && <MobileScanFab />}
      <OfflineIndicator />
    </div>
  )
}
