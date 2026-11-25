import { z } from 'zod'
import { DISCOUNT_NOTE_MAX, DISCOUNT_REASONS } from '@/domain/sales/manualDiscount'

// Input shapes for discounts a cashier gives by hand (src/domain/sales/manualDiscount.ts).
// The server checks the rules again; these only bound the shape.

export const discountReasonSchema = z.enum(DISCOUNT_REASONS)

/** An amount off a whole sale, with its reason. */
export const manualDiscountInput = z.object({
  amount: z.number().min(0).max(1_000_000_000),
  reason: discountReasonSchema,
  note: z.string().max(DISCOUNT_NOTE_MAX).nullish(),
})

/** A line sold below its catalogue price, with the reason. */
export const priceOverrideInput = z.object({
  unitPrice: z.number().min(0).max(1_000_000_000),
  reason: discountReasonSchema,
  note: z.string().max(DISCOUNT_NOTE_MAX).nullish(),
})

export type ManualDiscountInput = z.infer<typeof manualDiscountInput>
export type PriceOverrideInput = z.infer<typeof priceOverrideInput>
