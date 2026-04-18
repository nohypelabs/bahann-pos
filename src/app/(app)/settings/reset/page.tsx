'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/Toast'

type Step = 1 | 2 | 3 | 'done'

export default function ResetDataPage() {
  const [step, setStep] = useState<Step>(1)
  const [keepOutlets, setKeepOutlets] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [result, setResult] = useState<Record<string, number> | null>(null)
  const { showToast } = useToast()

  const resetMutation = trpc.admin.resetAllData.useMutation()

  const handleReset = async () => {
    if (confirmText !== 'RESET ALL DATA') return
    try {
      const res = await resetMutation.mutateAsync({
        confirmText: 'RESET ALL DATA',
        keepOutlets,
        keepUsers: true,
      })
      setResult(res.counts)
      setStep('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed'
      showToast(msg, 'error')
    }
  }

  const handleRestart = () => {
    setStep(1)
    setConfirmText('')
    setResult(null)
    setKeepOutlets(true)
  }

  if (step === 'done' && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reset Complete</h1>
          <p className="text-gray-600 dark:text-gray-400">System data has been wiped. Ready for new customer setup.</p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Reset Successful</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 mb-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Data yang dihapus:</p>
              {Object.entries(result).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-bold text-red-600">{count} records</span>
                </div>
              ))}
            </div>
            <Button variant="primary" fullWidth onClick={handleRestart}>
              Kembali ke Halaman Reset
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reset System Data</h1>
        <p className="text-gray-600 dark:text-gray-400">Hapus semua data operasional untuk setup customer baru</p>
      </div>

      {/* Warning Banner */}
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl">
        <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">⚠️ PERHATIAN — Aksi ini tidak bisa dibatalkan!</p>
        <p className="text-xs text-red-600 dark:text-red-400">
          Semua produk, transaksi, stok, dan data operasional akan dihapus permanen.
          User accounts dan (opsional) outlets bisa dipertahankan.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step === s
                ? 'bg-red-600 text-white'
                : (step as number) > s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {(step as number) > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`h-1 w-12 rounded ${(step as number) > s ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {step === 1 ? 'Pilih opsi' : step === 2 ? 'Review' : 'Konfirmasi'}
        </span>
      </div>

      {/* Step 1: Options */}
      {step === 1 && (
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Step 1 — Pilih Opsi Reset</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Data yang SELALU dihapus:</p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 pl-4">
                <li>• Semua produk</li>
                <li>• Semua transaksi & transaction items</li>
                <li>• Stok harian (daily stock)</li>
                <li>• Stock alerts</li>
                <li>• Cash sessions</li>
                <li>• Promosi</li>
                <li>• Audit logs</li>
              </ul>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Opsi tambahan:</p>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={keepOutlets}
                    onChange={(e) => setKeepOutlets(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pertahankan Outlets</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Outlet tidak dihapus (biasanya perlu diisi ulang sesuai lokasi customer)</p>
                  </div>
                </label>

                <div className="mt-2 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 opacity-60">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked disabled className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pertahankan User Accounts</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">User selalu dipertahankan (tidak bisa dihapus via reset)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button variant="danger" fullWidth onClick={() => setStep(2)}>
                Lanjut ke Review →
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Step 2 — Review Sebelum Reset</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 mb-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yang akan dihapus:</p>
              {[
                'Semua produk',
                'Semua transaksi & transaction items',
                'Stok harian & stock alerts',
                'Cash sessions',
                'Promosi',
                'Audit logs',
                ...(!keepOutlets ? ['Semua outlets'] : []),
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <span>🗑️</span>
                  <span>{item}</span>
                </div>
              ))}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yang dipertahankan:</p>
                {[
                  'User accounts & passwords',
                  ...(keepOutlets ? ['Outlets'] : []),
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 mt-1">
                    <span>✅</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setStep(1)}>
                ← Kembali
              </Button>
              <Button variant="danger" fullWidth onClick={() => setStep(3)}>
                Lanjut ke Konfirmasi →
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Type confirmation */}
      {step === 3 && (
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Step 3 — Konfirmasi Final</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl">
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-2">
                Ketik <span className="font-mono bg-red-100 dark:bg-red-900 px-1 rounded">RESET ALL DATA</span> untuk melanjutkan
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Ini adalah langkah terakhir. Setelah ini semua data akan dihapus permanent.
              </p>
            </div>

            <Input
              type="text"
              label="Ketik konfirmasi"
              placeholder="RESET ALL DATA"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              fullWidth
            />

            <div className="flex gap-3 pt-6">
              <Button variant="outline" fullWidth onClick={() => setStep(2)} disabled={resetMutation.isPending}>
                ← Kembali
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleReset}
                disabled={confirmText !== 'RESET ALL DATA' || resetMutation.isPending}
              >
                {resetMutation.isPending ? '⏳ Menghapus data...' : '🗑️ RESET SEMUA DATA'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
