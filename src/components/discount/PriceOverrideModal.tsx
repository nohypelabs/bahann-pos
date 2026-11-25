'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { DiscountJustification, DiscountReason } from '@/domain/sales/manualDiscount'
import { DiscountReasonPicker, reasonProblem, type ReasonDraft } from './DiscountReasonPicker'

export interface PriceChange {
  unitPrice: number
  /** Set when unitPrice is below the list price. */
  justification: DiscountJustification | null
}

interface Props {
  itemName: string
  listPrice: number
  currentPrice: number
  current?: { reason?: DiscountReason | null; note?: string | null }
  /** A price above the list price is allowed (agreed labour on a service note). */
  allowAbove?: boolean
  onSave: (change: PriceChange) => void
  onClose: () => void
}

/** Changes one line's price; a price below the list price needs a reason. */
export function PriceOverrideModal({ itemName, listPrice, currentPrice, current, allowAbove = false, onSave, onClose }: Props) {
  const { t } = useLanguage()
  const [price, setPrice] = useState(String(currentPrice))
  const [draft, setDraft] = useState<ReasonDraft>({ reason: current?.reason ?? null, note: current?.note ?? '' })
  const [touched, setTouched] = useState(false)

  const value = Number(price.replace(/\D/g, '') || '0')
  const below = value < listPrice
  const tooHigh = !allowAbove && value > listPrice
  const problem = below ? reasonProblem(draft) : null
  const canSave = price.trim() !== '' && !tooHigh && !problem

  const save = () => {
    setTouched(true)
    if (!canSave) return
    onSave({ unitPrice: value, justification: below ? { reason: draft.reason!, note: draft.note.trim() || null } : null })
  }

  return (
    <Modal isOpen onClose={onClose} title={t('discount.line.title')} size="md">
      <div className="space-y-4">
        <div>
          <p className="font-semibold">{itemName}</p>
          <p className="text-sm text-gray-500">{t('discount.line.normalPrice')}: {formatCurrency(listPrice)}</p>
        </div>
        <Input
          label={t('discount.line.newPrice')}
          value={price}
          inputMode="numeric"
          autoFocus
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
          error={tooHigh ? t('discount.line.tooHigh') : undefined}
          fullWidth
        />
        {below && (
          <>
            <p className="text-sm font-semibold text-amber-700">
              {t('discount.line.saving').replace('{amount}', formatCurrency(listPrice - value))}
            </p>
            <DiscountReasonPicker value={draft} onChange={setDraft} />
            {touched && problem && <p className="text-sm text-red-600" role="alert">{t(`discount.${problem}`)}</p>}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={touched && !canSave}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  )
}
