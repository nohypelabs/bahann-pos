'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PinInput } from '@/components/ui/PinInput'
import { ShieldCheck, Loader2 } from 'lucide-react'

interface PinConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (pin: string) => Promise<void>
  title?: string
  description?: string
  error?: string
  isLoading?: boolean
}

/**
 * PIN confirmation modal for approval flow
 * Kepala toko enters PIN to approve void/refund requests
 */
export function PinConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Verifikasi PIN',
  description = 'Masukkan PIN Kepala Toko untuk menyetujui permintaan ini.',
  error,
  isLoading = false,
}: PinConfirmModalProps) {
  const [pin, setPin] = useState('')
  const [localError, setLocalError] = useState('')

  const displayError = error || localError

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setLocalError('PIN minimal 4 digit')
      return
    }
    setLocalError('')
    try {
      await onConfirm(pin)
      setPin('')
    } catch {
      // Error handled by parent
    }
  }

  const handleClose = () => {
    setPin('')
    setLocalError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      closeOnBackdropClick={!isLoading}
      footer={
        <div className="flex gap-3 w-full">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || pin.length < 4}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi...</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Verifikasi & Setujui</>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5 py-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {description}
        </p>

        <PinInput
          length={6}
          value={pin}
          onChange={setPin}
          error={displayError}
          disabled={isLoading}
          label="Masukkan PIN"
        />

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          PIN ini milik Anda (Kepala Toko), bukan milik kasir.
        </p>
      </div>
    </Modal>
  )
}
