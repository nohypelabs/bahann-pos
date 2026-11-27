'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AuthHeading, AuthShell, AuthTabs, authFieldClass, authLabelClass, authLinkClass, authPrimaryButtonClass } from '@/components/auth/AuthShell'

function LoginContent() {
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false)
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setShowRegisteredMessage(true)
      setTimeout(() => setShowRegisteredMessage(false), 5000)
    }

    if (searchParams.get('verified') === 'true') {
      setShowVerifiedMessage(true)
      setTimeout(() => setShowVerifiedMessage(false), 5000)
    }
  }, [searchParams])

  const loginMutation = trpc.auth.login.useMutation()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
      })

      // The auth token is in an httpOnly cookie set by the server. localStorage only keeps what the
      // UI displays; never tokens or other sensitive data.
      localStorage.setItem('user', JSON.stringify({
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      }))

      // Role-based landing page (UIUX-SPEC compliance)
      const roleRedirects: Record<string, string> = {
        super_admin: '/admin',
        admin: '/dashboard',
        manager: '/eod',        // Kepala Toko → shift management
        user: '/pos/sales',     // Kasir → langsung POS
      }
      const redirect = roleRedirects[result.user.role || 'user'] || '/dashboard'

      // Full reload ensures React Query cache from any previous user session is cleared
      window.location.href = redirect
    } catch (err: unknown) {
      // A wrong email or password comes back as UNAUTHORIZED; show it in the user's language.
      const code = (err as { data?: { code?: string } } | null)?.data?.code
      const errorMessage = code === 'UNAUTHORIZED' || !(err instanceof Error) ? t('login.error') : err.message
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell footer>
      <AuthHeading title={t('login.welcome')} subtitle={t('login.subtitle')} />
      <AuthTabs active="login" />

      <form onSubmit={handleLogin} className="space-y-4 lg:max-w-md">
        {showRegisteredMessage && (
          <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('register.success')} {t('login.checkEmail')}</span>
          </p>
        )}
        {showVerifiedMessage && (
          <p className="rounded-xl border border-[#BFE3DA] bg-[#E3F1EE] p-3 text-sm font-medium text-[#0F5F56]">{t('login.verified')}</p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="login-email" className={authLabelClass}>{t('login.email')}</label>
          <input
            id="login-email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            className={authFieldClass}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className={authLabelClass}>{t('login.password')}</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`${authFieldClass} pr-12`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9188] hover:text-[#17201D] lg:text-white/55 lg:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-[#0F5F56] underline-offset-2 hover:underline lg:text-white/80 lg:hover:text-white">
            {t('login.forgot')}
          </Link>
        </div>

        <button type="submit" disabled={isLoading} className={authPrimaryButtonClass}>
          {isLoading ? t('common.loading') : t('login.button')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#5F675F] lg:max-w-md lg:text-white/70">
        {t('login.noAccount')}{' '}
        <Link href="/register" className={authLinkClass}>{t('login.register')}</Link>
      </p>
    </AuthShell>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E4E6E7] border-t-[#0F5F56]" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  )
}
