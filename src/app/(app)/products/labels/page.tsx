'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import JsBarcode from 'jsbarcode'
import { ArrowLeft, Download, Printer, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { printHtmlDocument } from '@/lib/print/printHtmlDocument'
import { isValidEan13 } from '@/domain/catalog/productCodes'
import { A4, CUSTOM_SHEET, LABEL_SELECTION_KEY, LABEL_SHEETS, labelsPerSheet, placeLabels, sheetFits, type LabelSheet } from '@/lib/labels/sheets'

interface LabelProduct { id: string; name: string; sku: string; barcode: string | null; price: number }

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** The code a label carries: the product's barcode, or its SKU when it has none. */
const labelCode = (p: LabelProduct) => p.barcode || p.sku

function barcodeSvg(code: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, code, {
    format: isValidEan13(code) ? 'EAN13' : 'CODE128',
    // Quiet zones beside the bars; handheld scanners need them.
    margin: 0,
    marginLeft: 10,
    marginRight: 14,
    height: 40,
    width: 2,
    fontSize: 14,
    textMargin: 1,
    displayValue: true,
  })
  // Scale to the box it is printed in; bars keep their proportions horizontally.
  const w = svg.getAttribute('width'), h = svg.getAttribute('height')
  svg.setAttribute('viewBox', `0 0 ${parseFloat(w ?? '0')} ${parseFloat(h ?? '0')}`)
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('style', 'width:100%;height:100%;display:block')
  return svg.outerHTML
}

/** HTML for every A4 page of labels, sized in millimetres. */
function renderPages(products: LabelProduct[], counts: Record<string, number>, sheet: LabelSheet, skip: number, showPrice: boolean, outline: boolean): string[] {
  const items = products.flatMap((p) => Array.from({ length: Math.max(0, counts[p.id] ?? 1) }, () => p))
  const placed = placeLabels(items, sheet, skip)
  const pageCount = placed.length ? placed[placed.length - 1].page + 1 : 0
  const svgCache = new Map<string, string>()
  const nameSize = Math.max(5, Math.min(9, sheet.labelHeight * 0.26))
  return Array.from({ length: pageCount }, (_, page) => {
    const labels = placed.filter((l) => l.page === page).map(({ item, x, y }) => {
      const code = labelCode(item)
      if (!svgCache.has(code)) svgCache.set(code, barcodeSvg(code))
      return `<div style="position:absolute;left:${x}mm;top:${y}mm;width:${sheet.labelWidth}mm;height:${sheet.labelHeight}mm;box-sizing:border-box;padding:1.2mm 1.8mm;overflow:hidden;display:flex;flex-direction:column;font-family:Arial,sans-serif;color:#000;${outline ? 'outline:0.2mm dashed #999;' : ''}">
        <div style="font-size:${nameSize}pt;line-height:1.15;font-weight:600;max-height:${nameSize * 2.4}pt;overflow:hidden">${escapeHtml(item.name)}</div>
        ${showPrice ? `<div style="font-size:${nameSize + 1}pt;font-weight:800;line-height:1.2">${escapeHtml(formatCurrency(item.price))}</div>` : ''}
        <div style="flex:1;min-height:0;margin-top:0.6mm">${svgCache.get(code)}</div>
      </div>`
    }).join('')
    return `<div style="position:relative;width:${A4.width}mm;height:${A4.height}mm;overflow:hidden;page-break-after:always;background:#fff">${labels}</div>`
  })
}

export default function ProductLabelsPage() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  // The products page hands over its selection; read once.
  const [ids, setIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(sessionStorage.getItem(LABEL_SELECTION_KEY) ?? '[]') } catch { return [] }
  })
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [sheetId, setSheetId] = useState(LABEL_SHEETS[0].id)
  const [custom, setCustom] = useState<LabelSheet>(CUSTOM_SHEET)
  // What was typed in the custom-size fields, so "52," survives until the "5" arrives.
  const [customText, setCustomText] = useState<Partial<Record<keyof LabelSheet, string>>>({})
  const [skip, setSkip] = useState(0)
  const [showPrice, setShowPrice] = useState(true)
  const [outline, setOutline] = useState(false)
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const selected = trpc.products.getForLabels.useQuery({ ids }, { enabled: ids.length > 0 })
  const results = trpc.products.getAll.useQuery({ search: term, limit: 8 }, { enabled: term.length >= 2 })
  const products = useMemo(() => {
    const byId = new Map((selected.data ?? []).map((p) => [p.id, p]))
    return ids.map((id) => byId.get(id)).filter((p): p is LabelProduct => !!p)
  }, [selected.data, ids])

  const sheet = sheetId === 'custom' ? custom : LABEL_SHEETS.find((s) => s.id === sheetId)!
  const fits = sheetFits(sheet)
  const total = products.reduce((s, p) => s + (counts[p.id] ?? 1), 0)
  const perSheet = labelsPerSheet(sheet)
  const sheets = total ? Math.ceil((total + Math.min(skip, perSheet - 1)) / perSheet) : 0
  const withoutBarcode = products.filter((p) => !p.barcode).length

  // Barcodes are drawn as SVG through the DOM, so the preview only exists in the browser.
  const previewHtml = useMemo(
    () => (typeof document === 'undefined' || !fits || products.length === 0
      ? ''
      : renderPages(products, counts, sheet, skip, showPrice, true)[0] ?? ''),
    [products, counts, sheet, skip, showPrice, fits],
  )

  const add = (id: string) => {
    if (!ids.includes(id)) setIds([...ids, id])
    setSearch('')
  }

  const print = async () => {
    const pages = renderPages(products, counts, sheet, skip, showPrice, outline)
    const ok = await printHtmlDocument({
      title: t('products.labels.title'),
      bodyHtml: pages.join(''),
      pageStyle: '@page { size: A4; margin: 0; } body { margin: 0; padding: 0; background: white; }',
    })
    if (!ok) showToast(t('products.labels.printFailed'), 'error')
  }

  const [pdfBusy, setPdfBusy] = useState(false)
  const downloadPdf = async () => {
    setPdfBusy(true)
    try {
      // jsPDF is large; load it only when a PDF is asked for.
      const { buildLabelPdf } = await import('@/lib/labels/labelPdf')
      const labels = products.flatMap((p) => Array.from({ length: Math.max(0, counts[p.id] ?? 1) }, () => ({
        name: p.name,
        code: labelCode(p),
        // jsPDF's standard fonts have no narrow no-break space, which Intl puts in "Rp 25.000".
        price: showPrice ? formatCurrency(p.price).replace(/\s/g, ' ') : null,
      })))
      const doc = buildLabelPdf(labels, sheet, { skip, outline })
      const now = new Date()
      const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      doc.save(`label-produk-${day}.pdf`)
    } catch {
      showToast(t('products.labels.pdfFailed'), 'error')
    } finally {
      setPdfBusy(false)
    }
  }

  const num = (v: string) => Number(v.replace(',', '.')) || 0
  const customField = (key: keyof LabelSheet, label: string) => (
    <Input
      label={label}
      value={customText[key] ?? String(custom[key]).replace('.', ',')}
      inputMode="decimal"
      onChange={(e) => {
        const text = e.target.value.replace(/[^\d.,]/g, '')
        setCustomText({ ...customText, [key]: text })
        setCustom({ ...custom, [key]: key === 'columns' || key === 'rows' ? Math.floor(num(text)) : num(text) })
      }}
      fullWidth
    />
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-[#0F5F56]"><ArrowLeft className="w-4 h-4" /> {t('products.labels.back')}</Link>
      <PageHeader
        title={t('products.labels.title')}
        subtitle={t('products.labels.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadPdf} disabled={!total || !fits || pdfBusy}>
              <Download className="w-4 h-4 mr-1" /> {pdfBusy ? t('common.loading') : t('products.labels.pdf')}
            </Button>
            <Button onClick={print} disabled={!total || !fits}><Printer className="w-4 h-4 mr-1" /> {t('products.labels.print')}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={t('products.labels.items')}>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('products.labels.search')}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>
          {term.length >= 2 && results.data?.products.map((p) => (
            <button key={p.id} onClick={() => add(p.id)} className="block w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              {p.name} <span className="text-gray-400">{p.sku}</span>
            </button>
          ))}
          {products.length === 0 && <p className="text-sm text-gray-400">{t('products.labels.empty')}</p>}
          {withoutBarcode > 0 && (
            <p className="mb-2 text-xs text-amber-700">{t('products.labels.noBarcode').replace('{n}', String(withoutBarcode))}</p>
          )}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {products.map((p) => (
              <div key={p.id} className="py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className={`text-xs font-mono ${p.barcode ? 'text-gray-400' : 'text-amber-600'}`}>{labelCode(p)}</p>
                </div>
                <input type="number" min={0} max={500} value={counts[p.id] ?? 1} aria-label={t('products.labels.copies')}
                  onChange={(e) => setCounts({ ...counts, [p.id]: Math.max(0, Math.min(500, Number(e.target.value) || 0)) })}
                  className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-right text-sm" />
                <button onClick={() => setIds(ids.filter((x) => x !== p.id))} className="p-1.5 text-red-500" aria-label={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('products.labels.paper')}>
          <div className="space-y-3">
            <Select
              label={t('products.labels.sheet')}
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              options={[...LABEL_SHEETS.map((s) => ({ value: s.id, label: s.name })), { value: 'custom', label: t('products.labels.custom') }]}
              fullWidth
            />
            {sheetId === 'custom' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {customField('columns', t('products.labels.columns'))}
                {customField('rows', t('products.labels.rows'))}
                {customField('labelWidth', t('products.labels.width'))}
                {customField('labelHeight', t('products.labels.height'))}
                {customField('marginTop', t('products.labels.marginTop'))}
                {customField('marginLeft', t('products.labels.marginLeft'))}
                {customField('gapX', t('products.labels.gapX'))}
                {customField('gapY', t('products.labels.gapY'))}
              </div>
            )}
            {!fits && <p className="text-xs text-red-600">{t('products.labels.doesNotFit')}</p>}
            <Input label={t('products.labels.skip')} value={String(skip)} inputMode="numeric"
              onChange={(e) => setSkip(Math.max(0, Math.min(perSheet - 1, Number(e.target.value.replace(/\D/g, '')) || 0)))} fullWidth />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> {t('products.labels.showPrice')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} /> {t('products.labels.outline')}</label>
            <p className="text-sm font-semibold">{t('products.labels.summary').replace('{labels}', String(total)).replace('{sheets}', String(sheets))}</p>
            <p className="text-xs text-gray-500">{t('products.labels.printerHint')}</p>
          </div>
        </SectionCard>
      </div>

      {previewHtml && (
        <SectionCard title={t('products.labels.preview')}>
          <div className="overflow-auto rounded-xl bg-gray-100 dark:bg-gray-800 p-3">
            <div style={{ width: `${A4.width * 0.5}mm`, height: `${A4.height * 0.5}mm` }} className="shadow mx-auto bg-white">
              <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </SectionCard>
      )}

    </div>
  )
}
