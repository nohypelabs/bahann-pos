'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { MotionConfig, motion } from 'framer-motion'
import { BarChart3, CheckCircle2, Eye, EyeOff, ScanBarcode, Wrench } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Phones get a plain white page (lg:hidden parts); from lg up the form sits on a glass card over a
// Laku teal backdrop, next to a dark panel about the product.
const fieldClass = `w-full rounded-full border px-5 py-3 text-sm outline-none transition
  border-[#E4E6E7] bg-white text-[#17201D] placeholder:text-[#9AA19B]
  focus:border-[#0F5F56] focus:ring-4 focus:ring-[#0F5F56]/10
  lg:border-white/15 lg:bg-black/25 lg:text-white lg:placeholder:text-white/45
  lg:focus:border-[#F2B55A]/70 lg:focus:ring-[#F2B55A]/15`

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

  const features = [
    { icon: <Wrench />, title: t('login.hero.f1'), body: t('login.hero.f1Body') },
    { icon: <ScanBarcode />, title: t('login.hero.f2'), body: t('login.hero.f2Body') },
    { icon: <BarChart3 />, title: t('login.hero.f3'), body: t('login.hero.f3Body') },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-10 lg:bg-[#062925] lg:p-8">
        {/* Phone: a faint grid behind the heading */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(#EEF0F0_1px,transparent_1px),linear-gradient(90deg,#EEF0F0_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden" />

        {/* Desktop: soft light in brand colours behind the glass */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[#1E9E8A] opacity-50 blur-[120px]" />
          <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-[#E9A23B] opacity-35 blur-[130px]" />
          <div className="absolute bottom-[-220px] left-1/3 h-[520px] w-[620px] rounded-full bg-[#0F5F56] opacity-70 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-md lg:grid lg:max-w-6xl lg:grid-cols-2 lg:gap-8 lg:rounded-[28px] lg:border lg:border-white/15 lg:bg-white/[0.07] lg:p-8 lg:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] lg:backdrop-blur-2xl xl:p-10"
        >
          {/* Form */}
          <div className="flex flex-col justify-center lg:px-8 lg:py-6">
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <img src="/logo.svg" alt="Laku POS" className="mb-6 h-12 w-12 rounded-[40px] lg:mb-10 lg:h-11 lg:w-11" />
              <h1 className="text-[26px] font-bold tracking-tight text-[#17201D] lg:text-4xl lg:text-white">{t('login.welcome')}</h1>
              <p className="mt-1.5 text-sm text-[#5F675F] lg:text-base lg:text-white/70">{t('login.subtitle')}</p>
            </div>

            {/* Phone: switch between logging in and signing up */}
            <div className="mb-6 grid grid-cols-2 rounded-full bg-[#F3F4F4] p-1 lg:hidden" role="tablist">
              <span role="tab" aria-selected className="rounded-full bg-[#0F5F56] py-2.5 text-center text-sm font-semibold text-white shadow-sm">{t('login.tabLogin')}</span>
              <Link href="/register" role="tab" aria-selected={false} className="rounded-full py-2.5 text-center text-sm font-semibold text-[#5F675F] hover:text-[#17201D]">{t('login.tabRegister')}</Link>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 lg:max-w-md">
              {showRegisteredMessage && (
                <p className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('register.success')} {t('login.checkEmail')}</span>
                </p>
              )}
              {showVerifiedMessage && (
                <p className="rounded-2xl border border-[#BFE3DA] bg-[#E3F1EE] p-3 text-sm font-medium text-[#0F5F56]">{t('login.verified')}</p>
              )}
              {error && (
                <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-[#2F3A35] lg:text-white/80">{t('login.email')}</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  className={fieldClass}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-[#2F3A35] lg:text-white/80">{t('login.password')}</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className={`${fieldClass} pr-12`}
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-[#0F5F56] py-3.5 text-sm font-semibold text-white transition hover:bg-[#0C4D46] disabled:cursor-not-allowed disabled:opacity-60 lg:bg-gradient-to-r lg:from-[#F6C979] lg:to-[#E9A23B] lg:text-[#17201D] lg:shadow-[0_10px_30px_-10px_rgba(233,162,59,0.7)] lg:hover:brightness-105"
              >
                {isLoading ? t('common.loading') : t('login.button')}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5F675F] lg:max-w-md lg:text-white/70">
              {t('login.noAccount')}{' '}
              <Link href="/register" className="font-semibold text-[#0F5F56] hover:underline lg:text-[#F6C979]">{t('login.register')}</Link>
            </p>
          </div>

          {/* Product panel, desktop only */}
          <div className="relative hidden min-h-[600px] flex-col overflow-hidden rounded-[22px] bg-[#04201D]/85 p-10 text-white lg:flex">
            <div aria-hidden className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#1E9E8A] opacity-40 blur-[90px]" />
            <svg aria-hidden viewBox="0 0 200 200" className="absolute -right-6 bottom-24 h-64 w-64 text-[#5FB3A6]/50">
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * Math.PI) / 6
                return <line key={i} x1="100" y1="100" x2={100 + Math.cos(a) * 95} y2={100 + Math.sin(a) * 95} stroke="currentColor" strokeWidth="1.2" />
              })}
              <circle cx="100" cy="100" r="4" fill="currentColor" />
            </svg>

            <h2 className="relative max-w-sm text-[34px] font-bold leading-tight tracking-tight">{t('login.hero.title')}</h2>
            <p className="relative mt-3 max-w-sm text-sm text-white/65">{t('login.hero.body')}</p>

            <ul className="relative mt-8 space-y-5">
              {features.map((f) => (
                <li key={f.title} className="flex gap-3.5">
                  <span className="mt-0.5 shrink-0 text-[#F6C979] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.75]">{f.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-sm text-white/60">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* A small preview of the dashboard, as the picture for this panel */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
              className="relative mt-auto ml-auto w-72 rounded-[18px] border border-white/40 bg-white/90 p-5 text-[#17201D] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#5F675F]">{t('login.hero.revenueToday')}</p>
                <span className="text-[11px] text-[#8A9188]">{t('login.hero.sample')}</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">Rp 1.250.000</p>
              <p className="mt-1 text-xs text-[#5F675F]">
                <span className="mr-1 font-semibold text-[#0F5F56]">+12%</span>
                {t('login.hero.vsYesterday')}
              </p>
              <div className="mt-4 flex h-14 items-end gap-1.5">
                {[38, 52, 30, 64, 48, 80, 100].map((h, i) => (
                  <motion.span key={i} className={`flex-1 rounded-[4px] ${i === 6 ? 'bg-[#0F5F56]' : 'bg-[#BFE3DA]'}`}
                    initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5, delay: 0.4 + i * 0.04, ease: 'easeOut' }} />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-[#9AA19B] lg:text-white/40">
          &copy; {new Date().getFullYear()} Laku POS
        </p>
      </div>
    </MotionConfig>
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
