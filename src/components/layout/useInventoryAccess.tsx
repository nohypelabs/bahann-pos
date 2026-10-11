'use client'

import { useState, type MouseEvent } from 'react'
import { PackageX } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { hasModule } from '@/lib/business/modules'

/**
 * Guards entry points into the warehouse. Business types without the inventory
 * module (e.g. services) get an explanation instead of a silent redirect.
 *
 * Usage: call `guard(event)` from the click handler; it returns false and opens
 * the warning modal when inventory is unavailable. Render `modal` once.
 */
export function useInventoryAccess() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const { data: businessProfile } = trpc.businessProfile.getMyProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })
  const canUseInventory = hasModule(businessProfile?.enabledModules, 'inventory')

  const guard = (event?: MouseEvent) => {
    if (canUseInventory) return true
    event?.preventDefault()
    setOpen(true)
    return false
  }

  const modal = (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title={t('inventory.unavailable.title')}
      size="sm"
      footer={
        <Button variant="primary" fullWidth onClick={() => setOpen(false)}>
          {t('inventory.unavailable.ok')}
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <PackageX className="h-6 w-6" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('inventory.unavailable.message')}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('inventory.unavailable.hint')}</p>
      </div>
    </Modal>
  )

  return { canUseInventory, guard, modal }
}
