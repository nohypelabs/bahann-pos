'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'

type AlertState = { type: 'success' | 'error' | 'info'; msg: string } | null

export default function EODPage() {
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [openingCash, setOpeningCash]       = useState(0)
  const [closingCash, setClosingCash]       = useState(0)
  const [notes, setNotes]                   = useState('')
  const [alert, setAlert]                   = useState<AlertState>(null)

  const flash = (type: AlertState['type'], msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 4000)
  }

  const { data: outletsData } = trpc.outlets.getAll.useQuery()
  const { data: currentSession, refetch } = trpc.cashSessions.getCurrent.useQuery(
    { outletId: selectedOutlet },
    { enabled: !!selectedOutlet }
  )

  const openMutation  = trpc.cashSessions.open.useMutation({ onSuccess: () => { refetch(); setOpeningCash(0); flash('success', 'Sesi kasir berhasil dibuka!') } })
  const closeMutation = trpc.cashSessions.close.useMutation({ onSuccess: () => refetch() })

  const handleOpenDay = async () => {
    if (!selectedOutlet) { flash('error', 'Pilih outlet terlebih dahulu'); return }
    try {
      await openMutation.mutateAsync({ outletId: selectedOutlet, openingCash })
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Gagal membuka sesi')
    }
  }

  const handleCloseDay = async () => {
    if (!currentSession) return
    try {
      const result = await closeMutation.mutateAsync({ sessionId: currentSession.id, closingCash, notes })
      const diff = result.difference
      if (diff !== 0) {
        const label = diff > 0 ? 'lebih' : 'kurang'
        flash('info', `Hari ditutup! Kas ${label}: ${formatCurrency(Math.abs(diff))}`)
      } else {
        flash('success', 'Hari ditutup! Kas pas sempurna.')
      }
      setClosingCash(0)
      setNotes('')
    } catch (err) {
      flash('error', err instanceof Error ? err.message : 'Gagal menutup sesi')
    }
  }

  const outlets = outletsData?.outlets ?? []
  const diff = closingCash - (currentSession?.opening_cash ?? 0)

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      <PageHeader title="End of Day" subtitle="Kelola sesi kas harian per outlet" />

      {/* Alert */}
      {alert && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium ${
          alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
          : alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
        }`}>
          <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'}</span>
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
            <option value="">🏪 Pilih outlet…</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
        </div>
      </SectionCard>

      {/* No active session — Open Day */}
      {selectedOutlet && !currentSession && (
        <SectionCard title="Buka Hari Baru">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Belum ada sesi aktif untuk outlet ini. Masukkan jumlah kas awal untuk memulai hari.
            </p>
            <Input
              type="number"
              label="Jumlah Kas Awal (Rp)"
              value={openingCash}
              onChange={e => setOpeningCash(parseFloat(e.target.value) || 0)}
              fullWidth
            />
            <Button variant="primary" size="lg" fullWidth onClick={handleOpenDay} disabled={openMutation.isPending}>
              {openMutation.isPending ? 'Membuka…' : '🌅 Buka Hari'}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Active session */}
      {selectedOutlet && currentSession && (
        <div className="space-y-4">
          <SectionCard title="Sesi Aktif">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <StatCard icon="🕐" label="Dibuka Pukul" value={formatDateTime(currentSession.opened_at)} color="gray" />
              <StatCard icon="💵" label="Kas Awal" value={formatCurrency(currentSession.opening_cash)} color="green" />
              <StatCard icon="👤" label="Dibuka Oleh" value={currentSession.opened_by_user?.name || '—'} color="gray" />
              <StatCard icon="🟢" label="Status" value="BUKA" color="green" />
            </div>
          </SectionCard>

          <SectionCard title="Tutup Hari">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Hitung uang di laci kas lalu masukkan jumlahnya untuk menutup hari.
              </p>

              <Input
                type="number"
                label="Jumlah Kas Akhir (Rp)"
                value={closingCash}
                onChange={e => setClosingCash(parseFloat(e.target.value) || 0)}
                fullWidth
              />

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan penutupan hari…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {closingCash > 0 && (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Kas Awal</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(currentSession.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Kas Akhir</span>
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
                disabled={closeMutation.isPending || closingCash <= 0}
              >
                {closeMutation.isPending ? 'Menutup…' : '🌙 Tutup Hari'}
              </Button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
