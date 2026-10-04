'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BUSINESS_TYPE_OPTIONS } from '@/lib/business/business-type-options'
import type { BusinessType } from '@/domain/catalog/value-objects/business-type'

/**
 * Business type is what decides the enabled modules and the defaults for new
 * products, so it has to be changeable — the setup screen has always promised
 * "you can change your business type anytime in Settings", but until now there was
 * no way to do it outside the database.
 */
export default function BusinessSettingsPage() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  const { data: profile, isLoading } = trpc.businessProfile.getMyProfile.useQuery()
  const [selected, setSelected] = useState<BusinessType | null>(null)

  const updateMutation = trpc.businessProfile.update.useMutation({
    onSuccess: async () => {
      await utils.businessProfile.getMyProfile.invalidate()
      showToast(t('settings.business.updated'), 'success')
      setSelected(null)
    },
    onError: (err) => showToast(err.message, 'error'),
  })

  const currentType = profile?.businessType ?? null
  const pending = selected && selected !== currentType ? selected : null

  const handleSave = () => {
    if (!pending) {
      showToast(t('settings.business.unchanged'), 'error')
      return
    }
    updateMutation.mutate({ businessType: pending })
  }

  return (
    <div className="space-y-4 pt-2 md:pt-0">
      <PageHeader title={t('settings.business.title')} subtitle={t('settings.business.description')} />

      <SectionCard title={t('settings.business.current')}>
        {isLoading ? (
          <p className="text-sm text-gray-400">{t('common.loading')}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUSINESS_TYPE_OPTIONS.map((option) => {
                const isCurrent = currentType === option.type
                const isSelected = (pending ?? currentType) === option.type

                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setSelected(option.type)}
                    className={`relative cursor-pointer rounded-2xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute right-3 top-3 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        ✓
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.icon}</span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {t(`businessType.${option.key}.title`)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t(`businessType.${option.key}.description`)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {option.modules.map((mod) => (
                        <span
                          key={mod}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        >
                          {t(`businessType.module.${mod}`)}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t('settings.business.warning')}
            </p>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!pending || updateMutation.isPending}
              >
                {updateMutation.isPending ? t('settings.business.saving') : t('settings.business.save')}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
