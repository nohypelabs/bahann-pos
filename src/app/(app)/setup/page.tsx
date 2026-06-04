'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
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

export default function SetupPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [error, setError] = useState('')

  const setupMutation = trpc.businessProfile.setup.useMutation()
  const { data: existingProfile, isLoading: profileLoading } = trpc.businessProfile.getMyProfile.useQuery()

  // If profile already exists, redirect to dashboard
  if (existingProfile && !profileLoading) {
    router.push('/dashboard')
    return null
  }

  const handleSetup = async () => {
    if (!selectedType) {
      setError(language === 'id' ? 'Pilih jenis usaha terlebih dahulu' : 'Please select a business type')
      return
    }

    setError('')
    try {
      await setupMutation.mutateAsync({ businessType: selectedType })
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    }
  }

  const isId = language === 'id'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo.svg" alt="Laku POS" className="w-16 h-16 rounded-2xl shadow-md" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {isId ? 'Selamat Datang di Laku POS! 🎉' : 'Welcome to Laku POS! 🎉'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isId
              ? 'Pilih jenis usaha Anda untuk mengkonfigurasi sistem secara otomatis'
              : 'Select your business type to automatically configure the system'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Business Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {BUSINESS_TYPES.map((bt) => {
            const isSelected = selectedType === bt.type
            return (
              <button
                key={bt.type}
                onClick={() => setSelectedType(bt.type)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg shadow-blue-100 dark:shadow-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
              >
                {/* Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}

                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{bt.icon}</span>
                  <div>
                    <h3 className={`text-lg font-bold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {isId ? bt.titleId : bt.titleEn}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-sm mb-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {isId ? bt.descId : bt.descEn}
                </p>

                {/* Modules */}
                <div className="flex flex-wrap gap-1.5">
                  {bt.modules.map((mod) => (
                    <span
                      key={mod}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {mod === 'inventory' ? (isId ? '📦 Stok' : '📦 Inventory')
                        : mod === 'recipe' ? (isId ? '🍳 Resep' : '🍳 Recipe')
                        : mod === 'appointment' ? (isId ? '📅 Janji Temu' : '📅 Appointment')
                        : mod}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Submit Button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSetup}
            disabled={!selectedType || setupMutation.isPending}
            className="w-full max-w-sm"
          >
            {setupMutation.isPending
              ? (isId ? 'Menyimpan...' : 'Saving...')
              : (isId ? '🚀 Mulai' : '🚀 Get Started')}
          </Button>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {isId
              ? 'Anda bisa mengubah jenis usaha kapan saja di Pengaturan'
              : 'You can change your business type anytime in Settings'}
          </p>
        </div>
      </div>
    </div>
  )
}
