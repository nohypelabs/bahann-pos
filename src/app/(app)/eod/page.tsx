'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Clock, Banknote, User, CheckCircle, Sunrise, Moon, CheckCircle2, XCircle, Info, Hourglass } from 'lucide-react'

type AlertState = { type: 'success' | 'error' | 'info'; msg: string } | null

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: 'BUKA', color: 'green' },
  pending_approval: { label: 'MENUNGGU PERSETUJUAN', color: 'yellow' },
  closed: { label: 'DITUTUP', color: 'gray' },
  rejected: { label: 'DITOLAK', color: 'red' },
}

export default function EODPage() {
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [openingCash, setOpeningCash]       = useState(0)
  const [closingCash, setClosingCash]       = useState(0)
  const [notes, setNotes]                   = useState('')
  const [alert, setAlert]                   = useState<AlertState>(null)

  const flash = (type: NonNullable<AlertState>['type'], msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 4000)
  }

  const { data: outletsData } = trpc.outlets.getAll.useQuery()
  const { data: activeShift, refetch } = trpc.shifts.getActive.useQuery(
    { outletId: selectedOutlet },
    { enabled: !!selectedOutlet }
  )

  const openMutation  = trpc.shifts.open.useMutation({ onSuccess: () => { refetch(); setOpeningCash(0); flash('success', 'Shift dibuka') } })
  const submitMutation = trpc.shifts.submit.useMutation({ onSuccess: () => { refetch(); setClosingCash(0); setNotes('') } })

  const handleOpenDay = async () => {
    if (!selectedOutlet) { flash('error', 'Pilih outlet terlebih dahulu'); return }
    try {
      await openMutation.mutateAsync({ outletId: selectedOutlet, openingCash })
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Gagal membuka shift. Periksa koneksi dan coba lagi.')
    }
  }

  const handleCloseDay = async () => {
    if (!activeShift) return
    try {
      await submitMutation.mutateAsync({ shiftId: activeShift.id, actualCash: closingCash, cashierNote: notes })
      flash('success', 'Penutupan shift diajukan')
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Gagal menutup shift. Periksa koneksi dan coba lagi.')
    }
  }

  const outlets = outletsData?.outlets ?? []
  const diff = closingCash - (activeShift?.opening_cash ?? 0)

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      <PageHeader title="End of Day" subtitle="Kelola shift harian per outlet" />

      {/* Alert */}
      {alert && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium ${
          alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
          : alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
        }`}>
          <span>{alert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : alert.type === 'error' ? <XCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}</span>
          {alert.msg}
        </div>
      )}

      {/* Outlet selector */}
      <SectionCard title="Pilih Outlet">
        <div className="relative">
          <select
            value={selectedOutlet}
            onChange={e => setSelectedOutlet(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          >
            <option value="">Pilih outlet…</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
        </div>
      </SectionCard>

      {/* No active shift — Open Day */}
      {selectedOutlet && !activeShift && (
        <SectionCard title="Buka Shift Baru">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada shift aktif untuk outlet ini. Masukkan jumlah kas awal untuk memulai hari.
            </p>
            <Input
              type="number"
              label="Jumlah Kas Awal (Rp)"
              value={openingCash}
              onChange={e => setOpeningCash(parseFloat(e.target.value) || 0)}
              fullWidth
            />
            <Button variant="primary" size="lg" fullWidth onClick={handleOpenDay} disabled={openMutation.isPending}>
              {openMutation.isPending ? 'Membuka…' : <><Sunrise className="w-4 h-4 mr-1 inline" /> Buka Shift</>}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Pending approval */}
      {selectedOutlet && activeShift && activeShift.status === 'pending_approval' && (
        <SectionCard title="Menunggu Persetujuan">
          <div className="flex flex-col items-center gap-3 py-6">
            <Hourglass className="w-10 h-10 text-yellow-500 animate-pulse" />
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 font-medium">
              Shift Anda sedang menunggu persetujuan admin.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Anda tidak bisa membuka shift baru sampai admin menyetujui atau menolak penutupan ini.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Rejected */}
      {selectedOutlet && activeShift && activeShift.status === 'rejected' && (
        <SectionCard title="Shift Ditolak">
          <div className="flex flex-col items-center gap-3 py-6">
            <XCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 font-medium">
              Penutupan shift Anda ditolak oleh admin.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Silakan submit ulang dengan jumlah kas yang benar.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Active/open shift */}
      {selectedOutlet && activeShift && activeShift.status === 'open' && (
        <div className="space-y-4">
          <SectionCard title="Shift Aktif">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <StatCard icon={<Clock />} label="Dibuka Pukul" value={formatDateTime(activeShift.opened_at)} color="gray" />
              <StatCard icon={<Banknote />} label="Kas Awal" value={formatCurrency(activeShift.opening_cash)} color="green" />
              <StatCard icon={<User />} label="Dibuka Oleh" value={activeShift.opened_by_user?.name || '—'} color="gray" />
              <StatCard icon={<CheckCircle />} label="Status" value={statusLabels[activeShift.status]?.label ?? activeShift.status} color="green" />
            </div>
          </SectionCard>

          <SectionCard title="Tutup Shift">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Hitung uang di laci kas lalu masukkan jumlahnya untuk menutup shift.
              </p>

              <Input
                type="number"
                label="Jumlah Kas Aktual (Rp)"
                value={closingCash}
                onChange={e => setClosingCash(parseFloat(e.target.value) || 0)}
                fullWidth
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Catatan Kasir (opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan penutupan shift…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {closingCash > 0 && (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Kas Awal</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(activeShift.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Kas Aktual</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(closingCash)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-bold pt-2 border-t border-gray-200 dark:border-gray-600 ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <span>Selisih</span>
                    <span>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleCloseDay}
                disabled={submitMutation.isPending || closingCash <= 0}
              >
                {submitMutation.isPending ? 'Menutup…' : <><Moon className="w-4 h-4 mr-1 inline" /> Tutup Shift</>}
              </Button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
