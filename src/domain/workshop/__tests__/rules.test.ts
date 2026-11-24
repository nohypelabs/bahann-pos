import { DomainException } from '@/domain/errors/DomainException';
import {
  DEFAULT_STAMP_CONFIG,
  normalizePhone,
  normalizePlate,
  readStampConfig,
  validateStampConfig,
  voucherDiscount,
} from '@/domain/workshop/rules';

describe('normalizePlate', () => {
  it('upper-cases and strips spaces and punctuation', () => {
    expect(normalizePlate(' b 1234-xyz ')).toBe('B1234XYZ');
  });

  it('rejects input with no plate in it', () => {
    expect(() => normalizePlate(' - ')).toThrow(DomainException);
  });
});

describe('normalizePhone', () => {
  it('turns +62 numbers into 08 format', () => {
    expect(normalizePhone('+62 812-3456-7890')).toBe('081234567890');
  });

  it('gives null for empty input', () => {
    expect(normalizePhone('  ')).toBeNull();
  });

  it('rejects numbers that are too short', () => {
    expect(() => normalizePhone('0812')).toThrow(DomainException);
  });
});

describe('readStampConfig', () => {
  it('falls back to defaults for an empty config', () => {
    expect(readStampConfig({})).toEqual(DEFAULT_STAMP_CONFIG);
  });

  it('keeps valid values and drops invalid ones', () => {
    const c = readStampConfig({ requiredStamps: 5, minSpend: -1, reward: { type: 'fixed', amount: 25000 } });
    expect(c.requiredStamps).toBe(5);
    expect(c.minSpend).toBe(0);
    expect(c.reward).toEqual({ type: 'fixed', amount: 25000 });
  });

  it('keeps an explicit null validity as "never expires"', () => {
    expect(readStampConfig({ voucherValidDays: null }).voucherValidDays).toBeNull();
  });
});

describe('validateStampConfig', () => {
  it('accepts the defaults', () => {
    expect(validateStampConfig(DEFAULT_STAMP_CONFIG)).toEqual(DEFAULT_STAMP_CONFIG);
  });

  it('rejects zero stamps and a zero cap', () => {
    expect(() => validateStampConfig({ ...DEFAULT_STAMP_CONFIG, requiredStamps: 0 })).toThrow(DomainException);
    expect(() => validateStampConfig({ ...DEFAULT_STAMP_CONFIG, reward: { type: 'free_service', maxValue: 0 } })).toThrow(DomainException);
  });
});

describe('voucherDiscount', () => {
  const lines = [
    { itemType: 'SERVICE', unitPrice: 35000, quantity: 1 }, // light service
    { itemType: 'SERVICE', unitPrice: 75000, quantity: 1 }, // carburettor clean
    { itemType: 'PRODUCT', unitPrice: 60000, quantity: 1 }, // oil, still paid
  ];

  it('free service takes off one unit of the dearest labour line', () => {
    expect(voucherDiscount({ type: 'free_service', maxValue: null }, lines)).toBe(75000);
  });

  it('free service respects its cap', () => {
    expect(voucherDiscount({ type: 'free_service', maxValue: 50000 }, lines)).toBe(50000);
  });

  it('free service needs a labour line', () => {
    expect(() =>
      voucherDiscount({ type: 'free_service', maxValue: null }, [{ itemType: 'PRODUCT', unitPrice: 60000, quantity: 1 }]),
    ).toThrow(DomainException);
  });

  it('percent rounds down and respects its cap', () => {
    expect(voucherDiscount({ type: 'percent', percent: 10, maxValue: null }, lines)).toBe(17000);
    expect(voucherDiscount({ type: 'percent', percent: 10, maxValue: 15000 }, lines)).toBe(15000);
  });

  it('never exceeds the subtotal', () => {
    expect(voucherDiscount({ type: 'fixed', amount: 1_000_000 }, lines)).toBe(170000);
  });
});
