'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'

interface ReportExporterProps {
  outletId?: string
  days: number
  onClose: () => void
}

export default function ReportExporter({ outletId, days, onClose }: ReportExporterProps) {
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, error: fetchError } = trpc.dashboard.exportReport.useQuery(
    { outletId: outletId || undefined, days },
    { retry: false }
  )

  const handleExport = async () => {
    if (!data) return
    setIsExporting(true)
    setError(null)

    try {
      if (format === 'pdf') {
        const { generatePDF } = await import('@/lib/exporters/pdf-generator')
        await generatePDF(data)
      } else {
        const { generateCSV } = await import('@/lib/exporters/csv-generator')
        await generateCSV(data)
      }
      onClose()
    } catch {
      setError('Export gagal. Coba lagi.')
    } finally {
      setIsExporting(false)
    }
  }

  if (fetchError) {
    return (
      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          🔒 {fetchError.message}
        </p>
        <a
          href="/settings/subscriptions"
          className="text-sm text-amber-700 dark:text-amber-300 underline mt-1 inline-block"
        >
          Upgrade sekarang →
        </a>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-gray-200 dark:border-gray-700">
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">Memuat data export...</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <Select
              label="Format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
              options={[
                { value: 'pdf', label: '📄 PDF Document' },
                { value: 'csv', label: '📊 CSV Spreadsheet' },
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleExport} disabled={isExporting || !data}>
              {isExporting ? 'Exporting...' : 'Download'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={isExporting}>
              Batal
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Export includes: Sales trends, top products, and performance metrics
      </p>
    </div>
  )
}
