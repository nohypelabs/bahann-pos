/**
 * Business calendar days.
 *
 * Stores operate on local (WIB) days, but servers run in UTC. Anything that asks
 * "which day is it" or "where does a day start" must use these helpers, or sales
 * between 00:00 and 07:00 WIB land on the previous day.
 *
 * Asia/Jakarta has no daylight saving, so the offset is fixed.
 */
export const BUSINESS_TIMEZONE = 'Asia/Jakarta'
export const BUSINESS_UTC_OFFSET = '+07:00'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The business calendar day (YYYY-MM-DD) that an instant falls on. */
export function businessDate(at: Date | number = new Date()): string {
  return dateFormatter.format(at)
}

/** Shifts a YYYY-MM-DD calendar day by whole days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** First instant of a business day, as an ISO timestamp with offset. */
export function startOfBusinessDay(date: string): string {
  return `${date}T00:00:00${BUSINESS_UTC_OFFSET}`
}

/** Last instant of a business day, as an ISO timestamp with offset. */
export function endOfBusinessDay(date: string): string {
  return `${date}T23:59:59.999${BUSINESS_UTC_OFFSET}`
}

/**
 * Widens a date-only filter value to the whole business day; full timestamps
 * pass through unchanged. Comparing `created_at <= '2026-10-11'` would stop at
 * UTC midnight and drop the very day the user picked.
 */
export function toRangeStart(value: string): string {
  return DATE_ONLY.test(value) ? startOfBusinessDay(value) : value
}

export function toRangeEnd(value: string): string {
  return DATE_ONLY.test(value) ? endOfBusinessDay(value) : value
}
