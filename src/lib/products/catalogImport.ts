// Reads a product catalogue from a spreadsheet (first rows as arrays, as
// xlsx's sheet_to_json({ header: 1 }) returns them) into rows ready to import.
// Pure: the products page shows the result for review before anything is sent.

export type ImportField = 'sku' | 'name' | 'kind' | 'category' | 'price' | 'costPrice' | 'barcode' | 'initialStock'
export type ImportKind = 'PRODUCT' | 'SERVICE' | 'MENU' | 'PACKAGE'

/** Error and warning codes; the UI turns them into text (products.import.issue.<code>). */
export type ImportIssue =
  | 'NAME_REQUIRED'
  | 'PRICE_INVALID'
  | 'COST_INVALID'
  | 'STOCK_INVALID'
  | 'BARCODE_INVALID'
  | 'BARCODE_SCIENTIFIC'
  | 'KIND_INVALID'
  | 'DUPLICATE_SKU'
  | 'DUPLICATE_BARCODE'
  | 'STOCK_FOR_SERVICE'

export interface CatalogRow {
  /** Spreadsheet row number (1-based), for messages. */
  row: number
  sku: string | null
  name: string
  kind: ImportKind | null
  category: string | null
  price: number | null
  costPrice: number | null
  barcode: string | null
  initialStock: number | null
  errors: ImportIssue[]
  warnings: ImportIssue[]
}

export interface ParsedCatalog {
  headerRow: number
  columns: Partial<Record<ImportField, number>>
  rows: CatalogRow[]
}

/** Header names recognised per field, lower case without punctuation. */
const ALIASES: Record<ImportField, string[]> = {
  sku: ['sku', 'kode', 'kode barang', 'kode produk', 'kode item', 'kode part', 'part number', 'no part', 'nomor part', 'item code'],
  name: ['nama', 'nama produk', 'nama barang', 'nama item', 'nama sparepart', 'produk', 'barang', 'item', 'product', 'name', 'nama produk jasa'],
  kind: ['jenis', 'tipe', 'type', 'jenis item', 'jenis barang', 'tipe item'],
  category: ['kategori', 'category', 'grup', 'group', 'golongan', 'kelompok'],
  price: ['harga jual', 'harga', 'harga rp', 'price', 'harga satuan', 'harga jual rp', 'jual'],
  costPrice: ['harga modal', 'modal', 'hpp', 'harga beli', 'harga pokok', 'cost', 'harga modal rp', 'beli'],
  barcode: ['barcode', 'kode barcode', 'ean', 'upc', 'kode batang'],
  initialStock: ['stok', 'stok awal', 'stock', 'qty', 'jumlah', 'kuantitas', 'stok rp'],
}

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function matchField(header: unknown): ImportField | null {
  const h = norm(header)
  if (!h) return null
  for (const [field, names] of Object.entries(ALIASES) as [ImportField, string[]][]) {
    if (names.includes(h)) return field
  }
  return null
}

/**
 * The first of the top 20 rows that names a product-name column. A shop's own file
 * often has a title or a date above the header.
 */
export function findHeader(rows: unknown[][]): { index: number; columns: Partial<Record<ImportField, number>> } | null {
  for (let index = 0; index < Math.min(rows.length, 20); index++) {
    const columns: Partial<Record<ImportField, number>> = {}
    rows[index].forEach((cell, col) => {
      const field = matchField(cell)
      if (field && columns[field] === undefined) columns[field] = col
    })
    if (columns.name !== undefined && Object.keys(columns).length >= 2) return { index, columns }
  }
  return null
}

/**
 * A money or quantity cell: a number, or text such as "Rp 25.000", "25.000,50",
 * "25,000.50" or "25000". Empty gives null; anything else 'invalid'.
 */
export function parseNumber(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : 'invalid'
  let s = String(value).trim().replace(/^rp\.?/i, '').replace(/\s/g, '')
  if (!s || s === '-') return null
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.') // 25.000,50
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '') // 25,000.50
  else s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 'invalid'
}

/** Barcodes stay text: digits and letters only. A number cell keeps every digit. */
export function parseBarcode(value: unknown): string | null | 'invalid' | 'scientific' {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) return 'invalid'
    return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 })
  }
  const s = String(value).trim()
  if (!s) return null
  // "8,99123E+12" / "8.99E+12": Excel showed a long number in scientific form and
  // the digits are lost; the column has to be formatted as Text.
  if (/^\d+([.,]\d+)?e\+?\d+$/i.test(s)) return 'scientific'
  if (!/^[A-Za-z0-9-]{3,40}$/.test(s)) return 'invalid'
  return s
}

export function parseKind(value: unknown): ImportKind | null | 'invalid' {
  const v = norm(value)
  if (!v) return null
  if (['jasa', 'service', 'layanan', 'servis', 'ongkos', 'ongkos kerja'].includes(v)) return 'SERVICE'
  if (['sparepart', 'spare part', 'barang', 'produk', 'product', 'part', 'onderdil', 'aksesoris', 'oli'].includes(v)) return 'PRODUCT'
  if (['menu', 'makanan', 'minuman'].includes(v)) return 'MENU'
  if (['paket', 'package', 'bundle'].includes(v)) return 'PACKAGE'
  return 'invalid'
}

const text = (value: unknown, max: number) => {
  const s = String(value ?? '').trim()
  return s ? s.slice(0, max) : null
}

/**
 * Reads every non-empty row under the header and checks it. `firstRow` is the
 * spreadsheet row number of sheet[0] (blank rows must be kept), so messages name
 * the row the user sees in Excel.
 */
export function parseCatalog(sheet: unknown[][], firstRow = 1): ParsedCatalog | null {
  const header = findHeader(sheet)
  if (!header) return null
  const { index, columns } = header
  const cell = (r: unknown[], f: ImportField) => (columns[f] === undefined ? undefined : r[columns[f]!])

  const rows: CatalogRow[] = []
  for (let i = index + 1; i < sheet.length; i++) {
    const r = sheet[i] ?? []
    if (r.every((c) => String(c ?? '').trim() === '')) continue

    const errors: ImportIssue[] = []
    const warnings: ImportIssue[] = []
    const name = text(cell(r, 'name'), 200) ?? ''
    if (!name) errors.push('NAME_REQUIRED')

    const num = (f: ImportField, issue: ImportIssue, integer = false) => {
      const v = parseNumber(cell(r, f))
      if (v === 'invalid' || (typeof v === 'number' && (v < 0 || (integer && !Number.isInteger(v))))) {
        errors.push(issue)
        return null
      }
      return v
    }
    const price = num('price', 'PRICE_INVALID')
    const costPrice = num('costPrice', 'COST_INVALID')
    const initialStock = num('initialStock', 'STOCK_INVALID', true)

    const kindValue = parseKind(cell(r, 'kind'))
    if (kindValue === 'invalid') errors.push('KIND_INVALID')
    const kind = kindValue === 'invalid' ? null : kindValue
    if (kind === 'SERVICE' && initialStock) warnings.push('STOCK_FOR_SERVICE')

    const barcodeValue = parseBarcode(cell(r, 'barcode'))
    if (barcodeValue === 'invalid') errors.push('BARCODE_INVALID')
    if (barcodeValue === 'scientific') errors.push('BARCODE_SCIENTIFIC')
    const barcode = barcodeValue === 'invalid' || barcodeValue === 'scientific' ? null : barcodeValue

    rows.push({
      row: i + firstRow,
      sku: text(cell(r, 'sku'), 60)?.toUpperCase().replace(/\s+/g, '-') ?? null,
      name,
      kind,
      category: text(cell(r, 'category'), 100),
      price,
      costPrice,
      barcode,
      initialStock,
      errors,
      warnings,
    })
  }

  // The same SKU or barcode twice in one file: keep the first, flag the rest.
  const seenSku = new Set<string>()
  const seenBarcode = new Set<string>()
  for (const row of rows) {
    if (row.sku) {
      if (seenSku.has(row.sku)) row.errors.push('DUPLICATE_SKU')
      seenSku.add(row.sku)
    }
    if (row.barcode) {
      if (seenBarcode.has(row.barcode)) row.errors.push('DUPLICATE_BARCODE')
      seenBarcode.add(row.barcode)
    }
  }

  return { headerRow: index + firstRow, columns, rows }
}
