import { ean13CheckDigit, formatSku, internalBarcode, isValidEan13, skuPrefix } from '@/domain/catalog/productCodes';

describe('EAN-13', () => {
  it('computes the check digit of a known code', () => {
    // 4006381333931 is the standard EAN-13 example.
    expect(ean13CheckDigit('400638133393')).toBe(1);
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
  });

  it('builds valid in-store barcodes starting with 20', () => {
    const code = internalBarcode(1);
    expect(code).toMatch(/^200000000001\d$/);
    expect(isValidEan13(code)).toBe(true);
    expect(isValidEan13(internalBarcode(9_999_999_999))).toBe(true);
  });

  it('refuses numbers it cannot encode', () => {
    expect(() => internalBarcode(0)).toThrow();
    expect(() => internalBarcode(10_000_000_000)).toThrow();
  });
});

describe('SKU', () => {
  it('takes three letters from the category', () => {
    expect(skuPrefix('Oli Mesin')).toBe('OLI');
    expect(skuPrefix('ban')).toBe('BAN');
  });

  it('falls back to BRG without a usable category', () => {
    expect(skuPrefix(null)).toBe('BRG');
    expect(skuPrefix('3 4')).toBe('BRG');
  });

  it('pads the running number', () => {
    expect(formatSku('OLI', 12)).toBe('OLI-00012');
  });
});
