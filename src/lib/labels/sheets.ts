// A4 sticker-sheet layouts for product labels, in millimetres.

/** sessionStorage key the products page uses to hand its selection to the label page. */
export const LABEL_SELECTION_KEY = 'lakupos-label-selection'

export interface LabelSheet {
  id: string
  name: string
  columns: number
  rows: number
  labelWidth: number
  labelHeight: number
  marginTop: number
  marginLeft: number
  gapX: number
  gapY: number
}

export const A4 = { width: 210, height: 297 }

/** Common A4 sticker sheets sold in Indonesia; "custom" is edited by hand. */
export const LABEL_SHEETS: LabelSheet[] = [
  { id: 'a4-3x7', name: 'A4 · 21 label (3×7) · 63,5 × 38,1 mm', columns: 3, rows: 7, labelWidth: 63.5, labelHeight: 38.1, marginTop: 15.15, marginLeft: 7.2, gapX: 2.5, gapY: 0 },
  { id: 'a4-3x8', name: 'A4 · 24 label (3×8) · 70 × 37 mm', columns: 3, rows: 8, labelWidth: 70, labelHeight: 37, marginTop: 0.5, marginLeft: 0, gapX: 0, gapY: 0 },
  { id: 'a4-4x10', name: 'A4 · 40 label (4×10) · 52,5 × 29,7 mm', columns: 4, rows: 10, labelWidth: 52.5, labelHeight: 29.7, marginTop: 0, marginLeft: 0, gapX: 0, gapY: 0 },
  { id: 'a4-5x13', name: 'A4 · 65 label (5×13) · 38,1 × 21,2 mm', columns: 5, rows: 13, labelWidth: 38.1, labelHeight: 21.2, marginTop: 10.7, marginLeft: 4.65, gapX: 2.5, gapY: 0 },
]

export const CUSTOM_SHEET: LabelSheet = { ...LABEL_SHEETS[1], id: 'custom', name: 'Ukuran sendiri' }

export interface PlacedLabel<T> {
  item: T
  page: number
  /** Top-left corner on the page, mm. */
  x: number
  y: number
}

export const labelsPerSheet = (s: LabelSheet) => s.columns * s.rows

/** Whether the grid fits on an A4 page. */
export function sheetFits(s: LabelSheet): boolean {
  const width = s.marginLeft + s.columns * s.labelWidth + (s.columns - 1) * s.gapX
  const height = s.marginTop + s.rows * s.labelHeight + (s.rows - 1) * s.gapY
  return s.columns >= 1 && s.rows >= 1 && s.labelWidth > 0 && s.labelHeight > 0 && width <= A4.width + 0.01 && height <= A4.height + 0.01
}

/**
 * Lays items out row by row, page by page. `skip` leaves that many positions empty
 * at the start of the first page, for a sheet that was partly used before.
 */
export function placeLabels<T>(items: T[], sheet: LabelSheet, skip = 0): PlacedLabel<T>[] {
  const perPage = labelsPerSheet(sheet)
  const offset = Math.max(0, Math.min(skip, perPage - 1))
  return items.map((item, i) => {
    const slot = i + offset
    const page = Math.floor(slot / perPage)
    const inPage = slot % perPage
    const row = Math.floor(inPage / sheet.columns)
    const col = inPage % sheet.columns
    return {
      item,
      page,
      x: sheet.marginLeft + col * (sheet.labelWidth + sheet.gapX),
      y: sheet.marginTop + row * (sheet.labelHeight + sheet.gapY),
    }
  })
}
