'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

/**
 * Routes that only make sense inside a tenant. A platform superadmin reaches
 * these by impersonating a tenant, which is audited — otherwise they would land
 * on tenant pages showing their own tenant's data mixed into the platform view.
 */
const TENANT_ROUTE_PREFIXES = [
  '/dashboard',
  '/pos',
  '/warehouse',
  '/products',
  '/outlets',
  '/transactions',
  '/payments',
  '/expenses',
  '/promotions',
  '/eod',
  '/alerts',
  '/approvals',
  '/settings',
]

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Skip profile check on the setup page itself to avoid redirect loop
  const isSetupPage = pathname === '/setup'

  const { data: profile, isLoading: profileLoading } = trpc.businessProfile.getMyProfile.useQuery(
    undefined,
    { enabled: !isSetupPage },
  )

  // Server-authoritative: never inferred from localStorage.
  const { data: impersonationState } = trpc.impersonation.current.useQuery(undefined, {
    staleTime: 15_000,
    retry: false,
  })

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }

    // Redirect to setup if no business profile exists (and not already on setup page)
    if (!isSetupPage && !profileLoading && profile === null) {
      router.push('/setup')
      return
    }

    // A superadmin who is not impersonating belongs on the platform panel only.
    // Wait for the query to resolve before acting, so a slow response can never
    // bounce someone who is legitimately impersonating.
    if (impersonationState && !impersonationState.impersonating) {
      let role = ''
      try {
        role = JSON.parse(user).role ?? ''
      } catch {
        return
      }

      const isTenantRoute = TENANT_ROUTE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )

      if (role === 'super_admin' && isTenantRoute) {
        router.replace('/admin')
      }
    }
  }, [router, profile, profileLoading, isSetupPage, impersonationState, pathname])

  // Show loading while checking profile (except on setup page)
  if (!isSetupPage && profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <AppLayout>
      <ImpersonationBanner />
      <EmailVerificationBanner />
      {children}
    </AppLayout>
  )
}
