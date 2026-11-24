import { findHeader, parseBarcode, parseCatalog, parseKind, parseNumber } from '@/lib/products/catalogImport';

describe('parseNumber', () => {
  it.each([
    [25000, 25000],
    ['25000', 25000],
    ['Rp 25.000', 25000],
    ['Rp25.000,50', 25000.5],
    ['25,000.50', 25000.5],
    ['1.250.000', 1250000],
    ['12,5', 12.5],
    ['', null],
    ['-', null],
    [null, null],
  ])('%p → %p', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it('rejects text that is not a number', () => {
    expect(parseNumber('dua ribu')).toBe('invalid');
  });
});

describe('parseBarcode', () => {
  it('keeps every digit of a number cell', () => {
    expect(parseBarcode(8991234567890)).toBe('8991234567890');
  });

  it('accepts text codes and rejects scientific notation and junk', () => {
    expect(parseBarcode(' 0123456789012 ')).toBe('0123456789012');
    expect(parseBarcode('ABC-123')).toBe('ABC-123');
    expect(parseBarcode('8,99123E+12')).toBe('scientific');
    expect(parseBarcode('8.99E+12')).toBe('scientific');
    expect(parseBarcode('12 34')).toBe('invalid');
    expect(parseBarcode('')).toBeNull();
  });
});

describe('parseKind', () => {
  it('maps Indonesian words to item types', () => {
    expect(parseKind('Jasa')).toBe('SERVICE');
    expect(parseKind('Sparepart')).toBe('PRODUCT');
    expect(parseKind(' spare part ')).toBe('PRODUCT');
    expect(parseKind('')).toBeNull();
    expect(parseKind('lainnya')).toBe('invalid');
  });
});

describe('findHeader', () => {
  it('finds a header below a title and a blank row', () => {
    const header = findHeader([
      ['DAFTAR BARANG MR BENGKEL'],
      [],
      ['No', 'Kode Barang', 'Nama Barang', 'Harga Beli', 'Harga Jual', 'Qty'],
    ]);
    expect(header).toEqual({ index: 2, columns: { sku: 1, name: 2, costPrice: 3, price: 4, initialStock: 5 } });
  });

  it('needs a name column', () => {
    expect(findHeader([['SKU', 'Harga']])).toBeNull();
  });
});

describe('parseCatalog', () => {
  const sheet = [
    ['Daftar stok per 20 Nov'],
    ['SKU', 'Nama Barang', 'Jenis', 'Kategori', 'Harga Jual', 'HPP', 'Barcode', 'Stok Awal'],
    ['oli-001', 'Oli MPX1 0.8L', 'Sparepart', 'Oli', 'Rp 55.000', 45000, 8991234567890, 20],
    ['', 'Jasa Servis Ringan', 'Jasa', 'Jasa', 50000, '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['OLI-001', 'Oli kembar', '', '', 'abc', '', '8991234567890', 1.5],
    ['BUSI-1', 'Busi', 'Sparepart', 'Part', 25000, 18000, '8.99E+12', 10],
    ['', 'Ganti oli', 'Jasa', '', 15000, '', '', 3],
  ];
  const parsed = parseCatalog(sheet)!;

  it('reads the header row and skips empty rows', () => {
    expect(parsed.headerRow).toBe(2);
    expect(parsed.rows.map((r) => r.row)).toEqual([3, 4, 6, 7, 8]);
  });

  it('normalises a good row', () => {
    expect(parsed.rows[0]).toMatchObject({
      sku: 'OLI-001', name: 'Oli MPX1 0.8L', kind: 'PRODUCT', category: 'Oli',
      price: 55000, costPrice: 45000, barcode: '8991234567890', initialStock: 20, errors: [],
    });
    expect(parsed.rows[1]).toMatchObject({ sku: null, kind: 'SERVICE', price: 50000, costPrice: null, errors: [] });
  });

  it('flags bad cells and duplicates within the file', () => {
    expect(parsed.rows[2].errors).toEqual(expect.arrayContaining(['PRICE_INVALID', 'STOCK_INVALID', 'DUPLICATE_SKU', 'DUPLICATE_BARCODE']));
    expect(parsed.rows[3].errors).toEqual(['BARCODE_SCIENTIFIC']);
  });

  it('numbers rows as Excel does when the used range starts lower', () => {
    const offset = parseCatalog([['Nama', 'Harga'], ['Busi', 1000]], 5)!;
    expect(offset.headerRow).toBe(5);
    expect(offset.rows[0].row).toBe(6);
  });

  it('warns that stock on a service is ignored', () => {
    expect(parsed.rows[4].warnings).toEqual(['STOCK_FOR_SERVICE']);
    expect(parsed.rows[4].errors).toEqual([]);
  });
});
