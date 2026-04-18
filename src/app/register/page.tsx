'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    outletId: '',
    role: 'user', // Default role, will be set by admin later
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const registerMutation = trpc.auth.register.useMutation()
  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const result = await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        outletId: formData.outletId || undefined,
        role: formData.role,
      })

      setSuccess(true)

      // Show success message then redirect
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 2000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.'
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
          <p className="text-gray-600">{t('register.subtitle')}</p>
        </div>

        {/* Register Card */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>{t('register.title')}</CardTitle>
          </CardHeader>

          <CardBody>
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  {t('register.success')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('register.success')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('common.loading')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-sm font-semibold text-red-600">❌ {error}</p>
                  </div>
                )}

                <Input
                  type="text"
                  name="name"
                  label={t('register.name')}
                  placeholder={t('register.name')}
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <Input
                  type="email"
                  name="email"
                  label={t('register.email')}
                  placeholder={t('register.email')}
                  value={formData.email}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t('register.password')} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Minimal 8 karakter"
                      value={formData.password}
                      onChange={handleChange}
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
                  <p className="text-xs text-gray-500">
                    Gunakan kombinasi huruf, angka, dan simbol
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t('register.confirmPassword')} *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Konfirmasi password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <Select
                  name="outletId"
                  label="Outlet (Opsional)"
                  value={formData.outletId}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Pilih outlet (opsional)' },
                    ...(outletsResponse?.outlets?.map(outlet => ({
                      value: outlet.id,
                      label: outlet.name,
                    })) || []),
                  ]}
                  fullWidth
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isLoading}
                  >
                    {isLoading ? t('common.loading') : t('register.button')}
                  </Button>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-sm text-gray-600">
                    {t('register.hasAccount')}{' '}
                    <a href="/login" className="font-semibold text-gray-900 hover:underline">
                      {t('register.login')}
                    </a>
                  </p>
                </div>

                <div className="pt-4 text-center">
                  <a
                    href="/test/users"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    🔍 View Registered Users (Test)
                  </a>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900 font-semibold mb-2">ℹ️ Informasi Pendaftaran:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Password minimal 8 karakter</li>
            <li>• Email harus unik (belum terdaftar)</li>
            <li>• Outlet bersifat opsional</li>
            <li>• Role default adalah "User" (bisa diubah admin nanti)</li>
            <li>• Setelah daftar, hubungi admin untuk aktivasi akun</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
