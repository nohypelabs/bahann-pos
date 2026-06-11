export type PaymentMethodCode = 'bank_transfer' | 'ewallet_manual' | 'qris_static'

export type PaymentMethodSetting = {
  id: string
  code: PaymentMethodCode
  name: string
  isActive: boolean
  accountDetails: Record<string, unknown>
}
