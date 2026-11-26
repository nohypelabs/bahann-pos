// A4 label sheets as a PDF: the same millimetre layout as the printed sheets (sheets.ts), with the
// barcode drawn as vector bars so it stays sharp at any zoom and scans reliably.
import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'
import { isValidEan13 } from '@/domain/catalog/productCodes'
import { placeLabels, type LabelSheet } from './sheets'

export interface PdfLabel {
  name: string
  /** Barcode, or the SKU when the product has none. */
  code: string
  /** Formatted price, or null to leave it off. */
  price: string | null
}

/** Millimetres per typographic point. */
const PT = 25.4 / 72
/** White space each side of the bars, in modules; scanners need it (EAN-13 asks for 7 and 11). */
const QUIET_MODULES = 10

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** The bar pattern of a code: '1' black module, '0' white. EAN-13 when the code is one, else Code 128. */
export function barcodeModules(code: string): string {
  const target: { encodings?: { data: string }[] } = {}
  JsBarcode(target, code, { format: isValidEan13(code) ? 'EAN13' : 'CODE128' })
  // JsBarcode pads EAN-13 with white for the leading digit; trim it so the bars sit centred
  // between equal quiet zones.
  return (target.encodings ?? []).map((e) => e.data).join('').replace(/^0+|0+$/g, '')
}

/** At most `maxLines` lines that fit `width`; the last one ends in "…" when the name is cut. */
function fitLines(doc: jsPDF, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = doc.splitTextToSize(text, width)
  if (lines.length <= maxLines) return lines
  let last = lines[maxLines - 1]
  while (last.length > 1 && doc.getTextWidth(`${last}…`) > width) last = last.slice(0, -1)
  return [...lines.slice(0, maxLines - 1), `${last.trimEnd()}…`]
}

export function buildLabelPdf(labels: PdfLabel[], sheet: LabelSheet, options: { skip?: number; outline?: boolean } = {}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const pad = clamp(sheet.labelWidth * 0.045, 1.2, 2)
  const nameSize = clamp(sheet.labelHeight * 0.26, 5, 9)
  const priceSize = nameSize + 1
  const codeSize = clamp(nameSize - 1.5, 4.5, 7.5)
  const modulesCache = new Map<string, string>()

  let page = 0
  for (const { item, page: labelPage, x, y } of placeLabels(labels, sheet, options.skip ?? 0)) {
    while (page < labelPage) { doc.addPage(); page += 1 }
    const w = sheet.labelWidth, h = sheet.labelHeight
    const inner = w - 2 * pad

    if (options.outline) {
      doc.setDrawColor(160)
      doc.setLineWidth(0.15)
      doc.setLineDashPattern([1, 1], 0)
      doc.rect(x, y, w, h)
      doc.setLineDashPattern([], 0)
    }

    doc.setTextColor(0)
    let cursor = y + pad

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(nameSize)
    const nameLines = fitLines(doc, item.name, inner, 2)
    doc.text(nameLines, x + pad, cursor, { baseline: 'top', lineHeightFactor: 1.15 })
    cursor += nameLines.length * nameSize * PT * 1.15

    if (item.price !== null) {
      doc.setFontSize(priceSize)
      doc.text(item.price, x + pad, cursor, { baseline: 'top' })
      cursor += priceSize * PT * 1.2
    }

    // Bars fill what is left above the code text.
    const codeHeight = codeSize * PT * 1.15
    const barTop = cursor + 0.6
    const barBottom = y + h - pad - codeHeight
    const barHeight = Math.max(2.5, barBottom - barTop)

    if (!modulesCache.has(item.code)) modulesCache.set(item.code, barcodeModules(item.code))
    const modules = modulesCache.get(item.code)!
    const moduleWidth = inner / (modules.length + 2 * QUIET_MODULES)
    const left = x + pad + QUIET_MODULES * moduleWidth
    doc.setFillColor(0, 0, 0)
    for (let i = 0; i < modules.length; ) {
      if (modules[i] !== '1') { i += 1; continue }
      let run = 1
      while (modules[i + run] === '1') run += 1
      doc.rect(left + i * moduleWidth, barTop, run * moduleWidth, barHeight, 'F')
      i += run
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(codeSize)
    doc.text(item.code, x + w / 2, barTop + barHeight + 0.3, { baseline: 'top', align: 'center' })
  }
  return doc
}
