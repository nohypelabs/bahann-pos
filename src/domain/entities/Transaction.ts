export type TransactionStatus = 'pending' | 'completed' | 'voided' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'ewallet'

export type TransactionItem = {
  id: string
  tenantId: string
  transactionId: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  /** Cost of one unit at the moment of sale (HPP); null when unknown. */
  unitCost?: number | null
  /** The catalogue price at the moment of sale. */
  listPrice?: number | null
  /** Why the line was sold below its list price (src/domain/sales/manualDiscount.ts). */
  discountReason?: string | null
  discountNote?: string | null
}

export type Transaction = {
  id: string
  transactionId: string
  tenantId: string
  outletId: string
  cashierId: string
  deviceId: string | null
  shiftId: string | null
  status: TransactionStatus
  subtotal: number
  /** Every discount on the sale: promo or voucher plus manualDiscount. */
  discountAmount: number
  /** The part of discountAmount the cashier gave by hand, with its reason. */
  manualDiscount?: number
  discountReason?: string | null
  discountNote?: string | null
  taxAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  amountPaid: number
  changeAmount: number
  notes: string | null
  voidReason: string | null
  voidedBy: string | null
  voidedAt: Date | null
  refundReason: string | null
  refundedBy: string | null
  refundedAt: Date | null
  refundAmount: number | null
  createdAt: Date
}
