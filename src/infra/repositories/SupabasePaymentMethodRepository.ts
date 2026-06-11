import { supabaseAdmin as supabase } from '../supabase/server'
import type { PaymentMethodCode, PaymentMethodSetting } from '@/domain/entities/PaymentMethod'
import type { PaymentMethodRepository } from '@/domain/repositories/PaymentMethodRepository'

interface PaymentMethodRow {
  id: string
  code: string
  name: string
  is_active: boolean
  account_details: Record<string, unknown> | null
}

export class SupabasePaymentMethodRepository implements PaymentMethodRepository {
  async findByCodes(codes: PaymentMethodCode[]): Promise<PaymentMethodSetting[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, code, name, is_active, account_details')
      .in('code', codes)

    if (error) throw new Error(`Failed to fetch payment methods: ${error.message}`)

    return (data as PaymentMethodRow[]).map((row) => ({
      id: row.id,
      code: row.code as PaymentMethodCode,
      name: row.name,
      isActive: row.is_active,
      accountDetails: row.account_details ?? {},
    }))
  }

  async updateByCode(
    code: PaymentMethodCode,
    accountDetails: Record<string, unknown>,
    isActive: boolean,
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_methods')
      .update({ account_details: accountDetails, is_active: isActive })
      .eq('code', code)

    if (error) throw new Error(`Failed to update payment method: ${error.message}`)
  }
}
