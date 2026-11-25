// A discount the cashier gives by hand: a line sold below its list price, or an
// amount off the whole sale. Each one needs a reason, so the owner can see who
// gave what and why (the manual discount report). Pure: used by the cashier
// screens before anything is sent and again by the server.
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException'

/** The quick-pick reasons; OTHER needs a written note. */
export const DISCOUNT_REASONS = ['OWNER_POLICY', 'ROUNDING', 'DAMAGED', 'COMPLAINT', 'OTHER'] as const
export type DiscountReason = (typeof DISCOUNT_REASONS)[number]

export interface DiscountJustification {
  reason: DiscountReason
  note: string | null
}

/** A manual discount on a whole sale or service note. */
export interface ManualDiscount extends DiscountJustification {
  amount: number
}

export const DISCOUNT_NOTE_MAX = 300

export function isDiscountReason(value: unknown): value is DiscountReason {
  return typeof value === 'string' && (DISCOUNT_REASONS as readonly string[]).includes(value)
}

/** Checks a reason and its note, and returns them cleaned. */
export function justifyDiscount(input: { reason?: string | null; note?: string | null } | null | undefined): DiscountJustification {
  const reason = input?.reason
  if (!isDiscountReason(reason)) {
    throw new DomainException(DomainErrorCode.DISCOUNT_REASON_REQUIRED, 'A reason is required for a discount')
  }
  const note = input?.note?.trim().slice(0, DISCOUNT_NOTE_MAX) || null
  if (reason === 'OTHER' && !note) {
    throw new DomainException(DomainErrorCode.DISCOUNT_NOTE_REQUIRED, 'Describe the reason for this discount')
  }
  return { reason, note }
}

/**
 * Checks a discount on a whole sale: a whole positive amount no larger than what
 * is left after other discounts, with a reason. Zero (or none) means no discount.
 */
export function checkManualDiscount(
  input: { amount: number; reason?: string | null; note?: string | null } | null | undefined,
  room: number,
): ManualDiscount | null {
  if (!input || !input.amount) return null
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new DomainException(DomainErrorCode.DISCOUNT_TOO_LARGE, 'Invalid discount amount')
  }
  if (input.amount > Math.max(0, room)) {
    throw new DomainException(DomainErrorCode.DISCOUNT_TOO_LARGE, 'The discount is larger than the amount due')
  }
  return { amount: input.amount, ...justifyDiscount(input) }
}

/** The amount a percentage takes off, rounded to whole rupiah. */
export function percentOf(base: number, percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0
  return Math.round((base * Math.min(percent, 100)) / 100)
}
