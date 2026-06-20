'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Input } from '@/components/ui/Input'
import { PinInput } from '@/components/ui/PinInput'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/Toast'
import {
  User, KeyRound, Shield, CheckCircle, Loader2, Lock,
} from 'lucide-react'

export default function ProfilePage() {
  const { showToast } = useToast()
  const utils = trpc.useUtils()

  // Check if user has PIN set
  const { data: pinData, isLoading: pinLoading } = trpc.users.hasPin.useQuery()

  // Set PIN form
  const [showPinForm, setShowPinForm] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [pinFormError, setPinFormError] = useState('')

  const setPinMutation = trpc.users.setPin.useMutation({
    onSuccess: () => {
      showToast('PIN berhasil diset!', 'success')
      setShowPinForm(false)
      setNewPin('')
      setConfirmPin('')
      setCurrentPassword('')
      setPinFormError('')
      utils.users.hasPin.invalidate()
    },
    onError: (err) => {
      setPinFormError(err.message || 'Gagal mengatur PIN')
    },
  })

  const handleSetPin = async () => {
    setPinFormError('')

    if (newPin.length < 4) {
      setPinFormError('PIN minimal 4 digit')
      return
    }
    if (newPin !== confirmPin) {
      setPinFormError('PIN tidak cocok')
      return
    }
    if (!currentPassword) {
      setPinFormError('Password saat ini wajib diisi')
      return
    }

    await setPinMutation.mutateAsync({
      pin: newPin,
      currentPassword,
    })
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      <PageHeader
        title="Profil Saya"
        subtitle="Kelola informasi akun dan keamanan"
      />

      {/* PIN Section */}
      <SectionCard
        title="PIN Persetujuan"
        action={
          pinData?.hasPin ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Sudah diatur
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-full">
              <KeyRound className="w-3.5 h-3.5" />
              Belum diatur
            </span>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                PIN digunakan untuk menyetujui permintaan void/refund
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Saat kasir mengajukan void, Anda (Kepala Toko/Admin) harus memasukkan PIN ini untuk menyetujui. PIN 4-6 digit angka.
              </p>
            </div>
          </div>

          {pinLoading ? (
            <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : !showPinForm ? (
            <button
              onClick={() => setShowPinForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              {pinData?.hasPin ? 'Ubah PIN' : 'Atur PIN'}
            </button>
          ) : (
            <div className="space-y-5 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <PinInput
                length={6}
                value={newPin}
                onChange={setNewPin}
                label="PIN Baru (4-6 digit)"
                error={pinFormError && newPin.length < 4 ? 'PIN minimal 4 digit' : undefined}
              />

              <PinInput
                length={6}
                value={confirmPin}
                onChange={setConfirmPin}
                label="Konfirmasi PIN"
                error={confirmPin && newPin !== confirmPin ? 'PIN tidak cocok' : undefined}
              />

              <Input
                type="password"
                label="Password Saat Ini"
                placeholder="Masukkan password akun Anda"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                error={pinFormError && !currentPassword ? 'Password wajib diisi' : undefined}
              />

              {pinFormError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{pinFormError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPinForm(false)
                    setNewPin('')
                    setConfirmPin('')
                    setCurrentPassword('')
                    setPinFormError('')
                  }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSetPin}
                  disabled={setPinMutation.isPending || newPin.length < 4 || newPin !== confirmPin}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {setPinMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Simpan PIN</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
