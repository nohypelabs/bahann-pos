// Generated product codes: SKUs from a category prefix and a running number, and
// in-store EAN-13 barcodes for items that came without one.

/** EAN-13 check digit for the first 12 digits. */
export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error('EAN-13 needs 12 digits before the check digit')
  const sum = [...first12].reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12])
}

/**
 * An in-store barcode: GS1 reserves prefixes 20–29 for numbers that only mean
 * something inside one store, so these never clash with a manufacturer's code.
 * Layout: "20" + 10-digit running number + check digit.
 */
export function internalBarcode(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9_999_999_999) throw new Error('Barcode number out of range')
  const first12 = '20' + String(n).padStart(10, '0')
  return first12 + ean13CheckDigit(first12)
}

/** "Oli Mesin" → "OLI"; anything without letters → "BRG" (barang). */
export function skuPrefix(category?: string | null): string {
  const letters = (category ?? '').toUpperCase().replace(/[^A-Z]/g, '')
  return letters.length >= 2 ? letters.slice(0, 3) : 'BRG'
}

export function formatSku(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(5, '0')}`
}
