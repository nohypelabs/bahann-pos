'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  card: { programActive: boolean; balance: number; required: number }
}

/** The member's stamp card as a row of dots: filled for each stamp earned. */
export function StampProgress({ card }: Props) {
  const { t } = useLanguage()
  if (!card.programActive) return null
  const filled = Math.min(card.balance, card.required)
  return (
    <div>
      <div className="flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: card.required }, (_, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full border ${i < filled ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
        {t('workshop.stamps').replace('{n}', String(filled)).replace('{required}', String(card.required))}
      </p>
    </div>
  )
}
