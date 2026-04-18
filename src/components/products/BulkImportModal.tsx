'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/Toast'

interface ParsedRow {
  sku: string
  name: string
  category?: string
  price?: number
  _row: number
  _errors: string[]
}

interface BulkImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

function downloadTemplate() {
  import('xlsx').then(({ utils, writeFile }) => {
    const ws = utils.aoa_to_sheet([
      ['SKU', 'Nama Produk', 'Kategori', 'Harga (Rp)'],
      ['PROD-001', 'Indomie Goreng', 'Mie Instan', 3500],
      ['PROD-002', 'Aqua 600ml', 'Minuman', 5000],
      ['PROD-003', 'Teh Botol Sosro', 'Minuman', 6000],
    ])
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Produk')
    writeFile(wb, 'template-import-produk.xlsx')
  })
}

function parseRows(rawRows: Record<string, unknown>[]): ParsedRow[] {
  return rawRows.map((row, idx) => {
    const errors: string[] = []

    const sku = String(row['SKU'] ?? row['sku'] ?? '').trim()
    const name = String(row['Nama Produk'] ?? row['nama_produk'] ?? row['name'] ?? '').trim()
    const category = String(row['Kategori'] ?? row['kategori'] ?? row['category'] ?? '').trim() || undefined
    const rawPrice = row['Harga (Rp)'] ?? row['harga'] ?? row['price'] ?? ''
    const price = rawPrice !== '' ? Number(rawPrice) : undefined

    if (!sku) errors.push('SKU wajib diisi')
    if (!name) errors.push('Nama Produk wajib diisi')
    if (price !== undefined && (isNaN(price) || price <= 0)) errors.push('Harga harus berupa angka positif')

    return { sku, name, category, price: price && !isNaN(price) && price > 0 ? price : undefined, _row: idx + 2, _errors: errors }
  })
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<{ inserted: number; skipped: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const bulkCreate = trpc.products.bulkCreate.useMutation()

  const validRows = rows.filter((r) => r._errors.length === 0)
  const invalidRows = rows.filter((r) => r._errors.length > 0)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showToast('File harus berformat .xlsx, .xls, atau .csv', 'error')
      return
    }
    setFileName(file.name)

    const { read, utils } = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    if (raw.length === 0) {
      showToast('File kosong atau tidak ada data', 'error')
      return
    }

    setRows(parseRows(raw))
    setStep('preview')
  }, [showToast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (validRows.length === 0) return
    try {
      const res = await bulkCreate.mutateAsync({
        products: validRows.map(({ sku, name, category, price }) => ({
          sku, name, category, price,
        })),
      })
      setResult(res)
      setStep('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import gagal'
      showToast(msg, 'error')
    }
  }

  const formatCurrency = (n?: number) =>
    n ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n) : '-'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📥 Import Produk dari Excel</CardTitle>
            <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
          </div>
        </CardHeader>

        <CardBody className="overflow-y-auto flex-1">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Belum punya template?</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Download template Excel dengan format yang benar</p>
                </div>
                <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                  ⬇️ Download Template
                </Button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }
                `}
              >
                <div className="text-5xl mb-3">📂</div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">Drag & drop file di sini</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">atau klik untuk pilih file</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Format: .xlsx, .xls, .csv — maks 500 baris</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />

              {/* Format guide */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-semibold text-gray-700 dark:text-gray-300">Kolom yang dikenali:</p>
                <p><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">SKU</span> — wajib</p>
                <p><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">Nama Produk</span> — wajib</p>
                <p><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">Kategori</span> — opsional</p>
                <p><span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">Harga (Rp)</span> — opsional, angka</p>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500 dark:text-gray-400">📄 {fileName}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                  ✅ {validRows.length} siap import
                </span>
                {invalidRows.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                    ❌ {invalidRows.length} baris error (akan dilewati)
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-semibold w-10">#</th>
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-semibold">SKU</th>
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-semibold">Nama Produk</th>
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-semibold">Kategori</th>
                      <th className="text-right px-3 py-2 text-gray-600 dark:text-gray-300 font-semibold">Harga</th>
                      <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row._row}
                        className={`border-t border-gray-100 dark:border-gray-700 ${
                          row._errors.length > 0
                            ? 'bg-red-50 dark:bg-red-900/10'
                            : 'bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-400 text-xs">{row._row}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">{row.sku || <span className="text-red-400 italic">kosong</span>}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{row.name || <span className="text-red-400 italic">kosong</span>}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{row.category || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">{formatCurrency(row.price)}</td>
                        <td className="px-3 py-2">
                          {row._errors.length === 0 ? (
                            <span className="text-green-600 dark:text-green-400 text-xs font-medium">✅ OK</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs" title={row._errors.join(', ')}>
                              ❌ {row._errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setStep('upload'); setRows([]) }} fullWidth>
                  ← Ganti File
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  fullWidth
                  disabled={validRows.length === 0 || bulkCreate.isPending}
                >
                  {bulkCreate.isPending ? 'Mengimport...' : `Import ${validRows.length} Produk`}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="text-center py-8 space-y-4">
              <div className="text-6xl">{result.inserted > 0 ? '🎉' : '⚠️'}</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Selesai!</h3>
              <div className="flex justify-center gap-4">
                <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{result.inserted}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Produk ditambahkan</p>
                </div>
                {result.skipped.length > 0 && (
                  <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{result.skipped.length}</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Dilewati (duplikat SKU)</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-center pt-4">
                <Button variant="secondary" onClick={() => { setStep('upload'); setRows([]); setResult(null) }}>
                  Import Lagi
                </Button>
                <Button variant="primary" onClick={onSuccess}>
                  Selesai
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
