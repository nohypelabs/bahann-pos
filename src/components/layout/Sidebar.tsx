'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import { logger } from '@/lib/logger'
import { usePWA } from '@/lib/pwa/PWAContext'
import { trpc } from '@/lib/trpc/client'

interface SidebarItemProps {
  href: string
  icon: ReactNode
  label: string
  badge?: string
  isCollapsed: boolean
}

function SidebarItem({ href, icon, label, badge, isCollapsed }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={`
        flex items-center gap-4 rounded-xl
        transition-all duration-200 group relative
        ${isCollapsed ? 'px-4 py-4 justify-center' : 'px-6 py-3'}
        ${
          isActive
            ? 'bg-white dark:bg-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] border-2 border-gray-200 dark:border-gray-600 translate-x-2'
            : 'hover:bg-white/50 dark:hover:bg-gray-700/50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] hover:translate-x-1'
        }
      `}
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>
      {!isCollapsed && (
        <>
          <div className="flex-1 min-w-0">
            <span className={`text-base font-semibold truncate block ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
              {label}
            </span>
          </div>
          {badge && (
            <span className="px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full flex-shrink-0">
              {badge}
            </span>
          )}
        </>
      )}
      {isCollapsed && badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  )
}

interface SidebarSectionProps {
  sectionKey: string
  title: string
  children: ReactNode
  isCollapsed: boolean
  activePaths?: string[]
}

function SidebarSection({ sectionKey, title, children, isCollapsed, activePaths = [] }: SidebarSectionProps) {
  const pathname = usePathname()
  const isActiveSection = activePaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const [isOpen, setIsOpen] = useState(isActiveSection)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sidebar_section_${sectionKey}`)
      if (saved !== null) {
        setIsOpen(saved === 'true')
      } else if (isActiveSection) {
        setIsOpen(true)
      }
    }
  }, [sectionKey, isActiveSection])

  const toggle = () => {
    const next = !isOpen
    setIsOpen(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`sidebar_section_${sectionKey}`, String(next))
    }
  }

  if (isCollapsed) {
    return (
      <div className="mb-2">
        <div className="h-px bg-gray-200 dark:bg-gray-700 mx-2 mb-2" />
        <div className="space-y-2">{children}</div>
      </div>
    )
  }

  return (
    <div className="mb-2">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-6 py-2 group"
      >
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {title}
        </h3>
        <span className={`text-gray-400 dark:text-gray-500 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-1 pb-2">{children}</div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { canInstall, isInstalled, install } = usePWA()
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('user')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const { data: planData } = trpc.auth.getPlan.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user')
      if (user) {
        try {
          const userData = JSON.parse(user)
          setUserName(userData.name || 'User')
          setUserEmail(userData.email || '')
          setUserRole(userData.role || 'user')
        } catch (error) {
          logger.error('Failed to parse user data', error)
        }
      }

      const savedCollapsed = localStorage.getItem('sidebar_collapsed')
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true')
      }
    }
  }, [])

  const handleLogout = () => setShowLogoutModal(true)

  const confirmLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id')
  }

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem('sidebar_collapsed', String(newCollapsed))
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: t('role.admin'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
      case 'manager':
        return { label: t('role.manager'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
      default:
        return { label: t('role.user'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
    }
  }

  const roleBadge = getRoleBadge(userRole)
  const userInitial = userName.charAt(0).toUpperCase()

  return (
  <>
    <aside className={`
      ${isCollapsed ? 'w-20' : 'w-72'}
      h-screen bg-gray-50 dark:bg-gray-900 border-r-2 border-gray-200 dark:border-gray-800 flex flex-col
      transition-all duration-300 ease-in-out flex-shrink-0
    `}>
      {/* Logo/Header */}
      <div className={`border-b-2 border-gray-200 dark:border-gray-800 flex items-center justify-between ${isCollapsed ? 'p-4' : 'p-6'} transition-all duration-300`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Laku POS" className="w-9 h-9 rounded-xl" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Laku POS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Point of Sale</p>
              </div>
            </div>
            <button
              onClick={toggleCollapse}
              className="ml-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Collapse sidebar"
            >
              <span className="text-xl">◀</span>
            </button>
          </>
        ) : (
          <button
            onClick={toggleCollapse}
            className="w-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Expand sidebar"
          >
            <span className="text-xl">▶</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-3' : 'py-4'} transition-all duration-300`}>

        {/* Dashboard */}
        <div className={`${isCollapsed ? 'mb-2' : 'mb-1'}`}>
          {!isCollapsed && (
            <h3 className="px-6 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('sidebar.dashboard')}
            </h3>
          )}
          <div className={`${isCollapsed ? '' : 'px-2'}`}>
            <SidebarItem href="/dashboard" icon="📊" label={t('sidebar.dashboard')} isCollapsed={isCollapsed} />
          </div>
        </div>

        <SidebarSection sectionKey="warehouse" title={t('sidebar.warehouse')} isCollapsed={isCollapsed} activePaths={['/warehouse']}>
          <div className="px-2 space-y-1">
            <SidebarItem href="/warehouse/stock" icon="📦" label={t('sidebar.warehouse.stock')} isCollapsed={isCollapsed} />
            <SidebarItem href="/warehouse/inventory" icon="📋" label={t('sidebar.warehouse.inventory')} isCollapsed={isCollapsed} />
            <SidebarItem href="/warehouse/reports" icon="📈" label={t('sidebar.warehouse.reports')} isCollapsed={isCollapsed} />
          </div>
        </SidebarSection>

        <SidebarSection sectionKey="pos" title={t('sidebar.pos')} isCollapsed={isCollapsed} activePaths={['/pos']}>
          <div className="px-2 space-y-1">
            <SidebarItem href="/pos/sales" icon="🛒" label={t('sidebar.pos.sales')} isCollapsed={isCollapsed} />
            <SidebarItem href="/pos/history" icon="📜" label={t('sidebar.pos.history')} isCollapsed={isCollapsed} />
            <SidebarItem href="/pos/revenue" icon="💰" label={t('sidebar.pos.revenue')} isCollapsed={isCollapsed} />
          </div>
        </SidebarSection>

        <SidebarSection sectionKey="management" title="Management" isCollapsed={isCollapsed} activePaths={['/transactions', '/payments', '/promotions', '/eod', '/alerts']}>
          <div className="px-2 space-y-1">
            <SidebarItem href="/transactions" icon="🔄" label="Transactions" isCollapsed={isCollapsed} />
            <SidebarItem href="/payments" icon="💳" label="Payments" isCollapsed={isCollapsed} />
            <SidebarItem href="/promotions" icon="🎫" label="Promotions" isCollapsed={isCollapsed} />
            <SidebarItem href="/eod" icon="💼" label="End of Day" isCollapsed={isCollapsed} />
            <SidebarItem href="/alerts" icon="📢" label="Stock Alerts" isCollapsed={isCollapsed} />
          </div>
        </SidebarSection>

        <SidebarSection sectionKey="masterdata" title="Master Data" isCollapsed={isCollapsed} activePaths={['/products', '/outlets']}>
          <div className="px-2 space-y-1">
            <SidebarItem href="/products" icon="🏷️" label="Products" isCollapsed={isCollapsed} />
            <SidebarItem href="/outlets" icon="🏪" label="Outlets" isCollapsed={isCollapsed} />
          </div>
        </SidebarSection>

        {userRole === 'admin' && (
          <SidebarSection sectionKey="settings" title="Settings" isCollapsed={isCollapsed} activePaths={['/settings']}>
            <div className="px-2 space-y-1">
              <SidebarItem href="/settings/users" icon="👥" label="User Management" isCollapsed={isCollapsed} />
              <SidebarItem href="/settings/audit-logs" icon="📋" label="Audit Logs" isCollapsed={isCollapsed} />
              <SidebarItem href="/settings/reset" icon="🗑️" label="Reset Data" isCollapsed={isCollapsed} />
            </div>
          </SidebarSection>
        )}

        <SidebarSection sectionKey="account" title={t('sidebar.account')} isCollapsed={isCollapsed} activePaths={['/profile', '/help', '/about']}>
          <div className="px-2 space-y-1">
            <SidebarItem href="/profile" icon="👤" label={t('sidebar.profile')} isCollapsed={isCollapsed} />
            <SidebarItem href="/help" icon="📖" label="Bantuan" isCollapsed={isCollapsed} />
            <SidebarItem href="/about" icon="ℹ️" label={t('sidebar.about')} isCollapsed={isCollapsed} />
          </div>
        </SidebarSection>
      </nav>

      {/* Footer */}
      <div className={`border-t-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${isCollapsed ? 'p-3' : 'p-4'} transition-all duration-300`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
              </div>
            </div>

            {/* Language + Theme row */}
            <div className="mb-3 flex gap-2">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200 flex-1 justify-center"
              >
                <span className="text-lg">{language === 'id' ? '🇮🇩' : '🇬🇧'}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {language === 'id' ? 'ID' : 'EN'}
                </span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                <span className="text-lg">{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>
            </div>

            {planData && planData.plan !== 'free' && canInstall && !isInstalled && (
              <button
                onClick={install}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors border border-green-200 dark:border-green-800"
              >
                <span>📲</span>
                <span>Install Aplikasi</span>
              </button>
            )}

            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                🚪 {t('sidebar.logout')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold cursor-pointer hover:scale-110 transition-transform"
              title={userName}
            >
              {userInitial}
            </div>
            <button
              onClick={toggleTheme}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              <span className="text-2xl">{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>
            <button
              onClick={toggleLanguage}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              <span className="text-2xl">{language === 'id' ? '🇮🇩' : '🇬🇧'}</span>
            </button>
            {planData && planData.plan !== 'free' && canInstall && !isInstalled && (
              <button
                onClick={install}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                title="Install Aplikasi"
              >
                <span className="text-2xl">📲</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
              title={t('sidebar.logout')}
            >
              <span className="text-2xl">🚪</span>
            </button>
          </div>
        )}
      </div>
    </aside>

    {/* Logout confirmation modal */}
    {showLogoutModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-3xl">
            🚪
          </div>

          {/* Text */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Keluar dari akun?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sesi kamu akan diakhiri. Pastikan semua transaksi sudah tersimpan.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              ref={cancelRef}
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors shadow-lg shadow-red-500/20"
            >
              Ya, Keluar
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
