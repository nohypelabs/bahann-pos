'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig, motion } from 'framer-motion'
import { Check, LogOut, XCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BUSINESS_TYPE_OPTIONS } from '@/lib/business/business-type-options'
import { friendlyError } from '@/lib/errors/friendlyError'
import { AuthBackdrop, authPrimaryButtonClass } from '@/components/auth/AuthShell'

// First-run page, styled like login: a plain white page on phones, and from lg up a glass card
// over the Laku teal backdrop.

export default function SetupPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const utils = trpc.useUtils()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [error, setError] = useState('')

  const setupMutation = trpc.businessProfile.setup.useMutation()
  const logoutMutation = trpc.auth.logout.useMutation()
  const { data: existingProfile, isLoading: profileLoading } = trpc.businessProfile.getMyProfile.useQuery()
  const { data: me } = trpc.auth.getProfile.useQuery()

  // If profile already exists, redirect to dashboard
  if (existingProfile && !profileLoading) {
    router.replace('/dashboard')
    return null
  }

  const handleSetup = async () => {
    if (!selectedType) {
      setError(t('setup.noTypeSelected'))
      return
    }

    setError('')
    try {
      await setupMutation.mutateAsync({ businessType: selectedType })
      // Refetch profile so layout doesn't redirect back to /setup with stale cache
      await utils.businessProfile.getMyProfile.refetch()
      router.replace('/dashboard')
    } catch (err: unknown) {
      setError(friendlyError(err, t('setup.failed')))
    }
  }

  // There is no sidebar here, so the way out lives on the page.
  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync() } catch { /* server cleanup best-effort */ }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-white px-5 py-10 lg:bg-[#062925] lg:p-8">
        <AuthBackdrop />

        <div className="relative flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-md lg:max-w-4xl lg:rounded-[28px] lg:border lg:border-white/15 lg:bg-white/[0.07] lg:p-12 lg:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] lg:backdrop-blur-2xl"
          >
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <img src="/logo.svg" alt="Laku POS" className="mb-6 h-10 w-10 lg:hidden" />
              {/* The glass card is dark from lg up: the white mark keeps its contrast there. */}
              <img src="/logo-light.svg" alt="Laku POS" className="mb-8 hidden h-10 w-10 lg:block" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F5F56] lg:text-[#F6C979]">{t('setup.eyebrow')}</p>
              <h1 className="mt-2 text-[26px] font-bold tracking-tight text-[#17201D] lg:text-4xl lg:text-white">{t('setup.title')}</h1>
              <p className="mt-1.5 max-w-xl text-sm text-[#5F675F] lg:text-base lg:text-white/70">{t('setup.subtitle')}</p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 lg:border-red-400/30 lg:bg-red-500/15 lg:text-red-200">
                <XCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div role="radiogroup" aria-label={t('setup.title')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
              {BUSINESS_TYPE_OPTIONS.map((bt) => {
                const isSelected = selectedType === bt.type
                return (
                  <button
                    key={bt.type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => { setSelectedType(bt.type); setError('') }}
                    className={`relative flex flex-col rounded-[20px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F5F56]/20 lg:focus-visible:ring-[#F6C979]/25 ${
                      isSelected
                        ? 'border-[#0F5F56] bg-[#F1F8F6] ring-4 ring-[#0F5F56]/10 lg:border-[#F6C979]/80 lg:bg-[#F6C979]/10 lg:ring-[#F6C979]/15'
                        : 'border-[#E4E6E7] bg-white hover:border-[#B9CBBF] lg:border-white/12 lg:bg-black/20 lg:hover:border-white/30 lg:hover:bg-black/30'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                        isSelected
                          ? 'border-[#0F5F56] bg-[#0F5F56] text-white lg:border-[#F6C979] lg:bg-[#F6C979] lg:text-[#17201D]'
                          : 'border-[#CDD1D3] lg:border-white/30'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>

                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F0] text-[#0F5F56] lg:bg-white/10 lg:text-[#F6C979]">
                      <bt.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="mt-4 pr-6 text-base font-semibold text-[#17201D] lg:text-white">
                      {t(`businessType.${bt.key}.title`)}
                    </span>
                    <span className="mt-1 text-sm text-[#5F675F] lg:text-white/60">
                      {t(`businessType.${bt.key}.description`)}
                    </span>
                    <span className="mt-4 flex flex-wrap gap-1.5">
                      {bt.modules.map((mod) => (
                        <span key={mod} className="rounded-full border border-[#E4E6E7] px-2.5 py-0.5 text-[11px] font-medium text-[#5F675F] lg:border-white/15 lg:text-white/70">
                          {t(`businessType.module.${mod}`)}
                        </span>
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col-reverse items-center gap-4 lg:flex-row lg:justify-between">
              <p className="text-center text-xs text-[#8A9188] lg:text-left lg:text-sm lg:text-white/55">{t('setup.changeHint')}</p>
              <button
                type="button"
                onClick={handleSetup}
                disabled={!selectedType || setupMutation.isPending}
                className={`${authPrimaryButtonClass} lg:w-auto lg:px-10`}
              >
                {setupMutation.isPending ? t('setup.submitting') : t('setup.submit')}
              </button>
            </div>

            <div className="mt-8 flex flex-col items-center gap-1 border-t border-[#E4E6E7] pt-5 text-xs text-[#8A9188] sm:flex-row sm:justify-between lg:border-white/10 lg:text-white/50">
              {me?.email && <span className="truncate">{t('setup.signedInAs').replace('{email}', me.email)}</span>}
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 font-medium text-[#0F5F56] hover:underline lg:text-[#F6C979]">
                <LogOut className="h-3.5 w-3.5" /> {t('setup.logout')}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  )
}
