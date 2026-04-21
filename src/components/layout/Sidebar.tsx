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
        flex items-center gap-3 rounded-xl text-sm font-medium
        transition-colors duration-150 relative
        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-[3px] border-blue-500 dark:border-blue-400 pl-[9px]'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        }
      `}
    >
      <span className={`text-base flex-shrink-0 ${isActive ? '' : 'opacity-80'}`}>{icon}</span>
      {!isCollapsed && (
        <>
          <span className="flex-1 min-w-0 truncate">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full flex-shrink-0">
              {badge}
            </span>
          )}
        </>
      )}
      {isCollapsed && badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="mb-1">
        <div className="h-px bg-gray-200 dark:bg-gray-700/60 mx-3 mb-1" />
        <div className="space-y-0.5">{children}</div>
      </div>
    )
  }

  return (
    <div className="mb-1">
      <button onClick={toggle} className="w-full flex items-center justify-between px-3 py-1.5 group">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">
          {title}
        </span>
        <span className={`text-gray-300 dark:text-gray-600 text-[9px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-0.5 pb-1">{children}</div>
      </div>
    </div>
  )
}

const PLAN_BADGE: Record<string, string> = {
  free:         'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  warung:       'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
  starter:      'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  professional: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  business:     'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  enterprise:   'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
}
const PLAN_LABEL: Record<string, string> = {
  free: 'Gratis', warung: 'Warung', starter: 'Starter',
  professional: 'Pro', business: 'Business', enterprise: 'Enterprise',
}

export function Sidebar() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { canInstall, isInstalled, install } = usePWA()
  const [userName,  setUserName]  = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userRole,  setUserRole]  = useState('user')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const { data: planData } = trpc.auth.getPlan.useQuery(undefined, { retry: false, staleTime: 5 * 60 * 1000 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user')
      if (user) {
        try {
          const u = JSON.parse(user)
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setUserName(u.name || 'User')
          setUserEmail(u.email || '')
          setUserRole(u.role || 'user')
        } catch (error) {
          logger.error('Failed to parse user data', error)
        }
      }
      const savedCollapsed = localStorage.getItem('sidebar_collapsed')
      if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === 'true')
    }
  }, [])

  const confirmLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const toggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' }
      case 'admin':   return { label: t('role.admin'),   color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
      case 'manager': return { label: t('role.manager'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' }
      default:        return { label: t('role.user'),    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
    }
  }

  const roleBadge   = getRoleBadge(userRole)
  const userInitial = userName.charAt(0).toUpperCase()
  const plan        = planData?.plan || 'free'

  return (
    <>
      <aside className={`
        ${isCollapsed ? 'w-[68px]' : 'w-64'}
        h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
      `}>

        {/* ── Logo ── */}
        <div className={`flex items-center border-b border-gray-200 dark:border-gray-800 h-14 flex-shrink-0 ${isCollapsed ? 'justify-center px-3' : 'justify-between px-4'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <img src="/logo.svg" alt="Laku POS" className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Laku POS</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Point of Sale</p>
                </div>
              </div>
              <button onClick={toggleCollapse} title="Collapse sidebar"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M10 3L5 8l5 5" />
                </svg>
              </button>
            </>
          ) : (
            <button onClick={toggleCollapse} title="Expand sidebar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

          {/* Dashboard */}
          <div className={`${isCollapsed ? 'mb-1' : 'mb-2'}`}>
            <SidebarItem href="/dashboard" icon="📊" label={t('sidebar.dashboard')} isCollapsed={isCollapsed} />
          </div>

          <SidebarSection sectionKey="warehouse" title={t('sidebar.warehouse')} isCollapsed={isCollapsed} activePaths={['/warehouse']}>
            <SidebarItem href="/warehouse/stock"     icon="📦" label={t('sidebar.warehouse.stock')}     isCollapsed={isCollapsed} />
            <SidebarItem href="/warehouse/inventory" icon="📋" label={t('sidebar.warehouse.inventory')} isCollapsed={isCollapsed} />
            <SidebarItem href="/warehouse/reports"   icon="📈" label={t('sidebar.warehouse.reports')}   isCollapsed={isCollapsed} />
          </SidebarSection>

          <SidebarSection sectionKey="pos" title={t('sidebar.pos')} isCollapsed={isCollapsed} activePaths={['/pos']}>
            <SidebarItem href="/pos/sales"   icon="🛒" label={t('sidebar.pos.sales')}   isCollapsed={isCollapsed} />
            <SidebarItem href="/pos/history" icon="📜" label={t('sidebar.pos.history')} isCollapsed={isCollapsed} />
            <SidebarItem href="/pos/revenue" icon="💰" label={t('sidebar.pos.revenue')} isCollapsed={isCollapsed} />
          </SidebarSection>

          <SidebarSection sectionKey="management" title="Manajemen" isCollapsed={isCollapsed} activePaths={['/transactions', '/payments', '/promotions', '/eod', '/alerts']}>
            <SidebarItem href="/transactions" icon="🔄" label="Transaksi"    isCollapsed={isCollapsed} />
            <SidebarItem href="/payments"     icon="💳" label="Pembayaran"   isCollapsed={isCollapsed} />
            <SidebarItem href="/promotions"   icon="🎫" label="Promosi"      isCollapsed={isCollapsed} />
            <SidebarItem href="/eod"          icon="💼" label="Tutup Hari"   isCollapsed={isCollapsed} />
            <SidebarItem href="/alerts"       icon="📢" label="Alert Stok"   isCollapsed={isCollapsed} />
          </SidebarSection>

          <SidebarSection sectionKey="masterdata" title="Master Data" isCollapsed={isCollapsed} activePaths={['/products', '/outlets']}>
            <SidebarItem href="/products" icon="🏷️" label="Produk"  isCollapsed={isCollapsed} />
            <SidebarItem href="/outlets"  icon="🏪" label="Outlet"  isCollapsed={isCollapsed} />
          </SidebarSection>

          {userRole === 'admin' && (
            <SidebarSection sectionKey="settings" title="Pengaturan" isCollapsed={isCollapsed} activePaths={['/settings']}>
              <SidebarItem href="/settings/payments"      icon="💰" label="Pembayaran"      isCollapsed={isCollapsed} />
              <SidebarItem href="/settings/users"         icon="👥" label="Pengguna"         isCollapsed={isCollapsed} />
              <SidebarItem href="/settings/audit-logs"    icon="📋" label="Audit Log"        isCollapsed={isCollapsed} />
              <SidebarItem href="/settings/reset"         icon="🗑️" label="Reset Data"       isCollapsed={isCollapsed} />
              <SidebarItem href="/settings/subscriptions" icon="⭐" label="Langganan"        isCollapsed={isCollapsed} />
            </SidebarSection>
          )}

          <SidebarSection sectionKey="account" title={t('sidebar.account')} isCollapsed={isCollapsed} activePaths={['/profile', '/help', '/about']}>
            <SidebarItem href="/profile" icon="👤" label={t('sidebar.profile')} isCollapsed={isCollapsed} />
            <SidebarItem href="/help"    icon="📖" label="Bantuan"               isCollapsed={isCollapsed} />
            <SidebarItem href="/about"   icon="ℹ️"  label={t('sidebar.about')}  isCollapsed={isCollapsed} />
          </SidebarSection>
        </nav>

        {/* ── Footer ── */}
        <div className={`border-t border-gray-200 dark:border-gray-800 ${isCollapsed ? 'p-2' : 'p-3'} flex-shrink-0`}>
          {!isCollapsed ? (
            <div className="space-y-3">
              {/* User info */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{userName}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{userEmail}</p>
                </div>
              </div>

              {/* Role + Plan badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>
                  {PLAN_LABEL[plan] || 'Gratis'}
                </span>
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors flex-1 justify-center"
                  title={language === 'id' ? 'Switch to English' : 'Ganti ke Indonesia'}>
                  <span className="text-sm">{language === 'id' ? '🇮🇩' : '🇬🇧'}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{language === 'id' ? 'ID' : 'EN'}</span>
                </button>
                <button onClick={toggleTheme}
                  className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
                  title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
                  <span className="text-sm">{theme === 'light' ? '🌙' : '☀️'}</span>
                </button>
                <button onClick={() => setShowLogoutModal(true)}
                  className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title={t('sidebar.logout')}>
                  <span className="text-sm">🚪</span>
                </button>
              </div>

              {/* Install PWA */}
              {planData && planData.plan !== 'free' && canInstall && !isInstalled && (
                <button onClick={install}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors border border-green-200 dark:border-green-800">
                  <span>📲</span><span>Install Aplikasi</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm" title={userName}>
                {userInitial}
              </div>
              <button onClick={toggleTheme} title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button onClick={() => setLanguage(language === 'id' ? 'en' : 'id')} title={language === 'id' ? 'Switch to English' : 'Indonesia'}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                {language === 'id' ? '🇮🇩' : '🇬🇧'}
              </button>
              {planData && planData.plan !== 'free' && canInstall && !isInstalled && (
                <button onClick={install} title="Install Aplikasi"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 transition-colors text-sm">
                  📲
                </button>
              )}
              <button onClick={() => setShowLogoutModal(true)} title={t('sidebar.logout')}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm">
                🚪
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 border border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-2xl">🚪</div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Keluar dari akun?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sesi kamu akan diakhiri. Pastikan semua transaksi sudah tersimpan.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button ref={cancelRef} onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Batal
              </button>
              <button onClick={confirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors shadow-sm">
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
