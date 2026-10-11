import {
  addDays,
  businessDate,
  endOfBusinessDay,
  startOfBusinessDay,
  toRangeEnd,
  toRangeStart,
} from '@/lib/business/timezone';

describe('business timezone helpers', () => {
  it('puts early-morning WIB sales on the WIB day, not the previous UTC day', () => {
    // 2026-10-11 05:30 WIB is still 2026-10-10 in UTC.
    expect(businessDate(new Date('2026-10-10T22:30:00Z'))).toBe('2026-10-11');
    // 2026-10-11 23:30 WIB is 16:30 UTC on the same day.
    expect(businessDate(new Date('2026-10-11T16:30:00Z'))).toBe('2026-10-11');
  });

  it('bounds a business day in WIB', () => {
    expect(new Date(startOfBusinessDay('2026-10-11')).toISOString()).toBe('2026-10-10T17:00:00.000Z');
    expect(new Date(endOfBusinessDay('2026-10-11')).toISOString()).toBe('2026-10-11T16:59:59.999Z');
  });

  it('shifts calendar days across month boundaries', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('widens date-only filters to the full day and leaves timestamps alone', () => {
    expect(toRangeStart('2026-10-11')).toBe('2026-10-11T00:00:00+07:00');
    expect(toRangeEnd('2026-10-11')).toBe('2026-10-11T23:59:59.999+07:00');
    expect(toRangeEnd('2026-10-11T12:00:00Z')).toBe('2026-10-11T12:00:00Z');
  });
});
