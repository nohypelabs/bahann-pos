import type { PaymentMethodCode, PaymentMethodSetting } from '../entities/PaymentMethod'

export interface PaymentMethodRepository {
  findByCodes(codes: PaymentMethodCode[]): Promise<PaymentMethodSetting[]>
  updateByCode(code: PaymentMethodCode, accountDetails: Record<string, unknown>, isActive: boolean): Promise<void>
}
