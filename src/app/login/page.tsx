'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Check if redirected from registration
    if (searchParams.get('registered') === 'true') {
      setShowRegisteredMessage(true)
      // Hide message after 5 seconds
      setTimeout(() => setShowRegisteredMessage(false), 5000)
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

      // ✅ SECURITY: Auth token is now stored in httpOnly cookie (set by server)
      // No localStorage for token = protection against XSS attacks

      // Store minimal user data in localStorage for UI display only
      // Do NOT store sensitive data or tokens
      localStorage.setItem('user', JSON.stringify({
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      }))

      // Full reload ensures React Query cache from any previous user session is cleared
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('login.error')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header — compact on mobile */}
        <div className="text-center mb-4 sm:mb-8">
          <div className="flex justify-center mb-2 sm:mb-3">
            <img src="/logo.svg" alt="Laku POS" className="w-10 h-10 sm:w-16 sm:h-16 rounded-2xl shadow-md" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Laku POS</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 hidden sm:block">Warehouse & Point of Sale System</p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" padding="lg">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle>{t('login.title')}</CardTitle>
          </CardHeader>

          <CardBody className="pt-0 sm:pt-2">
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-6">
              {showRegisteredMessage && (
                <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-sm font-semibold text-green-600">
                    ✅ {t('register.success')}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Input
                type="email"
                label={t('login.email')}
                placeholder={t('login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 sm:py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 text-sm sm:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Lupa password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? t('common.loading') : t('login.button')}
              </Button>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('login.noAccount')}{' '}
                <a href="/register" className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                  {t('login.register')}
                </a>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-gray-100"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
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
