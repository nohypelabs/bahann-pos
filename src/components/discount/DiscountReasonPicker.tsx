'use client'

import { Textarea } from '@/components/ui/Input'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DISCOUNT_NOTE_MAX, DISCOUNT_REASONS, type DiscountReason } from '@/domain/sales/manualDiscount'

export interface ReasonDraft {
  reason: DiscountReason | null
  note: string
}

/** What is still missing before a discount can be saved, or null when complete. */
export function reasonProblem(draft: ReasonDraft): 'reasonRequired' | 'noteRequired' | null {
  if (!draft.reason) return 'reasonRequired'
  if (draft.reason === 'OTHER' && !draft.note.trim()) return 'noteRequired'
  return null
}

/** Quick-pick reasons for a manual discount, plus a note (required for "Other"). */
export function DiscountReasonPicker({ value, onChange }: { value: ReasonDraft; onChange: (next: ReasonDraft) => void }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-semibold text-[#2F3A35] dark:text-gray-300">{t('discount.reasonLabel')}</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('discount.reasonLabel')}>
          {DISCOUNT_REASONS.map((r) => {
            const active = value.reason === r
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...value, reason: r })}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${active
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-gray-200 dark:border-gray-700 hover:border-teal-400'}`}
              >
                {t(`discount.reason.${r}`)}
              </button>
            )
          })}
        </div>
      </div>
      <Textarea
        label={value.reason === 'OTHER' ? t('discount.noteRequiredLabel') : t('discount.noteLabel')}
        placeholder={t('discount.notePlaceholder')}
        value={value.note}
        rows={2}
        maxLength={DISCOUNT_NOTE_MAX}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        fullWidth
      />
    </div>
  )
}
