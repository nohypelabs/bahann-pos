'use client'

import { useState } from 'react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'
import { DEFAULT_STAMP_CONFIG } from '@/domain/workshop/rules'
import type { StampProgramConfig, VoucherReward } from '@/domain/entities/Workshop'

type RewardType = VoucherReward['type']

interface FormState {
  isActive: boolean
  name: string
  requiredStamps: string
  minSpend: string
  rewardType: RewardType
  /** free_service / percent cap, empty = no cap */
  maxValue: string
  amount: string
  percent: string
  /** empty = vouchers never expire */
  validDays: string
}

const digits = (s: string) => s.replace(/\D/g, '')
const num = (s: string) => Number(digits(s) || '0')

function toForm(isActive: boolean, name: string, c: StampProgramConfig): FormState {
  const r = c.reward
  return {
    isActive,
    name,
    requiredStamps: String(c.requiredStamps),
    minSpend: c.minSpend ? String(c.minSpend) : '',
    rewardType: r.type,
    maxValue: r.type !== 'fixed' && r.maxValue ? String(r.maxValue) : '',
    amount: r.type === 'fixed' ? String(r.amount) : '',
    percent: r.type === 'percent' ? String(r.percent) : '',
    validDays: c.voucherValidDays ? String(c.voucherValidDays) : '',
  }
}

function toConfig(f: FormState): StampProgramConfig {
  const cap = f.maxValue.trim() ? num(f.maxValue) : null
  const reward: VoucherReward =
    f.rewardType === 'fixed' ? { type: 'fixed', amount: num(f.amount) }
    : f.rewardType === 'percent' ? { type: 'percent', percent: num(f.percent), maxValue: cap }
    : { type: 'free_service', maxValue: cap }
  return {
    requiredStamps: num(f.requiredStamps),
    minSpend: num(f.minSpend),
    reward,
    voucherValidDays: f.validDays.trim() ? num(f.validDays) : null,
  }
}

/** Settings for the stamp card ("10x service → 1 free service"). */
export function StampProgramSettings() {
  const { data: program, isLoading } = trpc.workshop.loyalty.stampProgram.useQuery()
  const { t } = useLanguage()
  if (isLoading) return <SectionCard title={t('workshop.loyalty.title')}><p className="text-sm text-gray-400">{t('common.loading')}</p></SectionCard>
  // Remount when the saved program changes, so the form starts from what the server has.
  const initial = program
    ? toForm(program.isActive, program.name, program.config)
    : toForm(false, 'Kartu Servis', DEFAULT_STAMP_CONFIG)
  return <StampProgramForm key={program ? `${program.id}-${JSON.stringify(program.config)}-${program.isActive}` : 'new'} initial={initial} />
}

function StampProgramForm({ initial }: { initial: FormState }) {
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const save = trpc.workshop.loyalty.saveStampProgram.useMutation()
  const [f, setF] = useState<FormState>(initial)
  const set = (patch: Partial<FormState>) => setF((prev) => ({ ...prev, ...patch }))

  const submit = async () => {
    try {
      await save.mutateAsync({ name: f.name.trim() || 'Kartu Servis', isActive: f.isActive, config: toConfig(f) })
      await utils.workshop.loyalty.stampProgram.invalidate()
      showToast(t('workshop.loyalty.saved'), 'success')
    } catch (err) {
      showToast(workshopErrorMessage(err, language), 'error')
    }
  }

  const required = num(f.requiredStamps) || 10
  const summary = t('workshop.loyalty.summary')
    .replace('{n}', String(required))
    .replace('{reward}',
      f.rewardType === 'fixed' ? `${t('workshop.loyalty.discountOf')} Rp${num(f.amount).toLocaleString('id-ID')}`
      : f.rewardType === 'percent' ? `${t('workshop.loyalty.discountOf')} ${num(f.percent)}%`
      : t('workshop.voucher.freeService'))

  return (
    <SectionCard title={t('workshop.loyalty.title')}>
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          {t('workshop.loyalty.active')}
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-300 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-2">{summary}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t('workshop.loyalty.requiredStamps')} value={f.requiredStamps} inputMode="numeric" onChange={(e) => set({ requiredStamps: digits(e.target.value) })} fullWidth />
          <Input label={t('workshop.loyalty.minSpend')} value={f.minSpend} inputMode="numeric" placeholder="0" onChange={(e) => set({ minSpend: digits(e.target.value) })} fullWidth />
          <Select
            label={t('workshop.loyalty.rewardType')}
            value={f.rewardType}
            onChange={(e) => set({ rewardType: e.target.value as RewardType })}
            options={[
              { value: 'free_service', label: t('workshop.loyalty.rewardFreeService') },
              { value: 'fixed', label: t('workshop.loyalty.rewardFixed') },
              { value: 'percent', label: t('workshop.loyalty.rewardPercent') },
            ]}
            fullWidth
          />
          {f.rewardType === 'fixed' ? (
            <Input label={t('workshop.loyalty.amount')} value={f.amount} inputMode="numeric" onChange={(e) => set({ amount: digits(e.target.value) })} fullWidth />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {f.rewardType === 'percent' && (
                <Input label={t('workshop.loyalty.percent')} value={f.percent} inputMode="numeric" onChange={(e) => set({ percent: digits(e.target.value) })} fullWidth />
              )}
              <Input
                label={t('workshop.loyalty.maxValue')}
                value={f.maxValue}
                inputMode="numeric"
                placeholder={t('workshop.loyalty.noCap')}
                onChange={(e) => set({ maxValue: digits(e.target.value) })}
                fullWidth
              />
            </div>
          )}
          <Input
            label={t('workshop.loyalty.validDays')}
            value={f.validDays}
            inputMode="numeric"
            placeholder={t('workshop.loyalty.neverExpires')}
            onChange={(e) => set({ validDays: digits(e.target.value) })}
            fullWidth
          />
        </div>
        <p className="text-xs text-gray-500">{t('workshop.loyalty.hint')}</p>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={save.isPending}>{t('common.save')}</Button>
        </div>
      </div>
    </SectionCard>
  )
}
