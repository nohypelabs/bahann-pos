/** @jest-environment node */
import { barcodeModules, buildLabelPdf } from '../labelPdf'
import { LABEL_SHEETS } from '../sheets'

const sheet3x8 = LABEL_SHEETS.find((s) => s.id === 'a4-3x8')!

describe('barcodeModules', () => {
  it('encodes an EAN-13 barcode as EAN-13 with no padding around the 95 modules', () => {
    const modules = barcodeModules('2000000000039')
    // 95 modules from start guard 101 to end guard 101, no white padding around them.
    expect(modules).toHaveLength(95)
    expect(modules.startsWith('101')).toBe(true)
    expect(modules.endsWith('101')).toBe(true)
  })

  it('encodes a SKU as Code 128', () => {
    expect(barcodeModules('JAS-00001')).toMatch(/^1[01]+11$/)
  })
})

describe('buildLabelPdf', () => {
  const label = (n: number) => ({ name: `Barang uji ${n} dengan nama yang cukup panjang untuk dua baris`, code: '2000000000039', price: 'Rp 25.000' })

  it('starts a new A4 page when a sheet is full', () => {
    const doc = buildLabelPdf(Array.from({ length: 25 }, (_, i) => label(i)), sheet3x8)
    expect(doc.getNumberOfPages()).toBe(2)
    const size = doc.internal.pageSize
    expect(Math.round(size.getWidth())).toBe(210)
    expect(Math.round(size.getHeight())).toBe(297)
  })

  it('counts skipped positions on a partly used sheet', () => {
    expect(buildLabelPdf(Array.from({ length: 4 }, (_, i) => label(i)), sheet3x8, { skip: 22 }).getNumberOfPages()).toBe(2)
  })

  it('lays out every preset sheet, with and without price and guides', () => {
    for (const s of LABEL_SHEETS) {
      const doc = buildLabelPdf([label(1), { name: 'Jasa', code: 'JAS-00001', price: null }], s, { outline: true })
      expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000)
    }
  })
})
