'use client'

import { useState } from 'react'
import { Sunrise } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { friendlyError } from '@/lib/errors/friendlyError'

interface Props {
  outletId: string
  outletName?: string
  onClose: () => void
  onOpened?: () => void
}

/** Opens the cashier's shift right where they sell, so they never hunt for the End of Day page. */
export function OpenShiftModal({ outletId, outletName, onClose, onOpened }: Props) {
  const { t } = useLanguage()
  const utils = trpc.useUtils()
  const [cash, setCash] = useState('')
  const [error, setError] = useState('')
  const open = trpc.shifts.open.useMutation()

  const submit = async () => {
    setError('')
    try {
      await open.mutateAsync({ outletId, openingCash: Number(cash.replace(/\D/g, '') || '0') })
      await utils.shifts.getActive.invalidate()
      onOpened?.()
      onClose()
    } catch (err) {
      setError(friendlyError(err, t('shift.open.failed')))
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t('shift.open.title')} size="sm">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('shift.open.hint')}{outletName ? ` (${outletName})` : ''}
        </p>
        <Input
          label={t('shift.open.cashLabel')}
          inputMode="numeric"
          placeholder="0"
          value={cash}
          onChange={(e) => setCash(e.target.value.replace(/\D/g, ''))}
          autoFocus
          fullWidth
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="primary" size="lg" fullWidth disabled={open.isPending}>
          {open.isPending ? t('common.loading') : <><Sunrise className="w-4 h-4 mr-1 inline" /> {t('shift.open.submit')}</>}
        </Button>
      </form>
    </Modal>
  )
}
