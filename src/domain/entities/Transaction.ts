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
  discountAmount: number
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
