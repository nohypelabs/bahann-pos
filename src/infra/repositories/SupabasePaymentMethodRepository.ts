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

/**
 * Rows with tenant_id NULL are platform templates (name, type, icon, order) and
 * never hold account details; each tenant keeps its own row per method.
 */
export class SupabasePaymentMethodRepository implements PaymentMethodRepository {
  async findForTenant(tenantId: string, codes: PaymentMethodCode[]): Promise<PaymentMethodSetting[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('id, code, name, is_active, account_details')
      .eq('tenant_id', tenantId)
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

  async saveForTenant(
    tenantId: string,
    code: PaymentMethodCode,
    accountDetails: Record<string, unknown>,
    isActive: boolean,
  ): Promise<void> {
    const { data: existing, error: findError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .maybeSingle()

    if (findError) throw new Error(`Failed to fetch payment method: ${findError.message}`)

    if (existing) {
      const { error } = await supabase
        .from('payment_methods')
        .update({ account_details: accountDetails, is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)

      if (error) throw new Error(`Failed to update payment method: ${error.message}`)
      return
    }

    const { data: template, error: templateError } = await supabase
      .from('payment_methods')
      .select('name, type, requires_confirmation, icon, instructions, fee_amount, fee_percentage, display_order')
      .is('tenant_id', null)
      .eq('code', code)
      .single()

    if (templateError || !template) {
      throw new Error(`Payment method template not found: ${code}`)
    }

    const { error } = await supabase
      .from('payment_methods')
      .insert({ ...template, code, tenant_id: tenantId, account_details: accountDetails, is_active: isActive })

    if (error) throw new Error(`Failed to create payment method: ${error.message}`)
  }
}
