// Workshop (bengkel) module entities. Design: docs/BENGKEL_MODULE.md.

export interface Customer {
  id: string
  tenantId: string
  name: string
  /** Digits only, Indonesian format (08…). */
  phone: string | null
  isMember: boolean
  memberCode: string | null
  joinedAt: string | null
  notes: string | null
  createdAt: string
}

export interface Vehicle {
  id: string
  tenantId: string
  /** Upper case letters and digits only, e.g. B1234XYZ. */
  plateNumber: string
  brand: string | null
  model: string | null
  customerId: string | null
  createdAt: string
}

export interface Mechanic {
  id: string
  tenantId: string
  name: string
  phone: string | null
  isActive: boolean
}

export type ServiceOrderStatus = 'open' | 'paid' | 'cancelled'

export interface ServiceOrderItem {
  id: string
  productId: string
  productName: string
  productSku: string
  itemType: string
  quantity: number
  /** Agreed price for this job; null means the product's price at payment. */
  unitPrice: number | null
  /** The product's current price, for display and when unitPrice is null. */
  listPrice: number
}

export interface ServiceOrder {
  id: string
  tenantId: string
  outletId: string
  status: ServiceOrderStatus
  vehicle: Vehicle
  customer: Customer | null
  mechanic: Mechanic | null
  complaint: string | null
  odometerKm: number | null
  transactionId: string | null
  /** What the customer paid (after any voucher), once the note is paid. */
  paidTotal: number | null
  openedAt: string
  closedAt: string | null
  cancelReason: string | null
  items: ServiceOrderItem[]
}

/** A row in the open-notes list. */
export interface ServiceOrderSummary {
  id: string
  outletId: string
  plateNumber: string
  vehicleLabel: string | null
  customerName: string | null
  isMember: boolean
  mechanicName: string | null
  itemCount: number
  openedAt: string
}

export type LoyaltyProgramType = 'stamp' | 'points' | 'member_discount'

export type VoucherReward =
  | { type: 'free_service'; maxValue: number | null }
  | { type: 'fixed'; amount: number }
  | { type: 'percent'; percent: number; maxValue: number | null }

export interface StampProgramConfig {
  requiredStamps: number
  minSpend: number
  reward: VoucherReward
  /** Null: vouchers never expire. */
  voucherValidDays: number | null
}

export interface LoyaltyProgram<TConfig = StampProgramConfig> {
  id: string
  tenantId: string
  type: LoyaltyProgramType
  name: string
  isActive: boolean
  config: TConfig
}

export type VoucherStatus = 'issued' | 'redeemed' | 'void'

export interface MemberVoucher {
  id: string
  customerId: string
  code: string
  reward: VoucherReward
  source: 'stamp_reward' | 'manual'
  status: VoucherStatus
  issuedAt: string
  expiresAt: string | null
  redeemedAt: string | null
}

export interface StampCard {
  programActive: boolean
  balance: number
  required: number
}
