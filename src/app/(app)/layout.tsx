'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

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

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }

    // Redirect to setup if no business profile exists (and not already on setup page)
    if (!isSetupPage && !profileLoading && profile === null) {
      router.push('/setup')
    }
  }, [router, profile, profileLoading, isSetupPage])

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
      <EmailVerificationBanner />
      {children}
    </AppLayout>
  )
}
