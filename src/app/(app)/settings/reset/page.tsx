'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/Toast'

type Step = 1 | 2 | 3 | 'done'

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as const).map((s) => {
        const done    = typeof current === 'number' && current > s
        const active  = current === s
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              active ? 'bg-red-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {done ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`h-1 w-10 rounded transition-colors ${done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        )
      })}
      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
        {current === 1 ? 'Pilih opsi' : current === 2 ? 'Review' : current === 3 ? 'Konfirmasi' : 'Selesai'}
      </span>
    </div>
  )
}

export default function ResetDataPage() {
  const [step, setStep]               = useState<Step>(1)
  const [keepOutlets, setKeepOutlets] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [result, setResult]           = useState<Record<string, number> | null>(null)
  const { showToast } = useToast()
  const resetMutation = trpc.admin.resetAllData.useMutation()

  const handleReset = async () => {
    if (confirmText !== 'RESET ALL DATA') return
    try {
      const res = await resetMutation.mutateAsync({ confirmText: 'RESET ALL DATA', keepOutlets, keepUsers: true })
      setResult(res.counts)
      setStep('done')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reset gagal', 'error')
    }
  }

  const handleRestart = () => { setStep(1); setConfirmText(''); setResult(null); setKeepOutlets(true) }

  if (step === 'done' && result) {
    return (
      <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
        <PageHeader title="Reset Selesai" subtitle="Data sistem berhasil dihapus. Siap untuk setup pelanggan baru." />

        <SectionCard title="✅ Reset Berhasil">
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Data yang dihapus:</p>
            {Object.entries(result).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{count} records</span>
              </div>
            ))}
          </div>
          <Button variant="primary" fullWidth onClick={handleRestart}>Kembali ke Halaman Reset</Button>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
      <PageHeader title="Reset Data Sistem" subtitle="Hapus semua data operasional untuk setup pelanggan baru" />

      {/* Warning banner */}
      <div className="flex gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl">
        <span className="text-base shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-0.5">Aksi ini tidak bisa dibatalkan!</p>
          <p className="text-xs text-red-600 dark:text-red-400">
            Semua produk, transaksi, stok, dan data operasional akan dihapus permanen.
          </p>
        </div>
      </div>

      <StepIndicator current={step} />

      {/* Step 1 */}
      {step === 1 && (
        <SectionCard title="Step 1 — Pilih Opsi Reset">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Data yang SELALU dihapus:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {['Semua produk', 'Semua transaksi & transaction items', 'Stok harian', 'Stock alerts', 'Cash sessions', 'Promosi', 'Audit logs']
                  .map(item => <li key={item} className="flex items-center gap-1.5"><span className="text-red-400">•</span>{item}</li>)}
              </ul>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Opsi tambahan:</p>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                <input type="checkbox" checked={keepOutlets} onChange={e => setKeepOutlets(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pertahankan Outlets</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outlet tidak dihapus — biasanya diisi ulang sesuai lokasi pelanggan</p>
                </div>
              </label>
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 opacity-50">
                <input type="checkbox" checked disabled className="w-4 h-4" />
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pertahankan User Accounts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">User selalu dipertahankan — tidak bisa dihapus via reset</p>
                </div>
              </div>
            </div>

            <Button variant="danger" fullWidth onClick={() => setStep(2)}>Lanjut ke Review →</Button>
          </div>
        </SectionCard>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <SectionCard title="Step 2 — Review Sebelum Reset">
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Yang akan dihapus:</p>
            {[
              'Semua produk', 'Semua transaksi & transaction items',
              'Stok harian & stock alerts', 'Cash sessions', 'Promosi', 'Audit logs',
              ...(!keepOutlets ? ['Semua outlets'] : []),
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <span>🗑️</span><span>{item}</span>
              </div>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Yang dipertahankan:</p>
              {['User accounts & passwords', ...(keepOutlets ? ['Outlets'] : [])].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <span>✅</span><span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setStep(1)}>← Kembali</Button>
            <Button variant="danger" fullWidth onClick={() => setStep(3)}>Lanjut ke Konfirmasi →</Button>
          </div>
        </SectionCard>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <SectionCard title="Step 3 — Konfirmasi Final">
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl">
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">
                Ketik <code className="font-mono bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded text-xs">RESET ALL DATA</code> untuk melanjutkan
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">Ini langkah terakhir. Setelah ini semua data dihapus permanent.</p>
            </div>

            <Input type="text" label="Ketik konfirmasi" placeholder="RESET ALL DATA"
              value={confirmText} onChange={e => setConfirmText(e.target.value)} fullWidth />

            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setStep(2)} disabled={resetMutation.isPending}>← Kembali</Button>
              <Button variant="danger" fullWidth onClick={handleReset}
                disabled={confirmText !== 'RESET ALL DATA' || resetMutation.isPending}>
                {resetMutation.isPending ? '⏳ Menghapus…' : '🗑️ RESET SEMUA DATA'}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
