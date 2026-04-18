'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
    storeName: '',
    whatsappNumber: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const registerMutation = trpc.auth.register.useMutation()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    if (formData.password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }

    if (!formData.whatsappNumber || formData.whatsappNumber.length < 9) {
      setError('Nomor WhatsApp wajib diisi (minimal 9 digit)')
      return
    }

    setIsLoading(true)

    try {
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        storeName: formData.storeName,
        whatsappNumber: formData.whatsappNumber,
      })

      setSuccess(true)
      setTimeout(() => router.push('/login?registered=true'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><img src="/logo.svg" alt="Laku POS" className="w-16 h-16 rounded-2xl shadow-md" /></div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Laku POS</h1>
          <p className="text-gray-600 dark:text-gray-400">Daftar sebagai pemilik warung</p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>{t('register.title')}</CardTitle>
          </CardHeader>

          <CardBody>
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">{t('register.success')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('register.success')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
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
                  type="text"
                  name="storeName"
                  label="Nama Toko / Warung"
                  placeholder="cth: Warung Bu Sari, Toko Makmur"
                  value={formData.storeName}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nomor WhatsApp *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-sm select-none">
                      +62
                    </span>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      placeholder="8123456789"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      className="w-full pl-14 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Digunakan untuk aktivasi akun dan notifikasi
                  </p>
                </div>

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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Gunakan kombinasi huruf, angka, dan simbol
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={isLoading}>
                    {isLoading ? t('common.loading') : t('register.button')}
                  </Button>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('register.hasAccount')}{' '}
                    <a href="/login" className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                      {t('register.login')}
                    </a>
                  </p>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">ℹ️ Informasi Pendaftaran:</p>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Akun ini adalah akun pemilik warung (admin)</li>
            <li>• Outlet pertama dibuat otomatis setelah daftar</li>
            <li>• Kasir bisa ditambahkan dari menu Pengaturan</li>
            <li>• Nomor WhatsApp wajib untuk aktivasi akun</li>
            <li>• Akun aktif dalam 1×24 jam setelah verifikasi</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
