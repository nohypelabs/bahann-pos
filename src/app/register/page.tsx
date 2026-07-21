'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const BUSINESS_TYPES = [
  {
    type: 'RETAIL' as const,
    icon: '🏪',
    titleId: 'Toko & Retail',
    titleEn: 'Retail & Store',
    descId: 'Minimarket, toko kelontong, warung sembako',
    descEn: 'Minimarket, grocery store, general store',
    modules: ['inventory'],
    moduleLabelId: 'Manajemen Stok',
    moduleLabelEn: 'Inventory Management',
  },
  {
    type: 'FNB' as const,
    icon: '🍜',
    titleId: 'Kuliner & FnB',
    titleEn: 'Food & Beverage',
    descId: 'Warung makan, cafe, resto, nasi goreng, pecel lele',
    descEn: 'Restaurant, cafe, food stall, street food',
    modules: ['recipe'],
    moduleLabelId: 'Manajemen Resep',
    moduleLabelEn: 'Recipe Management',
  },
  {
    type: 'SERVICE' as const,
    icon: '✂️',
    titleId: 'Jasa & Layanan',
    titleEn: 'Service & Professional',
    descId: 'Barbershop, car wash, laundry, servis AC',
    descEn: 'Barbershop, car wash, laundry, repair service',
    modules: ['appointment'],
    moduleLabelId: 'Janji Temu',
    moduleLabelEn: 'Appointment',
  },
  {
    type: 'HYBRID' as const,
    icon: '🔄',
    titleId: 'Campuran (Hybrid)',
    titleEn: 'Hybrid (Mixed)',
    descId: 'Toko + jasa, retail + kuliner, atau kombinasi lainnya',
    descEn: 'Store + service, retail + food, or any combination',
    modules: ['inventory', 'recipe'],
    moduleLabelId: 'Stok + Resep',
    moduleLabelEn: 'Inventory + Recipe',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isId = language === 'id'
  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    storeName: '',
    whatsappNumber: '',
  })
  const [additionalOutlets, setAdditionalOutlets] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const registerMutation = trpc.auth.register.useMutation()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const updateAdditionalOutlet = (index: number, value: string) => {
    setAdditionalOutlets(current => current.map((outlet, outletIndex) => (
      outletIndex === index ? value : outlet
    )))
  }

  const addAdditionalOutlet = () => {
    setAdditionalOutlets(current => [...current, ''])
  }

  const removeAdditionalOutlet = (index: number) => {
    setAdditionalOutlets(current => current.filter((_, outletIndex) => outletIndex !== index))
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError(isId ? 'Password tidak cocok' : 'Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError(isId ? 'Password minimal 8 karakter' : 'Password must be at least 8 characters')
      return
    }

    if (!formData.whatsappNumber || formData.whatsappNumber.length < 9) {
      setError(isId ? 'Nomor WhatsApp wajib diisi (minimal 9 digit)' : 'WhatsApp number is required (min 9 digits)')
      return
    }

    setStep(2)
  }

  const handleRegister = async () => {
    setError('')

    if (!selectedType) {
      setError('Pilih jenis usaha terlebih dahulu')
      return
    }

    setIsLoading(true)

    try {
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        storeName: formData.storeName,
        initialOutletNames: additionalOutlets.map(outlet => outlet.trim()).filter(Boolean),
        whatsappNumber: formData.whatsappNumber,
        businessType: selectedType,
      })

      setSuccess(true)
      setTimeout(() => router.push('/login?registered=true'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isId ? 'Pendaftaran gagal. Coba lagi.' : 'Registration failed. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><img src="/logo.svg" alt="Laku POS" className="w-16 h-16 rounded-[40px] shadow-md" /></div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Laku POS</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isId ? 'Daftar sebagai pemilik warung' : 'Register as a store owner'}
          </p>
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-4">
            <span className={`w-8 h-1 rounded-[40px] ${step === 1 ? 'bg-blue-500' : 'bg-blue-500'}`} />
            <span className={`w-8 h-1 rounded-[40px] ${step === 2 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-[40px] p-6 sm:p-8">
          <div className="mb-4">
            <h2 className="text-mobile-base md:text-mobile-xl font-bold text-gray-900 dark:text-gray-100">
              {step === 1
                ? (isId ? 'Informasi Akun' : 'Account Information')
                : (isId ? 'Jenis Usaha' : 'Business Type')}
            </h2>
          </div>
          <div>
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  {isId ? 'Pendaftaran Berhasil!' : 'Registration Successful!'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isId ? 'Mengalihkan ke halaman login...' : 'Redirecting to login...'}
                </p>
              </div>
            ) : step === 1 ? (
              /* Step 1: Account Info */
              <form onSubmit={handleNextStep} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-[40px]">
                    <p className="text-sm font-semibold text-red-600">❌ {error}</p>
                  </div>
                )}

                <Input
                  type="text"
                  name="name"
                  label={isId ? 'Nama Lengkap' : 'Full Name'}
                  placeholder={isId ? 'Nama Lengkap' : 'Full Name'}
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <Input
                  type="text"
                  name="storeName"
                  label={isId ? 'Nama Toko / Warung' : 'Store / Shop Name'}
                  placeholder={isId ? 'cth: Warung Bu Sari' : 'e.g. My Store'}
                  value={formData.storeName}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {isId ? 'Outlet Tambahan' : 'Additional Outlets'}
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isId ? 'Opsional. Outlet pertama tetap pakai nama toko di atas.' : 'Optional. The first outlet still uses the store name above.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addAdditionalOutlet}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      + {isId ? 'Tambah outlet' : 'Add outlet'}
                    </button>
                  </div>

                  {additionalOutlets.map((outlet, index) => (
                    <div key={`${index}-${additionalOutlets.length}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={outlet}
                        onChange={e => updateAdditionalOutlet(index, e.target.value)}
                        placeholder={isId ? `Outlet ${index + 2}` : `Outlet ${index + 2}`}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-[40px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => removeAdditionalOutlet(index)}
                        className="shrink-0 px-3 py-2.5 rounded-[40px] border-2 border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors"
                        aria-label={isId ? 'Hapus outlet tambahan' : 'Remove additional outlet'}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isId ? 'Nomor WhatsApp' : 'WhatsApp Number'} *
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
                      className="w-full pl-14 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-[40px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      required
                    />
                  </div>
                </div>

                <Input
                  type="email"
                  name="email"
                  label={isId ? 'Email' : 'Email'}
                  placeholder={isId ? 'Email' : 'Email'}
                  value={formData.email}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isId ? 'Password' : 'Password'} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder={isId ? 'Minimal 8 karakter' : 'At least 8 characters'}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-[40px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isId ? 'Konfirmasi Password' : 'Confirm Password'} *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder={isId ? 'Konfirmasi password' : 'Confirm password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-[40px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="lg" fullWidth>
                    {isId ? 'Selanjutnya →' : 'Next →'}
                  </Button>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isId ? 'Sudah punya akun?' : 'Already have an account?'}{' '}
                    <a href="/login" className="font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                      {isId ? 'Masuk' : 'Login'}
                    </a>
                  </p>
                </div>
              </form>
            ) : (
              /* Step 2: Business Type Selection */
              <div className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-[40px]">
                    <p className="text-sm font-semibold text-red-600">❌ {error}</p>
                  </div>
                )}

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isId
                    ? 'Pilih jenis usaha Anda untuk mengkonfigurasi sistem secara otomatis'
                    : 'Select your business type to automatically configure the system'}
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {BUSINESS_TYPES.map((bt) => {
                    const isSelected = selectedType === bt.type
                    return (
                      <button
                        key={bt.type}
                        onClick={() => setSelectedType(bt.type)}
                        className={`relative text-left p-4 rounded-[40px] border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-[40px] bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{bt.icon}</span>
                          <div>
                            <h3 className={`text-sm font-bold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                              {isId ? bt.titleId : bt.titleEn}
                            </h3>
                            <p className={`text-xs ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {isId ? bt.descId : bt.descEn}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                    ← {isId ? 'Kembali' : 'Back'}
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleRegister}
                    disabled={!selectedType || isLoading}
                    className="flex-1"
                  >
                    {isLoading
                      ? (isId ? 'Mendaftar...' : 'Registering...')
                      : (isId ? '🚀 Daftar' : '🚀 Register')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!success && step === 1 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-[40px]">
            <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">
              ℹ️ {isId ? 'Informasi Pendaftaran' : 'Registration Info'}:
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• {isId ? 'Akun ini adalah akun pemilik warung (admin)' : 'This is a store owner (admin) account'}</li>
              <li>• {isId ? 'Outlet pertama dan outlet tambahan bisa dibuat saat daftar' : 'The first outlet and extra outlets can be created during registration'}</li>
              <li>• {isId ? 'Kasir bisa ditambahkan dari menu Pengaturan' : 'Cashiers can be added from Settings'}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
