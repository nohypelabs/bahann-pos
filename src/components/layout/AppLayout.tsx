'use client'

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { OfflineIndicator } from '@/components/OfflineIndicator'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="min-h-full p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
          {children}
        </div>
      </main>

      <OfflineIndicator />
    </div>
  )
}
