'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  return (
    <AppLayout>
      <EmailVerificationBanner />
      {children}
    </AppLayout>
  )
}
