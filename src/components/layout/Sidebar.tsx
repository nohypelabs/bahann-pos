'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { logger } from '@/lib/logger'
import { usePWA } from '@/lib/pwa/PWAContext'
import { trpc } from '@/lib/trpc/client'
import {
  LayoutDashboard, Package, ClipboardList, BarChart3,
  ShoppingCart, History, DollarSign, ArrowLeftRight,
  CreditCard, Ticket, Briefcase, Bell,
  Tag, Store, Users, Shield, Trash2, Star,
  User, HelpCircle, Info,
  LogOut, Download, X,
  Settings, ChevronDown, Crown,
  Receipt, ArrowDownUp,
} from 'lucide-react'

function SidebarItem({ href, icon, label, badge, isCollapsed }: {
  href: string; icon: ReactNode; label: string; badge?: string; isCollapsed: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={`
        flex items-center gap-3.5 rounded-xl text-[15px] font-medium
        transition-colors duration-150 relative
        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
        ${isActive
          ? 'text-gray-900 dark:text-white font-bold'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        }
      `}
    >
      <span className={`flex-shrink-0 [&>svg]:w-[20px] [&>svg]:h-[20px] ${isActive ? 'text-gray-900 dark:text-white' : 'opacity-80'}`}>{icon}</span>
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

function SidebarSection({ sectionKey, title, children, isCollapsed, activePaths = [] }: {
  sectionKey: string; title: string; children: ReactNode; isCollapsed: boolean; activePaths?: string[]
}) {
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

interface SidebarProps {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  desktopOpen?: boolean
}

export function Sidebar({ mobileOpen, setMobileOpen, desktopOpen = true }: SidebarProps) {
  const pathname = usePathname()
  const { language, setLanguage, t } = useLanguage()
  const { canInstall, isInstalled, install } = usePWA()
  const [userName,  setUserName]  = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userRole,  setUserRole]  = useState('user')
  const isCollapsed = !desktopOpen
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [subPengaturan, setSubPengaturan] = useState(false)
  const [subBantuan, setSubBantuan] = useState(false)

  const { data: planData } = trpc.auth.getPlan.useQuery(undefined, { retry: false, staleTime: 5 * 60 * 1000 })
  const { data: activeAlerts } = trpc.stockAlerts.getActive.useQuery({}, { retry: false, staleTime: 60 * 1000 })
  const alertCount = activeAlerts?.length || 0

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
}
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  const logoutMutation = trpc.auth.logout.useMutation()

  const confirmLogout = async () => {
    try { await logoutMutation.mutateAsync() } catch { /* server cleanup best-effort */ }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' }
      case 'admin':   return { label: t('role.admin'),   color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
      case 'manager': return { label: t('role.manager'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' }
      default:        return { label: t('role.user'),    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
    }
  }

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(max-width: 767px)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const roleBadge   = getRoleBadge(userRole)
  const userInitial = userName.charAt(0).toUpperCase()
  const plan        = planData?.plan || 'free'
  const showCollapsed = isCollapsed && !isMobile
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isSuperAdmin = userRole === 'super_admin'

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        w-72 ${isCollapsed ? 'md:w-[68px]' : 'md:w-64'}
        h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
        fixed md:relative z-50
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ── Top bar: close (mobile only) ── */}
        <div className={`flex items-center border-b border-gray-200 dark:border-gray-800 h-14 flex-shrink-0 ${showCollapsed ? 'justify-center px-3' : 'px-4'}`}>
          {!showCollapsed && (
            <button onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── User profile (X-style) ── */}
        {!showCollapsed && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <Link href="/profile" className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 hover:opacity-90 transition-opacity">
                {userInitial}
              </Link>
              <button onClick={() => setShowLogoutModal(true)} title={t('sidebar.logout')}
                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <Link href="/profile" className="block group">
              <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:underline">{userName}</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">{userEmail}</p>
            </Link>
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>
                {PLAN_LABEL[plan] || 'Gratis'}
              </span>
            </div>
          </div>
        )}

        {/* Collapsed: just avatar */}
        {showCollapsed && (
          <div className="flex flex-col items-center py-3 border-b border-gray-200 dark:border-gray-800">
            <Link href="/profile" className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm" title={userName}>
              {userInitial}
            </Link>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" role="navigation" aria-label="Menu navigasi">

          {/* ═══ SUPERADMIN PANEL — distinct section at top ═══ */}
          {isSuperAdmin && (
            <>
              {!showCollapsed ? (
                <div className="mb-2 mx-1 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Platform</span>
                  </div>
                  <div className="space-y-0.5">
                    <SidebarItem href="/admin" icon={<Crown />} label={t('sidebar.adminPanel')} isCollapsed={false} />
                    <SidebarItem href="/admin/tenants" icon={<Users />} label={t('sidebar.adminTenants')} isCollapsed={false} />
                    <SidebarItem href="/admin/roles" icon={<Shield />} label="Kelola Role" isCollapsed={false} />
                    <SidebarItem href="/admin/payments" icon={<CreditCard />} label={t('sidebar.adminPayments')} isCollapsed={false} />
                    <SidebarItem href="/admin/settings" icon={<Settings />} label={t('sidebar.adminSettings')} isCollapsed={false} />
                  </div>
                </div>
              ) : (
                <div className="mb-1">
                  <div className="h-px bg-purple-300 dark:bg-purple-700 mx-3 mb-1" />
                  <SidebarItem href="/admin" icon={<Crown />} label={t('sidebar.adminPanel')} isCollapsed={true} />
                  <SidebarItem href="/admin/tenants" icon={<Users />} label={t('sidebar.adminTenants')} isCollapsed={true} />
                  <SidebarItem href="/admin/roles" icon={<Shield />} label="Kelola Role" isCollapsed={true} />
                  <SidebarItem href="/admin/payments" icon={<CreditCard />} label={t('sidebar.adminPayments')} isCollapsed={true} />
                  <SidebarItem href="/admin/settings" icon={<Settings />} label={t('sidebar.adminSettings')} isCollapsed={true} />
                  <div className="h-px bg-purple-300 dark:bg-purple-700 mx-3 mt-1" />
                </div>
              )}
            </>
          )}

          {/* ═══ SHARED: Dashboard ═══ */}
          <div className={`${showCollapsed ? 'mb-1' : 'mb-2'}`}>
            <SidebarItem href="/dashboard" icon={<LayoutDashboard />} label={t('sidebar.dashboard')} isCollapsed={showCollapsed} />
          </div>

          {/* ═══ POS ═══ */}
          <SidebarSection sectionKey="pos" title={t('sidebar.pos')} isCollapsed={showCollapsed} activePaths={['/pos']}>
            <SidebarItem href="/pos/sales"   icon={<ShoppingCart />} label={t('sidebar.pos.sales')}   isCollapsed={showCollapsed} />
            <SidebarItem href="/pos/history" icon={<History />}      label={t('sidebar.pos.history')} isCollapsed={showCollapsed} />
            {isAdmin && (
              <SidebarItem href="/pos/revenue" icon={<DollarSign />} label={t('sidebar.pos.revenue')} isCollapsed={showCollapsed} />
            )}
          </SidebarSection>

          {/* ═══ WAREHOUSE — all roles ═══ */}
          <SidebarSection sectionKey="warehouse" title={t('sidebar.warehouse')} isCollapsed={showCollapsed} activePaths={['/warehouse']}>
            <SidebarItem href="/warehouse/stock"     icon={<Package />}       label={t('sidebar.warehouse.stock')}     isCollapsed={showCollapsed} />
            <SidebarItem href="/warehouse/movements" icon={<ArrowDownUp />}   label={t('sidebar.warehouse.movements')} isCollapsed={showCollapsed} />
            <SidebarItem href="/warehouse/inventory" icon={<ClipboardList />} label={t('sidebar.warehouse.inventory')} isCollapsed={showCollapsed} />
            <SidebarItem href="/warehouse/reports"   icon={<BarChart3 />}     label={t('sidebar.warehouse.reports')}   isCollapsed={showCollapsed} />
          </SidebarSection>

          {/* ═══ MASTER DATA — admin only ═══ */}
          {isAdmin && (
            <SidebarSection sectionKey="masterdata" title={t('sidebar.masterData')} isCollapsed={showCollapsed} activePaths={['/products', '/outlets']}>
              <SidebarItem href="/products" icon={<Tag />}   label={t('sidebar.masterData.products')} isCollapsed={showCollapsed} />
              <SidebarItem href="/outlets"  icon={<Store />} label={t('sidebar.masterData.outlets')}  isCollapsed={showCollapsed} />
            </SidebarSection>
          )}

          {/* ═══ OPERATIONS — all roles ═══ */}
          <SidebarSection sectionKey="operations" title={t('sidebar.operations')} isCollapsed={showCollapsed} activePaths={['/transactions', '/payments', '/expenses', '/promotions', '/eod', '/alerts']}>
            <SidebarItem href="/transactions" icon={<ArrowLeftRight />} label={t('sidebar.operations.transactions')} isCollapsed={showCollapsed} />
            <SidebarItem href="/payments"     icon={<CreditCard />}     label={t('sidebar.operations.payments')}     isCollapsed={showCollapsed} />
            <SidebarItem href="/expenses"     icon={<Receipt />}        label={t('sidebar.operations.expenses')}     isCollapsed={showCollapsed} />
            <SidebarItem href="/promotions"   icon={<Ticket />}         label={t('sidebar.operations.promotions')}   isCollapsed={showCollapsed} />
            <SidebarItem href="/eod"          icon={<Briefcase />}      label={t('sidebar.operations.eod')}          isCollapsed={showCollapsed} />
            <SidebarItem href="/alerts"       icon={<Bell />}           label={t('sidebar.operations.alerts')}       isCollapsed={showCollapsed} badge={alertCount > 0 ? String(alertCount) : undefined} />
          </SidebarSection>

        </nav>

        {/* ── Settings & Support (X-style collapsible) ── */}
        {!showCollapsed && (
          <div className="border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
            <button onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-[15px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span>{t('sidebar.settingsHelp')}</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-2 pb-2">
                {isAdmin && (
                  <>
                    {/* Pengaturan sub-group */}
                    <button onClick={() => setSubPengaturan(!subPengaturan)}
                      className="w-full flex items-center justify-between px-3 py-2 group">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">{t('sidebar.settings')}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${subPengaturan ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${subPengaturan ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="space-y-0.5 pb-1">
                        <SidebarItem href="/settings/payments"      icon={<DollarSign />} label={t('sidebar.settings.payment')}      isCollapsed={false} />
                        <SidebarItem href="/settings/users"         icon={<Users />}      label={t('sidebar.settings.users')}         isCollapsed={false} />
                        <SidebarItem href="/settings/audit-logs"    icon={<Shield />}     label={t('sidebar.settings.auditLogs')}    isCollapsed={false} />
                        <SidebarItem href="/settings/reset"         icon={<Trash2 />}     label={t('sidebar.settings.reset')}         isCollapsed={false} />
                        <SidebarItem href="/settings/subscriptions" icon={<Star />}       label={t('sidebar.settings.subscriptions')} isCollapsed={false} />
                      </div>
                    </div>
                  </>
                )}

                {/* Bantuan sub-group */}
                <button onClick={() => setSubBantuan(!subBantuan)}
                  className="w-full flex items-center justify-between px-3 py-2 group">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">{t('sidebar.helpSection')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${subBantuan ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${subBantuan ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-0.5 pb-1">
                    <SidebarItem href="/profile" icon={<User />}       label={t('sidebar.profile')} isCollapsed={false} />
                    <SidebarItem href="/help"    icon={<HelpCircle />} label={t('sidebar.help')}    isCollapsed={false} />
                    <SidebarItem href="/about"   icon={<Info />}       label={t('sidebar.about')}   isCollapsed={false} />
                    {canInstall && !isInstalled && (
                      <button onClick={install}
                        className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                        <Download className="w-5 h-5 opacity-80" />
                        <span>{t('sidebar.installApp')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed: settings + support icons */}
        {showCollapsed && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-2 flex-shrink-0 space-y-1">
            {isAdmin && (
              <>
                <SidebarItem href="/products"          icon={<Tag />}          label={t('sidebar.masterData.products')} isCollapsed={true} />
                <SidebarItem href="/outlets"           icon={<Store />}        label={t('sidebar.masterData.outlets')}  isCollapsed={true} />
              </>
            )}
            <SidebarItem href="/transactions"      icon={<ArrowLeftRight />} label={t('sidebar.operations.transactions')} isCollapsed={true} />
            <SidebarItem href="/expenses"          icon={<Receipt />}       label={t('sidebar.operations.expenses')} isCollapsed={true} />
            <SidebarItem href="/alerts"            icon={<Bell />}          label={t('sidebar.operations.alerts')} isCollapsed={true} badge={alertCount > 0 ? String(alertCount) : undefined} />
            <SidebarItem href="/profile"           icon={<User />}         label={t('sidebar.profile')}             isCollapsed={true} />
            <SidebarItem href="/help"              icon={<HelpCircle />}   label={t('sidebar.help')}                isCollapsed={true} />
            {isAdmin && (
              <SidebarItem href="/settings/payments" icon={<Settings />}   label={t('sidebar.settings.payment')}  isCollapsed={true} />
            )}
            {canInstall && !isInstalled && (
              <button onClick={install} title={t('sidebar.installApp')}
                className="w-full flex justify-center p-3 rounded-xl text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                <Download className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        )}

        {/* ── Bottom bar: dark mode + lang (X-style) ── */}
        <div className={`border-t border-gray-200 dark:border-gray-800 flex-shrink-0 ${showCollapsed ? 'p-2 flex flex-col items-center gap-1.5' : 'px-4 py-3 flex items-center justify-end gap-2'}`}>
          <button onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            title={language === 'id' ? 'Switch to English' : 'Ganti ke Indonesia'}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold">
            {language === 'id' ? 'ID' : 'EN'}
          </button>
          {showCollapsed && (
            <button onClick={() => setShowLogoutModal(true)} title={t('sidebar.logout')}
              className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 border border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500">
              <LogOut className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{t('sidebar.logoutModal.title')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('sidebar.logoutModal.description')}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('sidebar.logoutModal.cancel')}
              </button>
              <button onClick={confirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors shadow-sm">
                {t('sidebar.logoutModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
