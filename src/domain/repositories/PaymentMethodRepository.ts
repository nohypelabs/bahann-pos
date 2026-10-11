import type { PaymentMethodCode, PaymentMethodSetting } from '../entities/PaymentMethod'

export interface PaymentMethodRepository {
  /** The tenant's own configured methods; platform templates are never returned. */
  findForTenant(tenantId: string, codes: PaymentMethodCode[]): Promise<PaymentMethodSetting[]>
  /** Creates or updates the tenant's own row for a method, never another tenant's. */
  saveForTenant(
    tenantId: string,
    code: PaymentMethodCode,
    accountDetails: Record<string, unknown>,
    isActive: boolean,
  ): Promise<void>
}
