'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { BUSINESS_TYPE_OPTIONS } from '@/lib/business/business-type-options'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { friendlyError } from '@/lib/errors/friendlyError'
import { Check, CheckCircle2, Eye, EyeOff, Plus, X, XCircle } from 'lucide-react'
import { AuthHeading, AuthShell, AuthTabs, authFieldClass, authLabelClass, authLinkClass, authPrimaryButtonClass, authSecondaryButtonClass } from '@/components/auth/AuthShell'

export default function RegisterPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
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
      setError(friendlyError(err, (isId ? 'Pendaftaran gagal. Coba lagi.' : 'Registration failed. Please try again.')))
    } finally {
      setIsLoading(false)
    }
  }

  const errorBox = error && (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
    </p>
  )

  const passwordField = (name: 'password' | 'confirmPassword', label: string, placeholder: string, shown: boolean, toggle: () => void) => (
    <div className="space-y-1.5">
      <label htmlFor={`register-${name}`} className={authLabelClass}>{label}</label>
      <div className="relative">
        <input
          id={`register-${name}`}
          type={shown ? 'text' : 'password'}
          name={name}
          placeholder={placeholder}
          value={formData[name]}
          onChange={handleChange}
          autoComplete="new-password"
          className={`${authFieldClass} pr-12`}
          required
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? (isId ? 'Sembunyikan password' : 'Hide password') : (isId ? 'Tampilkan password' : 'Show password')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A9188] hover:text-[#17201D] lg:text-white/55 lg:hover:text-white"
        >
          {shown ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )

  return (
    <AuthShell>
      <AuthHeading
        title={isId ? 'Buat akun baru' : 'Create an account'}
        subtitle={step === 1
          ? (isId ? 'Langkah 1 dari 2 · data akun dan toko' : 'Step 1 of 2 · account and shop')
          : (isId ? 'Langkah 2 dari 2 · jenis usaha' : 'Step 2 of 2 · business type')}
      />
      <AuthTabs active="register" />

      {/* Two-step progress */}
      <div className="mb-6 grid grid-cols-2 gap-2 lg:max-w-md" aria-hidden>
        <span className="h-1 rounded-full bg-[#0F5F56] lg:bg-[#F6C979]" />
        <span className={`h-1 rounded-full ${step === 2 ? 'bg-[#0F5F56] lg:bg-[#F6C979]' : 'bg-[#E4E6E7] lg:bg-white/15'}`} />
      </div>

      {success ? (
        <div className="py-8 text-center lg:max-w-md">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-[#0F5F56] lg:text-[#F6C979]" />
          <h2 className="mb-1 text-xl font-bold text-[#17201D] lg:text-white">{isId ? 'Pendaftaran berhasil' : 'Registration complete'}</h2>
          <p className="text-sm text-[#5F675F] lg:text-white/70">{isId ? 'Mengalihkan ke halaman login…' : 'Redirecting to login…'}</p>
        </div>
      ) : step === 1 ? (
        <form onSubmit={handleNextStep} className="space-y-4 lg:max-w-md">
          {errorBox}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="register-name" className={authLabelClass}>{isId ? 'Nama lengkap' : 'Full name'}</label>
              <input id="register-name" type="text" name="name" placeholder={isId ? 'Nama Anda' : 'Your name'} value={formData.name}
                onChange={handleChange} autoComplete="name" className={authFieldClass} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-store" className={authLabelClass}>{isId ? 'Nama toko' : 'Shop name'}</label>
              <input id="register-store" type="text" name="storeName" placeholder={isId ? 'cth: Bengkel Jaya' : 'e.g. My Shop'} value={formData.storeName}
                onChange={handleChange} autoComplete="organization" className={authFieldClass} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-wa" className={authLabelClass}>{isId ? 'Nomor WhatsApp' : 'WhatsApp number'}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-[#5F675F] lg:text-white/60">+62</span>
              <input id="register-wa" type="tel" name="whatsappNumber" placeholder="8123456789" value={formData.whatsappNumber}
                onChange={handleChange} autoComplete="tel-national" className={`${authFieldClass} pl-14`} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-email" className={authLabelClass}>Email</label>
            <input id="register-email" type="email" name="email" placeholder="nama@email.com" value={formData.email}
              onChange={handleChange} autoComplete="email" autoCapitalize="none" className={authFieldClass} required />
          </div>

          {passwordField('password', 'Password', isId ? 'Minimal 8 karakter' : 'At least 8 characters', showPassword, () => setShowPassword(!showPassword))}
          {passwordField('confirmPassword', isId ? 'Ulangi password' : 'Repeat password', isId ? 'Ketik ulang password' : 'Type it again', showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword))}

          {/* More outlets are optional and rare, so they stay behind a small link */}
          <div className="space-y-2">
            {additionalOutlets.map((outlet, index) => (
              <div key={`${index}-${additionalOutlets.length}`} className="flex items-center gap-2">
                <input
                  type="text"
                  value={outlet}
                  onChange={e => updateAdditionalOutlet(index, e.target.value)}
                  placeholder={`Outlet ${index + 2}`}
                  aria-label={`Outlet ${index + 2}`}
                  className={authFieldClass}
                />
                <button
                  type="button"
                  onClick={() => removeAdditionalOutlet(index)}
                  className="shrink-0 p-2 text-[#8A9188] hover:text-red-600 lg:text-white/55 lg:hover:text-red-300"
                  aria-label={isId ? 'Hapus outlet tambahan' : 'Remove additional outlet'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addAdditionalOutlet} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F5F56] hover:underline lg:text-white/80">
              <Plus className="h-4 w-4" /> {isId ? 'Punya lebih dari satu outlet? Tambahkan' : 'More than one outlet? Add it'}
            </button>
          </div>

          <button type="submit" className={authPrimaryButtonClass}>{isId ? 'Lanjut' : 'Continue'}</button>
        </form>
      ) : (
        <div className="space-y-4 lg:max-w-md">
          {errorBox}
          <p className="text-sm text-[#5F675F] lg:text-white/70">
            {isId ? 'Menu dan fitur akan disesuaikan dengan jenis usaha Anda.' : 'Menus and features follow your business type.'}
          </p>

          <div className="grid gap-2.5" role="radiogroup">
            {BUSINESS_TYPE_OPTIONS.map((bt) => {
              const isSelected = selectedType === bt.type
              return (
                <button
                  key={bt.type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedType(bt.type)}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
                    isSelected
                      ? 'border-[#0F5F56] bg-[#E3F1EE]/60 lg:border-[#F6C979] lg:bg-white/10'
                      : 'border-[#E4E6E7] bg-white hover:border-[#CDD1D3] lg:border-white/15 lg:bg-white/[0.04] lg:hover:border-white/30'
                  }`}
                >
                  <bt.icon className="h-6 w-6 shrink-0 stroke-[1.75] text-[#0F5F56] lg:text-[#F6C979]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#17201D] lg:text-white">{t(`businessType.${bt.key}.title`)}</p>
                    <p className="text-xs text-[#5F675F] lg:text-white/60">{t(`businessType.${bt.key}.description`)}</p>
                  </div>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#0F5F56] bg-[#0F5F56] text-white lg:border-[#F6C979] lg:bg-[#F6C979] lg:text-[#17201D]' : 'border-[#CDD1D3] lg:border-white/30'}`}>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={() => setStep(1)} className={authSecondaryButtonClass}>{isId ? 'Kembali' : 'Back'}</button>
            <button type="button" onClick={handleRegister} disabled={!selectedType || isLoading} className={authPrimaryButtonClass}>
              {isLoading ? (isId ? 'Mendaftar…' : 'Signing up…') : (isId ? 'Daftar' : 'Sign up')}
            </button>
          </div>
        </div>
      )}

      {!success && (
        <p className="mt-6 text-center text-sm text-[#5F675F] lg:max-w-md lg:text-white/70">
          {isId ? 'Sudah punya akun?' : 'Already have an account?'}{' '}
          <Link href="/login" className={authLinkClass}>{isId ? 'Masuk' : 'Log in'}</Link>
        </p>
      )}
    </AuthShell>
  )
}
