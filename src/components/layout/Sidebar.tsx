'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { logger } from '@/lib/logger'
import { usePWA } from '@/lib/pwa/PWAContext'
import { hasPermission, hasAnyPermission, PERMISSIONS, LEGACY_ROLE_MAP, getRoleDisplayName } from '@/lib/rbac/permissions'
import { trpc } from '@/lib/trpc/client'
import { useOpsBadges } from './useOpsBadges'
import { Inbox,
  LayoutDashboard, Package, ClipboardList, BarChart3,
  ShoppingCart, History, DollarSign, ArrowLeftRight,
  CreditCard, Ticket, Briefcase, Bell,
  Tag, Store, Users, Shield, Trash2, Star,
  User, HelpCircle, Info,
  LogOut, Download,
  Settings, ChevronDown, Crown,
  Receipt, ArrowDownUp, CheckCircle, Wrench, IdCard,
} from 'lucide-react'
import { SidebarToggleIcon } from './SidebarToggleIcon'

function SidebarItem({ href, icon, label, badge, isCollapsed }: {
  href: string; icon: ReactNode; label: string; badge?: string; isCollapsed: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  // On the icon rail the label lives in the tooltip and the accessible name; a count becomes a dot.
  const railLabel = badge ? `${label} (${badge})` : label

  return (
    <Link
      href={href}
      title={isCollapsed ? railLabel : undefined}
      aria-label={isCollapsed ? railLabel : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={`
        group relative flex items-center rounded-lg text-[14px] font-medium
        transition-colors duration-150
        ${isCollapsed ? 'mx-auto h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5 md:py-2'}
        ${isActive
          ? 'bg-[#0f5f56]/[0.09] text-[#0b4e48]'
          : 'text-[#5f675f] hover:bg-[#17201d]/[0.05] hover:text-[#17201d]'
        }
      `}
    >
      <span className={`flex-shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px] ${isActive ? 'text-[#0f5f56]' : 'opacity-80 group-hover:opacity-100'}`}>{icon}</span>
      {!isCollapsed && (
        <>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>
          {badge && (
            <span className="flex-shrink-0 rounded-full bg-[#17201d] px-2 py-0.5 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
        </>
      )}
      {isCollapsed && badge && (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-[#FFFFFF]" />
      )}
    </Link>
  )
}

function SidebarSection({ sectionKey, title, children, isCollapsed, activePaths = [], badge = 0 }: {
  sectionKey: string; title: string; children: ReactNode; isCollapsed: boolean; activePaths?: string[]
  /** Shown on the heading while the section is folded, so a count inside is not hidden. */
  badge?: number
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
        <div className="mx-auto my-1.5 h-px w-6 bg-[#E4E6E7]" />
        <div className="space-y-0.5">{children}</div>
      </div>
    )
  }

  return (
    <div className="mb-1">
      <button onClick={toggle} className="w-full flex items-center justify-between px-3 py-1.5 group hover:bg-[#17201d]/[0.04] rounded-md transition-colors">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a9188] transition-colors group-hover:text-[#5f675f]">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {!isOpen && badge > 0 && (
            <span className="rounded-full bg-[#17201d] px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-[#a9afa6] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
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
  /** Flips the desktop sidebar between expanded and the icon rail. */
  onToggleDesktop?: () => void
  /** Keyboard shortcut shown in the toggle's tooltip, e.g. 'Ctrl+B'. */
  shortcut?: string
}

export function Sidebar({ mobileOpen, setMobileOpen, desktopOpen = true, onToggleDesktop, shortcut = 'Ctrl+B' }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
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
  const { alertCount, pendingApprovalsCount, canUseInventory, canUseWorkshop } = useOpsBadges()

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

  const getRoleBadge = (roleKey: string) => {
    const displayName = getRoleDisplayName(roleKey)
    switch (roleKey) {
      case 'OWNER': return { label: displayName, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' }
      case 'ADMIN_TENANT': return { label: displayName, color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
      case 'AREA_MANAGER': return { label: displayName, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' }
      case 'STORE_MANAGER': return { label: displayName, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' }
      case 'CASHIER': return { label: displayName, color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' }
      case 'AUDITOR': return { label: displayName, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
      default: return { label: displayName, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
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

  const userRoleKey = LEGACY_ROLE_MAP[userRole] || userRole
  const roleBadge   = getRoleBadge(userRoleKey)
  const userInitial = userName.charAt(0).toUpperCase()
  const plan        = planData?.plan || 'free'
  const showCollapsed = isCollapsed && !isMobile
  const isSuperAdmin = userRoleKey === 'OWNER'

  // Superadmin is a platform role, not a selling role. Unless they are
  // impersonating a tenant, the sidebar shows only the platform surface —
  // tenant features are reached by impersonating a tenant, which is audited.
  // Read from the server session rather than localStorage so the answer cannot
  // drift from what the API would actually allow.
  const { data: impersonationState } = trpc.impersonation.current.useQuery(undefined, {
    staleTime: 15_000,
    retry: false,
  })
  const isImpersonating = impersonationState?.impersonating === true
  const isPlatformView = isSuperAdmin && !isImpersonating

  const canManageProducts = hasAnyPermission(userRole, [PERMISSIONS.PRODUCT_MANAGE, PERMISSIONS.PRODUCT_VIEW])
  const canManageSettings = hasAnyPermission(userRole, [PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.USER_MANAGE])
  const canViewReports = hasPermission(userRole, PERMISSIONS.REPORT_OUTLET_VIEW)
  const canViewAudit = hasPermission(userRole, PERMISSIONS.AUDIT_VIEW)
  const canManageUsers = hasPermission(userRole, PERMISSIONS.USER_MANAGE)

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
        w-72 ${isCollapsed ? 'md:w-[60px]' : 'md:w-64'}
        h-screen overflow-hidden bg-[#FFFFFF] border-r border-[#E4E6E7]
        flex-shrink-0 fixed md:relative z-50
        transition-[width,transform] duration-200 ease-out motion-reduce:transition-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* The column keeps the final width at once while the aside animates and clips it, so labels
            never wrap or squeeze mid-animation. Widths are 1px less than the aside's for its border. */}
        <div className={`flex h-full w-full flex-col ${isCollapsed ? 'md:w-[59px]' : 'md:w-[255px]'}`}>

          <div className={`group/header flex h-14 flex-shrink-0 items-center ${showCollapsed ? 'justify-center' : 'justify-between gap-2 pl-4 pr-2.5'}`}>
            {showCollapsed ? (
              // Icon rail: the logo shows at rest; hovering the header (or focusing the button) swaps it for the expand button.
              <div className="relative h-8 w-8">
                <img src="/logo.svg" alt="Laku POS"
                  className="h-8 w-8 p-1 transition-opacity duration-150 group-hover/header:opacity-0 group-focus-within/header:opacity-0" />
                <button type="button" onClick={onToggleDesktop}
                  aria-label={t('sidebar.expand')}
                  title={`${t('sidebar.expand')} (${shortcut})`}
                  aria-keyshortcuts="Control+B Meta+B"
                  className="absolute inset-0 flex items-center justify-center rounded-md text-[#5f675f] opacity-0 transition-[opacity,background-color,color] duration-150 hover:bg-[#17201d]/[0.06] hover:text-[#17201d] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5f56]/40 group-hover/header:opacity-100">
                  <SidebarToggleIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
            ) : (
              <>
                <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-md">
                  <img src="/logo.svg" alt="" className="h-7 w-7 flex-shrink-0" />
                  <span className="truncate whitespace-nowrap text-[15px] font-semibold text-[#17201d]">Laku POS</span>
                </Link>
                <button type="button" onClick={onToggleDesktop}
                  aria-label={t('sidebar.collapse')}
                  title={`${t('sidebar.collapse')} (${shortcut})`}
                  aria-keyshortcuts="Control+B Meta+B"
                  className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[#6f776f] transition-colors duration-150 hover:bg-[#17201d]/[0.06] hover:text-[#17201d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5f56]/40 md:inline-flex">
                  <SidebarToggleIcon className="h-[18px] w-[18px]" />
                </button>
                <button type="button" onClick={() => setMobileOpen(false)}
                  className="md:hidden rounded-md p-2 text-[#6f776f] transition-colors hover:bg-[#17201d]/[0.06] hover:text-[#17201d]"
                  aria-label={t('sidebar.closeMenu')}>
                  <SidebarToggleIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {!showCollapsed && (
            <div className="mx-3 mt-1 rounded-lg border border-[#E4E6E7]/80 bg-white/80 p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <Link href="/profile" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0f5f56] text-lg font-bold text-white transition-opacity hover:opacity-90">
                  {userInitial}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href="/profile" className="block group">
                    <p className="truncate text-[15px] font-semibold leading-tight text-[#17201d] group-hover:underline">{userName}</p>
                    <p className="truncate text-[13px] text-[#6f776f]">{userEmail}</p>
                  </Link>
                </div>
                <button onClick={() => setShowLogoutModal(true)} title={t('sidebar.logout')}
                  className="rounded-2xl p-2 text-[#8a9188] transition-colors hover:bg-red-50 hover:text-red-600">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${roleBadge.color}`}>
                  {isPlatformView ? t('sidebar.superAdmin') : roleBadge.label}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>
                  {PLAN_LABEL[plan] || 'Gratis'}
                </span>
              </div>
            </div>
          )}

          {showCollapsed && (
            <div className="flex flex-col items-center py-2">
              <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f5f56] text-sm font-bold text-white transition-opacity hover:opacity-90" title={userName} aria-label={userName}>
                {userInitial}
              </Link>
            </div>
          )}

          <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 ${showCollapsed ? 'px-2 [scrollbar-width:none]' : 'px-3'}`} role="navigation" aria-label="Menu navigasi">

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
                      <SidebarItem href="/admin/leads" icon={<Inbox />} label="Pesan Masuk" isCollapsed={false} />
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
                    <SidebarItem href="/admin/leads" icon={<Inbox />} label="Pesan Masuk" isCollapsed={true} />
                    <SidebarItem href="/admin/settings" icon={<Settings />} label={t('sidebar.adminSettings')} isCollapsed={true} />
                    <div className="h-px bg-purple-300 dark:bg-purple-700 mx-3 mt-1" />
                  </div>
                )}
              </>
            )}

            {/* ═══ TENANT SURFACES — a platform superadmin sees only the platform
                panel; tenant features are reached by impersonating a tenant. ═══ */}
            {!isPlatformView && (<>
            {/* ═══ SHARED: Dashboard ═══ */}
            <div className={`${showCollapsed ? 'mb-1' : 'mb-2'}`}>
              <SidebarItem href="/dashboard" icon={<LayoutDashboard />} label={t('sidebar.dashboard')} isCollapsed={showCollapsed} />
            </div>

            {/* ═══ POS ═══ */}
            <SidebarSection sectionKey="pos" title={t('sidebar.pos')} isCollapsed={showCollapsed} activePaths={['/pos']}>
              <SidebarItem href="/pos/sales"   icon={<ShoppingCart />} label={t('sidebar.pos.sales')}   isCollapsed={showCollapsed} />
              {canUseWorkshop && (
                <>
                  <SidebarItem href="/pos/notes" icon={<Wrench />} label={t('sidebar.pos.notes')} isCollapsed={showCollapsed} />
                  <SidebarItem href="/members"   icon={<IdCard />} label={t('sidebar.pos.members')} isCollapsed={showCollapsed} />
                </>
              )}
              <SidebarItem href="/pos/history" icon={<History />}      label={t('sidebar.pos.history')} isCollapsed={showCollapsed} />
              {canViewReports && (
                <SidebarItem href="/pos/revenue" icon={<DollarSign />} label={t('sidebar.pos.revenue')} isCollapsed={showCollapsed} />
              )}
            </SidebarSection>

            {/* ═══ WAREHOUSE — only when the business type enables inventory ═══ */}
            {canUseInventory && (
              <SidebarSection sectionKey="warehouse" title={t('sidebar.warehouse')} isCollapsed={showCollapsed} activePaths={['/warehouse']}>
                <SidebarItem href="/warehouse/stock"     icon={<Package />}       label={t('sidebar.warehouse.stock')}     isCollapsed={showCollapsed} />
                <SidebarItem href="/warehouse/movements" icon={<ArrowDownUp />}   label={t('sidebar.warehouse.movements')} isCollapsed={showCollapsed} />
                <SidebarItem href="/warehouse/inventory" icon={<ClipboardList />} label={t('sidebar.warehouse.inventory')} isCollapsed={showCollapsed} />
                <SidebarItem href="/warehouse/reports"   icon={<BarChart3 />}     label={t('sidebar.warehouse.reports')}   isCollapsed={showCollapsed} />
              </SidebarSection>
            )}

            {/* ═══ MASTER DATA — product.manage or product.view ═══ */}
            {canManageProducts && (
              <SidebarSection sectionKey="masterdata" title={t('sidebar.masterData')} isCollapsed={showCollapsed} activePaths={['/products', '/outlets']}>
                <SidebarItem href="/products" icon={<Tag />}   label={t('sidebar.masterData.products')} isCollapsed={showCollapsed} />
                <SidebarItem href="/outlets"  icon={<Store />} label={t('sidebar.masterData.outlets')}  isCollapsed={showCollapsed} />
              </SidebarSection>
            )}

            {/* ═══ OPERATIONS — all roles ═══ */}
            <SidebarSection sectionKey="operations" title={t('sidebar.operations')} isCollapsed={showCollapsed} activePaths={['/transactions', '/payments', '/expenses', '/promotions', '/eod', '/alerts', '/approvals']} badge={alertCount + pendingApprovalsCount}>
              <SidebarItem href="/transactions" icon={<ArrowLeftRight />} label={t('sidebar.operations.transactions')} isCollapsed={showCollapsed} />
              <SidebarItem href="/payments"     icon={<CreditCard />}     label={t('sidebar.operations.payments')}     isCollapsed={showCollapsed} />
              <SidebarItem href="/expenses"     icon={<Receipt />}        label={t('sidebar.operations.expenses')}     isCollapsed={showCollapsed} />
              <SidebarItem href="/promotions"   icon={<Ticket />}         label={t('sidebar.operations.promotions')}   isCollapsed={showCollapsed} />
              <SidebarItem href="/eod"          icon={<Briefcase />}      label={t('sidebar.operations.eod')}          isCollapsed={showCollapsed} />
              <SidebarItem href="/alerts"       icon={<Bell />}           label={t('sidebar.operations.alerts')}       isCollapsed={showCollapsed} badge={alertCount > 0 ? String(alertCount) : undefined} />
              <SidebarItem href="/approvals"    icon={<CheckCircle />}    label={t('sidebar.operations.approvals')}      isCollapsed={showCollapsed} badge={pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined} />
            </SidebarSection>
            </>)}

          </nav>

          {/* ── Settings & Support (X-style collapsible) ── */}
          {!showCollapsed && (
            <div className="border-t border-[#E4E6E7] flex-shrink-0">
              <button onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between whitespace-nowrap px-4 py-3 text-[14px] font-medium text-[#2f3a35] hover:bg-[#17201d]/[0.04] transition-colors">
                <span>{t('sidebar.settingsHelp')}</span>
                <ChevronDown className={`w-5 h-5 text-[#8a9188] transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${settingsOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-2 pb-2">
                  {canManageSettings && !isPlatformView && (
                    <>
                      {/* Pengaturan sub-group */}
                      <button onClick={() => setSubPengaturan(!subPengaturan)}
                        className="w-full flex items-center justify-between px-3 py-2 group hover:bg-white/50 rounded-xl transition-colors">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a9188] group-hover:text-[#5f675f] transition-colors">{t('sidebar.settings')}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-[#a9afa6] transition-transform duration-200 ${subPengaturan ? 'rotate-180' : ''}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${subPengaturan ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="space-y-0.5 pb-1">
                          {canManageSettings && (
                            <>
                              <SidebarItem href="/settings/business"      icon={<Store />}      label={t('settings.business.title')}       isCollapsed={false} />
                              <SidebarItem href="/settings/payments"      icon={<DollarSign />} label={t('sidebar.settings.payment')}      isCollapsed={false} />
                              {canUseWorkshop && (
                                <SidebarItem href="/settings/workshop"    icon={<Wrench />}     label={t('sidebar.settings.workshop')}     isCollapsed={false} />
                              )}
                            </>
                          )}
                          {canManageUsers && (
                            <SidebarItem href="/settings/users"         icon={<Users />}      label={t('sidebar.settings.users')}         isCollapsed={false} />
                          )}
                          {canViewAudit && (
                            <SidebarItem href="/settings/audit-logs"    icon={<Shield />}     label={t('sidebar.settings.auditLogs')}    isCollapsed={false} />
                          )}
                          {canManageSettings && (
                            <>
                              <SidebarItem href="/settings/reset"         icon={<Trash2 />}     label={t('sidebar.settings.reset')}         isCollapsed={false} />
                              <SidebarItem href="/settings/subscriptions" icon={<Star />}       label={t('sidebar.settings.subscriptions')} isCollapsed={false} />
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Bantuan sub-group */}
                  <button onClick={() => setSubBantuan(!subBantuan)}
                    className="w-full flex items-center justify-between px-3 py-2 group hover:bg-white/50 rounded-xl transition-colors">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a9188] group-hover:text-[#5f675f] transition-colors">{t('sidebar.helpSection')}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#a9afa6] transition-transform duration-200 ${subBantuan ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${subBantuan ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-0.5 pb-1">
                      <SidebarItem href="/profile" icon={<User />}       label={t('sidebar.profile')} isCollapsed={false} />
                      <SidebarItem href="/help"    icon={<HelpCircle />} label={t('sidebar.help')}    isCollapsed={false} />
                      <SidebarItem href="/about"   icon={<Info />}       label={t('sidebar.about')}   isCollapsed={false} />
                      {canInstall && !isInstalled && (
                        <button onClick={install}
                          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[15px] font-medium text-[#0f5f56] dark:text-green-400 hover:bg-[#e5f3ef] dark:hover:bg-green-900/30 transition-colors">
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
            <div className="border-t border-[#E4E6E7] p-2 flex-shrink-0 space-y-1">
              {!isPlatformView && (<>
              {canManageProducts && (
                <>
                  <SidebarItem href="/products"          icon={<Tag />}          label={t('sidebar.masterData.products')} isCollapsed={true} />
                  <SidebarItem href="/outlets"           icon={<Store />}        label={t('sidebar.masterData.outlets')}  isCollapsed={true} />
                </>
              )}
              <SidebarItem href="/transactions"      icon={<ArrowLeftRight />} label={t('sidebar.operations.transactions')} isCollapsed={true} />
              <SidebarItem href="/expenses"          icon={<Receipt />}       label={t('sidebar.operations.expenses')} isCollapsed={true} />
              <SidebarItem href="/alerts"            icon={<Bell />}          label={t('sidebar.operations.alerts')} isCollapsed={true} badge={alertCount > 0 ? String(alertCount) : undefined} />
              <SidebarItem href="/approvals"         icon={<CheckCircle />}   label={t('sidebar.operations.approvals')}     isCollapsed={true} badge={pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined} />
              {canManageSettings && (
                <>
                  <SidebarItem href="/settings/business" icon={<Store />}      label={t('settings.business.title')}   isCollapsed={true} />
                  <SidebarItem href="/settings/payments" icon={<Settings />}   label={t('sidebar.settings.payment')}  isCollapsed={true} />
                </>
              )}
              </>)}
              <SidebarItem href="/profile"           icon={<User />}         label={t('sidebar.profile')}             isCollapsed={true} />
              <SidebarItem href="/help"              icon={<HelpCircle />}   label={t('sidebar.help')}                isCollapsed={true} />
              {canInstall && !isInstalled && (
                <button onClick={install} title={t('sidebar.installApp')} aria-label={t('sidebar.installApp')}
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-[#0f5f56] hover:bg-[#0f5f56]/[0.09] transition-colors">
                  <Download className="w-[18px] h-[18px]" />
                </button>
              )}
              <button onClick={() => setShowLogoutModal(true)} title={t('sidebar.logout')} aria-label={t('sidebar.logout')}
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-[#6f776f] hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}
          {/* The language switch and its footer strip are hidden for now (owner's request);
              the language stays whatever LanguageContext has saved. */}
        </div>
      </aside>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-[18px] shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5 border border-[#E4E6E7] dark:border-gray-800">
            <div className="flex items-center justify-center text-red-500">
              <LogOut className="w-7 h-7" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#17201d] dark:text-gray-100">{t('sidebar.logoutModal.title')}</h3>
              <p className="text-sm text-[#6f776f] dark:text-gray-400">{t('sidebar.logoutModal.description')}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E4E6E7] dark:border-gray-700 text-sm font-semibold text-[#2f3a35] dark:text-gray-300 hover:bg-[#F4F5F5] dark:hover:bg-gray-800 transition-colors">
                {t('sidebar.logoutModal.cancel')}
              </button>
              <button onClick={confirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-[#B42318] hover:bg-[#981B12] text-sm font-semibold text-white transition-colors shadow-sm">
                {t('sidebar.logoutModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
