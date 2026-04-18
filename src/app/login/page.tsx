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

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('login.error')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AGDS Corp POS</h1>
          <p className="text-gray-600">Warehouse & Point of Sale System</p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>{t('login.title')}</CardTitle>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleLogin} className="space-y-6">
              {showRegisteredMessage && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-sm font-semibold text-green-600">
                    ✅ {t('register.success')}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
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

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                {t('login.noAccount')}{' '}
                <a href="/register" className="font-semibold text-gray-900 hover:underline">
                  {t('login.register')}
                </a>
              </p>
              <p className="text-xs text-gray-500">
                <a href="/test/users" className="text-blue-600 hover:underline">
                  🔍 View Registered Users (Test)
                </a>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Session valid for 7 days
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
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
