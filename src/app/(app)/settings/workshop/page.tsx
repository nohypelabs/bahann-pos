'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'

export default function WorkshopSettingsPage() {
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const utils = trpc.useUtils()
  const mechanics = trpc.workshop.mechanics.list.useQuery({ includeInactive: true })
  const save = trpc.workshop.mechanics.save.useMutation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const run = async (input: { id?: string; name: string; phone?: string | null; isActive: boolean }) => {
    try {
      await save.mutateAsync(input)
      await utils.workshop.mechanics.list.invalidate()
      return true
    } catch (err) {
      showToast(workshopErrorMessage(err, language), 'error')
      return false
    }
  }

  const add = async () => {
    if (await run({ name, phone: phone || null, isActive: true })) {
      setName(''); setPhone('')
      showToast(t('workshop.settings.mechanicAdded'), 'success')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title={t('workshop.settings.title')} subtitle={t('workshop.settings.subtitle')} />

      <SectionCard title={t('workshop.settings.mechanics')}>
        <form className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end mb-4" onSubmit={(e) => { e.preventDefault(); add() }}>
          <Input label={t('workshop.name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <Input label={t('workshop.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" fullWidth />
          <Button type="submit" disabled={!name.trim() || save.isPending}>
            <Plus className="w-4 h-4 mr-1" /> {t('common.add')}
          </Button>
        </form>

        {mechanics.data?.length === 0 && <p className="text-sm text-gray-400">{t('workshop.settings.noMechanics')}</p>}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {mechanics.data?.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div className={m.isActive ? '' : 'opacity-50'}>
                <p className="font-medium text-sm">{m.name}</p>
                {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => run({ id: m.id, name: m.name, phone: m.phone, isActive: !m.isActive })}
              >
                {m.isActive ? t('workshop.settings.deactivate') : t('workshop.settings.activate')}
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
