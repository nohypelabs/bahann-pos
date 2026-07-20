import { UserRepository, UserSummary } from '@/domain/repositories/UserRepository'
import { User } from '@/domain/entities/User'
import { supabaseAdmin } from '../supabase/server'

type TenantBillingContext = {
  plan: string
  ownerUserId: string | null
  ownerEmailVerifiedAt: string | null
}

export class SupabaseUserRepository implements UserRepository {
  private async getTenantBillingContext(tenantId: string, fallbackPlan = 'free'): Promise<TenantBillingContext> {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('owner_user_id, plan')
      .eq('id', tenantId)
      .maybeSingle()

    let ownerUserId = tenant?.owner_user_id ?? null
    let ownerPlan: string | null = null
    let ownerEmailVerifiedAt: string | null = null

    if (ownerUserId) {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('id, plan, email_verified_at')
        .eq('id', ownerUserId)
        .maybeSingle()

      ownerPlan = (owner?.plan as string | null) ?? null
      ownerEmailVerifiedAt = owner?.email_verified_at ?? null
    }

    if (!ownerUserId) {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('id, plan, email_verified_at')
        .eq('tenant_id', tenantId)
        .in('role', ['admin', 'owner', 'super_admin'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      ownerUserId = owner?.id ?? null
      ownerPlan = (owner?.plan as string | null) ?? null
      ownerEmailVerifiedAt = owner?.email_verified_at ?? null
    }

    return {
      plan: ownerPlan || (tenant?.plan as string | null) || fallbackPlan || 'free',
      ownerUserId,
      ownerEmailVerifiedAt,
    }
  }

  async save(user: User): Promise<void> {
    const { error } = await supabaseAdmin.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.name,
      password_hash: user.passwordHash,
      outlet_id: user.outletId,
      role: user.role,
      tenant_id: user.tenantId,
      created_at: user.createdAt?.toISOString(),
      whatsapp_number: user.whatsappNumber,
    })

    if (error) {
      throw new Error(`Failed to save user: ${error.message}`)
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, password_hash, outlet_id, role, tenant_id, created_at, whatsapp_number')
      .eq('email', email)
      .single()

    if (error || !data) {
      return null
    }

    return new User(
      data.id,
      data.email,
      data.name,
      data.password_hash,
      data.outlet_id || undefined,
      data.role || undefined,
      data.tenant_id || undefined,
      data.created_at ? new Date(data.created_at) : undefined,
      data.whatsapp_number || undefined
    )
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return new User(
      data.id,
      data.email,
      data.name,
      data.password_hash,
      data.outlet_id || undefined,
      data.role || undefined,
      data.tenant_id || undefined,
      data.created_at ? new Date(data.created_at) : undefined,
      data.whatsapp_number || undefined
    )
  }

  async update(user: User): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email: user.email,
        name: user.name,
        password_hash: user.passwordHash,
        outlet_id: user.outletId,
        role: user.role,
      })
      .eq('id', user.id)

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id)

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }

  async updateProfileFields(id: string, fields: { name?: string; whatsappNumber?: string }): Promise<void> {
    const updateData: Record<string, unknown> = {}
    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.whatsappNumber !== undefined) updateData.whatsapp_number = fields.whatsappNumber || null

    const { error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`)
    }
  }

  async getPlan(userId: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('plan, tenant_id')
      .eq('id', userId)
      .single()

    if (!data) return 'free'

    const userPlan = (data.plan as string) || 'free'
    if (!data.tenant_id) return userPlan

    const tenantBilling = await this.getTenantBillingContext(data.tenant_id, userPlan)
    return tenantBilling.plan
  }

  async getPlanByTenantId(tenantId: string): Promise<string> {
    const tenantBilling = await this.getTenantBillingContext(tenantId)
    return tenantBilling.plan
  }

  async findByVerifyToken(token: string): Promise<{ id: string; email: string; name: string; emailVerifiedAt: string | null; plan: string } | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, email_verified_at, plan')
      .eq('email_verify_token', token)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      emailVerifiedAt: data.email_verified_at,
      plan: data.plan || 'free',
    }
  }

  async activateTrial(userId: string): Promise<void> {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email_verified_at: new Date().toISOString(),
        email_verify_token: null,
        plan: 'starter',
        is_trial: true,
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to activate trial: ${error.message}`)
    }
  }

  async activatePlan(userId: string, plan: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ plan, is_trial: false })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to activate plan: ${error.message}`)
    }
  }

  async insertBillingHistory(entry: { userId: string; plan: string; previousPlan: string; amount: number; note: string; isTrial: boolean; changedBy?: string }): Promise<void> {
    const { error } = await supabaseAdmin.from('billing_history').insert({
      user_id: entry.userId,
      plan: entry.plan,
      previous_plan: entry.previousPlan,
      amount: entry.amount,
      note: entry.note,
      is_trial: entry.isTrial,
      changed_by: entry.changedBy ?? entry.userId,
    })

    if (error) {
      throw new Error(`Failed to insert billing history: ${error.message}`)
    }
  }

  async updateVerifyToken(userId: string, token: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ email_verify_token: token })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update verify token: ${error.message}`)
    }
  }

  async getEmailVerificationStatus(userId: string): Promise<{ verified: boolean; plan: string }> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('email_verified_at, plan, tenant_id')
      .eq('id', userId)
      .single()

    if (!data) {
      return { verified: false, plan: 'free' }
    }

    const userPlan = (data.plan as string) || 'free'
    if (!data.tenant_id) {
      return {
        verified: !!data.email_verified_at,
        plan: userPlan,
      }
    }

    const tenantBilling = await this.getTenantBillingContext(data.tenant_id, userPlan)
    const isTenantMember = !!tenantBilling.ownerUserId && tenantBilling.ownerUserId !== userId

    return {
      verified: isTenantMember ? true : !!(tenantBilling.ownerEmailVerifiedAt || data.email_verified_at),
      plan: tenantBilling.plan,
    }
  }

  async updateRegistrationDetails(userId: string, outletId: string, verifyToken: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        outlet_id: outletId,
        plan: 'free',
        email_verify_token: verifyToken,
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update registration details: ${error.message}`)
    }
  }

  async getSuspensionStatus(userId: string): Promise<{ isSuspended: boolean; outletId: string | null; role: string | null }> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('is_suspended, outlet_id, role')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to get suspension status: ${error.message}`)
    }

    return {
      isSuspended: data?.is_suspended ?? false,
      outletId: data?.outlet_id ?? null,
      role: data?.role ?? null,
    }
  }

  async isOwnerSuspended(outletId: string): Promise<boolean> {
    const { data: outlet, error: outletError } = await supabaseAdmin
      .from('outlets')
      .select('owner_id')
      .eq('id', outletId)
      .single()

    if (outletError || !outlet?.owner_id) {
      return false
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('users')
      .select('is_suspended')
      .eq('id', outlet.owner_id)
      .single()

    if (ownerError) {
      return false
    }

    return owner?.is_suspended ?? false
  }

  async findAll(params: { page: number; limit: number; search?: string; tenantId?: string }): Promise<{ users: UserSummary[]; total: number }> {
    const { page, limit, search, tenantId } = params
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, outlet_id, role, created_at', { count: 'estimated' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    const users: UserSummary[] = (data || []).map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      outletId: row.outlet_id ?? null,
      role: row.role ?? null,
      createdAt: row.created_at,
    }))

    return { users, total: count || 0 }
  }
}
