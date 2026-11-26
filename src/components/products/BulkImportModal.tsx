'use client'

import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { parseCatalog, type CatalogRow, type ParsedCatalog } from '@/lib/products/catalogImport'
import { friendlyError } from '@/lib/errors/friendlyError'

interface BulkImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

const BATCH = 200
const PREVIEW_LIMIT = 300

type Outcome = { row: number; sku: string | null; status: 'created' | 'updated' | 'skipped' | 'failed'; reason?: string; detail?: string }

const TEMPLATE_HEADER = ['SKU', 'Nama Barang', 'Jenis', 'Kategori', 'Harga Jual', 'Harga Modal', 'Barcode', 'Stok Awal']

async function downloadTemplate() {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.aoa_to_sheet([
    TEMPLATE_HEADER,
    ['OLI-001', 'Oli Mesin 0.8L', 'Sparepart', 'Oli', 55000, 45000, '8991234567890', 20],
    ['', 'Busi Standar', 'Sparepart', 'Kelistrikan', 25000, 18000, '', 12],
    ['', 'Jasa Servis Ringan', 'Jasa', 'Jasa', 50000, '', '', ''],
  ])
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 10 }]
  // Barcode as text, so Excel keeps every digit.
  for (let r = 1; r <= 3; r++) {
    const cell = ws[utils.encode_cell({ r, c: 6 })]
    if (cell) { cell.t = 's'; cell.z = '@' }
  }
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Produk')
  writeFile(wb, 'template-import-produk.xlsx')
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<{ name: string; data: unknown[][]; firstRow: number }[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [existing, setExisting] = useState<'skip' | 'update'>('skip')
  const [chosenOutlet, setChosenOutlet] = useState('')
  const [onlyProblems, setOnlyProblems] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [stocked, setStocked] = useState(0)

  const { data: outletsResponse } = trpc.outlets.getAll.useQuery()
  const outlets = outletsResponse?.outlets ?? []
  const outletId = chosenOutlet || outlets[0]?.id || ''
  const importCatalog = trpc.products.importCatalog.useMutation()

  const parsed: ParsedCatalog | null = useMemo(
    () => (sheets[sheetIndex] ? parseCatalog(sheets[sheetIndex].data, sheets[sheetIndex].firstRow) : null),
    [sheets, sheetIndex],
  )
  const rows = parsed?.rows ?? []
  const valid = rows.filter((r) => r.errors.length === 0)
  const invalid = rows.filter((r) => r.errors.length > 0)
  const withWarnings = rows.filter((r) => r.warnings.length > 0)
  const autoSku = valid.filter((r) => !r.sku).length
  const withStock = valid.filter((r) => (r.initialStock ?? 0) > 0 && r.kind !== 'SERVICE').length
  const shown = (onlyProblems ? rows.filter((r) => r.errors.length || r.warnings.length) : rows).slice(0, PREVIEW_LIMIT)

  const issueText = (code: string) => t(`products.import.issue.${code}`)

  const processFile = async (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      showToast(t('products.import.badFile'), 'error')
      return
    }
    const { read, utils } = await import('xlsx')
    const wb = read(await file.arrayBuffer(), { type: 'array' })
    // Blank rows are kept and the used range's first row recorded, so row numbers
    // match what the user sees in Excel.
    const all = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name]
      return {
        name,
        data: utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: true, blankrows: true }),
        firstRow: ws['!ref'] ? utils.decode_range(ws['!ref']).s.r + 1 : 1,
      }
    }).filter((s) => s.data.length > 0)
    if (all.length === 0) {
      showToast(t('products.import.empty'), 'error')
      return
    }
    // Start on the first sheet that has a recognisable header.
    const first = Math.max(0, all.findIndex((s) => parseCatalog(s.data, s.firstRow) !== null))
    setFileName(file.name)
    setSheets(all)
    setSheetIndex(first)
    setStep('preview')
  }

  const runImport = async () => {
    setStep('importing')
    setProgress(0)
    const results: Outcome[] = []
    let stockCount = 0
    try {
      for (let i = 0; i < valid.length; i += BATCH) {
        const batch = valid.slice(i, i + BATCH)
        const res = await importCatalog.mutateAsync({
          outletId: withStock > 0 ? outletId : undefined,
          existing,
          rows: batch.map((r) => ({
            row: r.row,
            sku: r.sku,
            name: r.name,
            kind: r.kind,
            category: r.category,
            price: r.price,
            costPrice: r.costPrice,
            barcode: r.barcode,
            // A service never holds stock.
            initialStock: r.kind === 'SERVICE' ? null : r.initialStock,
          })),
        })
        results.push(
          ...res.created.map((c) => ({ row: c.row, sku: c.sku, status: 'created' as const })),
          ...res.updated.map((c) => ({ row: c.row, sku: c.sku, status: 'updated' as const })),
          ...res.skipped.map((c) => ({ row: c.row, sku: c.sku, status: 'skipped' as const, reason: c.reason })),
          ...res.failed.map((c) => ({ row: c.row, sku: c.sku, status: 'failed' as const, reason: c.reason, detail: c.detail })),
        )
        stockCount += res.stocked
        setProgress(Math.min(valid.length, i + batch.length))
      }
    } catch (err) {
      showToast(friendlyError(err, t('products.import.failed')), 'error')
    }
    setOutcomes(results.sort((a, b) => a.row - b.row))
    setStocked(stockCount)
    setStep('done')
  }

  /** Rows that need fixing: errors found in the file and rows the server refused. */
  const downloadReport = async () => {
    const { utils, writeFile } = await import('xlsx')
    const lines: (string | number)[][] = [[t('products.import.report.row'), 'SKU', t('products.import.report.name'), t('products.import.report.problem')]]
    for (const r of invalid) lines.push([r.row, r.sku ?? '', r.name, r.errors.map(issueText).join('; ')])
    for (const o of outcomes.filter((x) => x.status === 'failed' || x.status === 'skipped')) {
      const source = rows.find((r) => r.row === o.row)
      lines.push([o.row, o.sku ?? '', source?.name ?? '', t(`products.import.reason.${o.reason}`) + (o.detail && o.reason === 'BARCODE_TAKEN' ? ` (${o.detail})` : '')])
    }
    const wb = utils.book_new()
    utils.book_append_sheet(wb, utils.aoa_to_sheet(lines), 'Perlu dicek')
    writeFile(wb, `hasil-impor-${fileName.replace(/\.[^.]+$/, '')}.xlsx`)
  }

  const count = (status: Outcome['status']) => outcomes.filter((o) => o.status === status).length

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('products.import.title')}</CardTitle>
            <button onClick={onClose} aria-label={t('common.close')} className="text-base md:text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
          </div>
        </CardHeader>

        <CardBody className="overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{t('products.import.templateTitle')}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{t('products.import.templateBody')}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void downloadTemplate()}>{t('products.import.downloadTemplate')}</Button>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) void processFile(f) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{t('products.import.drop')}</p>
                <p className="text-xs text-gray-400 mt-2">{t('products.import.formats')}</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                aria-label={t('products.import.chooseFile')}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); e.target.value = '' }}
              />

              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-semibold text-gray-700 dark:text-gray-300">{t('products.import.columnsTitle')}</p>
                <p>{t('products.import.columnsBody')}</p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500">{fileName}</span>
                {sheets.length > 1 && (
                  <select
                    value={sheetIndex}
                    onChange={(e) => setSheetIndex(Number(e.target.value))}
                    aria-label={t('products.import.sheet')}
                    className="px-2 py-1 rounded-lg border border-gray-300 text-sm"
                  >
                    {sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
                  </select>
                )}
              </div>

              {!parsed ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{t('products.import.noHeader')}</p>
              ) : (
                <>
                  <div role="status" className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{t('products.import.headerAt').replace('{row}', String(parsed.headerRow))}</span>
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">{t('products.import.ready').replace('{n}', String(valid.length))}</span>
                    {invalid.length > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{t('products.import.invalid').replace('{n}', String(invalid.length))}</span>}
                    {withWarnings.length > 0 && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">{t('products.import.warnings').replace('{n}', String(withWarnings.length))}</span>}
                    {autoSku > 0 && <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">{t('products.import.autoSku').replace('{n}', String(autoSku))}</span>}
                    {withStock > 0 && <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-800">{t('products.import.withStock').replace('{n}', String(withStock))}</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <fieldset className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-1">
                      <legend className="px-1 text-xs font-semibold text-gray-600">{t('products.import.existingTitle')}</legend>
                      <label className="flex items-start gap-2">
                        <input type="radio" name="existing" checked={existing === 'skip'} onChange={() => setExisting('skip')} />
                        <span>{t('products.import.existingSkip')}</span>
                      </label>
                      <label className="flex items-start gap-2">
                        <input type="radio" name="existing" checked={existing === 'update'} onChange={() => setExisting('update')} />
                        <span>{t('products.import.existingUpdate')}</span>
                      </label>
                    </fieldset>
                    {withStock > 0 && (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-2">
                        {outlets.length > 1 ? (
                          <Select
                            label={t('products.import.stockOutlet')}
                            value={outletId}
                            onChange={(e) => setChosenOutlet(e.target.value)}
                            options={outlets.map((o) => ({ value: o.id, label: o.name }))}
                            fullWidth
                          />
                        ) : (
                          <p>{t('products.import.stockOutletOne').replace('{outlet}', outlets[0]?.name ?? '')}</p>
                        )}
                        <p className="text-xs text-gray-500">{t('products.import.stockNote')}</p>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
                    {t('products.import.onlyProblems')}
                  </label>

                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="text-left px-2 py-2">{t('products.import.report.row')}</th>
                          <th className="text-left px-2 py-2">SKU</th>
                          <th className="text-left px-2 py-2">{t('products.import.report.name')}</th>
                          <th className="text-left px-2 py-2">{t('products.import.col.kind')}</th>
                          <th className="text-left px-2 py-2">{t('products.import.col.category')}</th>
                          <th className="text-right px-2 py-2">{t('products.import.col.price')}</th>
                          <th className="text-right px-2 py-2">{t('products.import.col.cost')}</th>
                          <th className="text-left px-2 py-2">Barcode</th>
                          <th className="text-right px-2 py-2">{t('products.import.col.stock')}</th>
                          <th className="text-left px-2 py-2">{t('products.import.col.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((r: CatalogRow) => (
                          <tr key={r.row} className={`border-t border-gray-100 dark:border-gray-700 ${r.errors.length ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="px-2 py-1.5 text-xs text-gray-400">{r.row}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{r.sku ?? <span className="text-blue-600">{t('products.import.auto')}</span>}</td>
                            <td className="px-2 py-1.5">{r.name}</td>
                            <td className="px-2 py-1.5 text-xs">{r.kind ? t(`products.import.kind.${r.kind}`) : '–'}</td>
                            <td className="px-2 py-1.5 text-xs text-gray-500">{r.category ?? '–'}</td>
                            <td className="px-2 py-1.5 text-right">{r.price != null ? formatCurrency(r.price) : '–'}</td>
                            <td className="px-2 py-1.5 text-right text-gray-500">{r.costPrice != null ? formatCurrency(r.costPrice) : '–'}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{r.barcode ?? '–'}</td>
                            <td className="px-2 py-1.5 text-right">{r.initialStock ?? '–'}</td>
                            <td className="px-2 py-1.5 text-xs">
                              {r.errors.length > 0
                                ? <span className="text-red-700">{r.errors.map(issueText).join('; ')}</span>
                                : r.warnings.length > 0
                                  ? <span className="text-amber-700">{r.warnings.map(issueText).join('; ')}</span>
                                  : <span className="text-green-700">OK</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > shown.length && !onlyProblems && (
                    <p className="text-xs text-gray-500">{t('products.import.previewLimit').replace('{shown}', String(shown.length)).replace('{n}', String(rows.length))}</p>
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setStep('upload'); setSheets([]) }}>{t('products.import.changeFile')}</Button>
                {invalid.length > 0 && <Button variant="outline" onClick={() => void downloadReport()}>{t('products.import.downloadReport')}</Button>}
                <Button variant="primary" onClick={() => void runImport()} disabled={valid.length === 0 || (withStock > 0 && !outletId)} className="ml-auto">
                  {t('products.import.run').replace('{n}', String(valid.length))}
                </Button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-10 space-y-3 text-center">
              <p className="text-sm font-semibold">{t('products.import.progress').replace('{done}', String(progress)).replace('{n}', String(valid.length))}</p>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={valid.length} aria-valuenow={progress}>
                <div className="h-full bg-green-500 transition-all" style={{ width: `${valid.length ? (progress / valid.length) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-gray-500">{t('products.import.dontClose')}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div role="status" className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                {([
                  ['created', 'bg-green-50 text-green-800'],
                  ['updated', 'bg-blue-50 text-blue-800'],
                  ['skipped', 'bg-gray-50 text-gray-700'],
                  ['failed', 'bg-red-50 text-red-800'],
                ] as const).map(([status, cls]) => (
                  <div key={status} className={`rounded-xl p-3 ${cls}`}>
                    <p className="text-2xl font-bold">{count(status)}</p>
                    <p className="text-xs">{t(`products.import.result.${status}`)}</p>
                  </div>
                ))}
                <div className="rounded-xl p-3 bg-teal-50 text-teal-800">
                  <p className="text-2xl font-bold">{stocked}</p>
                  <p className="text-xs">{t('products.import.result.stocked')}</p>
                </div>
              </div>
              {invalid.length > 0 && <p className="text-sm text-red-700">{t('products.import.notImported').replace('{n}', String(invalid.length))}</p>}

              {outcomes.some((o) => o.status === 'failed' || o.status === 'skipped') && (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 text-sm">
                  {outcomes.filter((o) => o.status === 'failed' || o.status === 'skipped').map((o) => (
                    <p key={`${o.row}-${o.status}`} className="px-3 py-1.5 border-b border-gray-100">
                      {t('products.import.report.row')} {o.row} · <span className="font-mono">{o.sku ?? '–'}</span> · {t(`products.import.reason.${o.reason}`)}
                      {o.reason === 'BARCODE_TAKEN' && o.detail ? ` (${o.detail})` : ''}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {(invalid.length > 0 || outcomes.some((o) => o.status !== 'created' && o.status !== 'updated')) && (
                  <Button variant="outline" onClick={() => void downloadReport()}>{t('products.import.downloadReport')}</Button>
                )}
                <Button variant="secondary" onClick={() => { setStep('upload'); setSheets([]); setOutcomes([]) }}>{t('products.import.again')}</Button>
                <Button variant="primary" onClick={onSuccess} className="ml-auto">{t('products.import.finish')}</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
