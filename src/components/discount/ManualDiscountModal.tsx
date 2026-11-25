'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { percentOf, type ManualDiscount } from '@/domain/sales/manualDiscount'
import { DiscountReasonPicker, reasonProblem, type ReasonDraft } from './DiscountReasonPicker'

interface Props {
  /** What is due before this discount (after promo or voucher). */
  due: number
  current: ManualDiscount | null
  /** null removes the discount. */
  onSave: (discount: ManualDiscount | null) => void
  onClose: () => void
}

/** An amount off the whole sale or note, in rupiah or percent, with a reason. */
export function ManualDiscountModal({ due, current, onSave, onClose }: Props) {
  const { t } = useLanguage()
  const [mode, setMode] = useState<'amount' | 'percent'>('amount')
  const [value, setValue] = useState(current ? String(current.amount) : '')
  const [draft, setDraft] = useState<ReasonDraft>({ reason: current?.reason ?? null, note: current?.note ?? '' })
  const [touched, setTouched] = useState(false)

  const raw = Number(value.replace(/[^\d.,]/g, '').replace(',', '.') || '0')
  const amount = mode === 'percent' ? percentOf(due, raw) : Math.round(raw)
  const tooLarge = amount > due
  const problem = amount > 0 ? reasonProblem(draft) : null
  const canSave = amount > 0 && !tooLarge && !problem

  const save = () => {
    setTouched(true)
    if (!canSave) return
    onSave({ amount, reason: draft.reason!, note: draft.note.trim() || null })
  }

  const tab = (m: 'amount' | 'percent', label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => { setMode(m); setValue('') }}
      className={`px-3 py-1.5 text-sm font-semibold ${mode === m ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-900'}`}
    >
      {label}
    </button>
  )

  return (
    <Modal isOpen onClose={onClose} title={t('discount.total.title')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{t('discount.total.due')}: <b>{formatCurrency(due)}</b></p>
        <div className="flex items-end gap-2">
          <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            {tab('amount', 'Rp')}
            {tab('percent', '%')}
          </div>
          <div className="flex-1">
            <Input
              label={mode === 'amount' ? t('discount.total.amount') : t('discount.total.percent')}
              value={value}
              inputMode="decimal"
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              error={tooLarge ? t('discount.total.tooLarge') : undefined}
              fullWidth
            />
          </div>
        </div>
        {amount > 0 && !tooLarge && (
          <p className="text-sm">
            {t('discount.total.after')}: <b>{formatCurrency(due - amount)}</b>
            {mode === 'percent' && <span className="text-gray-500"> (−{formatCurrency(amount)})</span>}
          </p>
        )}
        <DiscountReasonPicker value={draft} onChange={setDraft} />
        {touched && problem && <p className="text-sm text-red-600" role="alert">{t(`discount.${problem}`)}</p>}
        <div className="flex flex-wrap justify-between gap-2">
          {current ? (
            <Button variant="outline" onClick={() => onSave(null)}>{t('discount.total.remove')}</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={touched && !canSave}>{t('common.save')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
