import { z } from 'zod'
import { router, superAdminProcedure } from '../trpc'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { TRPCError } from '@trpc/server'

export const superAdminRouter = router({
  globalStats: superAdminProcedure.query(async () => {
    const [
      { count: totalTenants },
      { count: totalUsers },
      { count: totalOutlets },
      { count: totalProducts },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('outlets').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
    ])

    const { count: suspendedTenants } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_suspended', true)

    // Plan distribution
    const { data: planData } = await supabase
      .from('users')
      .select('plan')
      .eq('role', 'admin')

    const planDistribution: Record<string, number> = {}
    planData?.forEach(u => {
      const p = u.plan || 'free'
      planDistribution[p] = (planDistribution[p] || 0) + 1
    })

    // Revenue from billing_history (total amount collected)
    const { data: billingData } = await supabase
      .from('billing_history')
      .select('amount')

    const totalRevenue = billingData?.reduce((sum, b) => sum + (b.amount || 0), 0) ?? 0

    // New tenants this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { count: newThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .gte('created_at', monthStart.toISOString())

    // Transaction count across all tenants
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    return {
      totalTenants: totalTenants || 0,
      totalUsers: totalUsers || 0,
      totalOutlets: totalOutlets || 0,
      totalProducts: totalProducts || 0,
      suspendedTenants: suspendedTenants || 0,
      totalRevenue,
      newTenantsThisMonth: newThisMonth || 0,
      totalTransactions: totalTransactions || 0,
      planDistribution,
    }
  }),

  listTenants: superAdminProcedure
    .input(z.object({
      search: z.string().optional(),
      plan: z.string().optional(),
      suspended: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      let query = supabase
        .from('users')
        .select('id, email, name, plan, is_trial, is_suspended, created_at, email_verified_at', { count: 'exact' })
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (input?.search) {
        query = query.or(`email.ilike.%${input.search}%,name.ilike.%${input.search}%`)
      }
      if (input?.plan) {
        query = query.eq('plan', input.plan)
      }
      if (input?.suspended !== undefined) {
        query = query.eq('is_suspended', input.suspended)
      }

      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0
      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // For each tenant, get outlet count and user count
      const tenantIds = data?.map(t => t.id) ?? []
      if (tenantIds.length === 0) return { tenants: [], total: 0 }

      const [{ data: outletCounts }, { data: userCounts }] = await Promise.all([
        supabase.from('outlets').select('owner_id').in('owner_id', tenantIds),
        supabase.from('users').select('outlet_id, outlets!inner(owner_id)').in('outlet_id',
          (await supabase.from('outlets').select('id').in('owner_id', tenantIds)).data?.map(o => o.id) ?? []
        ),
      ])

      const outletCountMap: Record<string, number> = {}
      outletCounts?.forEach(o => {
        outletCountMap[o.owner_id] = (outletCountMap[o.owner_id] || 0) + 1
      })

      const userCountMap: Record<string, number> = {}
      userCounts?.forEach((u: any) => {
        const ownerId = u.outlets?.owner_id
        if (ownerId) userCountMap[ownerId] = (userCountMap[ownerId] || 0) + 1
      })

      const tenants = data?.map(t => ({
        ...t,
        outletCount: outletCountMap[t.id] || 0,
        userCount: (userCountMap[t.id] || 0) + 1, // +1 for admin themselves
      })) ?? []

      return { tenants, total: count || 0 }
    }),

  getTenantDetail: superAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data: tenant, error } = await supabase
        .from('users')
        .select('id, email, name, plan, is_trial, is_suspended, created_at, email_verified_at, whatsapp_number')
        .eq('id', input.tenantId)
        .eq('role', 'admin')
        .single()

      if (error || !tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' })

      // Outlets
      const { data: outlets } = await supabase
        .from('outlets')
        .select('id, name, address, created_at')
        .eq('owner_id', input.tenantId)
        .order('created_at', { ascending: true })

      const outletIds = outlets?.map(o => o.id) ?? []

      // Users (cashiers)
      const { data: users } = outletIds.length > 0
        ? await supabase
            .from('users')
            .select('id, name, email, role, created_at')
            .in('outlet_id', outletIds)
            .order('created_at', { ascending: false })
        : { data: [] }

      // Transaction stats
      let transactionCount = 0
      let totalRevenue = 0
      if (outletIds.length > 0) {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .in('outlet_id', outletIds)
        transactionCount = count || 0

        const { data: txData } = await supabase
          .from('transactions')
          .select('total_amount')
          .in('outlet_id', outletIds)
          .eq('status', 'completed')
        totalRevenue = txData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) ?? 0
      }

      // Product count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', input.tenantId)

      // Billing history
      const { data: billing } = await supabase
        .from('billing_history')
        .select('id, plan, previous_plan, amount, note, is_trial, created_at')
        .eq('user_id', input.tenantId)
        .order('created_at', { ascending: false })
        .limit(10)

      return {
        ...tenant,
        outlets: outlets ?? [],
        users: users ?? [],
        stats: {
          transactionCount,
          totalRevenue,
          productCount: productCount || 0,
          outletCount: outlets?.length || 0,
          userCount: (users?.length || 0) + 1,
        },
        billing: billing ?? [],
      }
    }),

  suspendTenant: superAdminProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      suspend: z.boolean(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data: tenant } = await supabase
        .from('users')
        .select('email, name, is_suspended')
        .eq('id', input.tenantId)
        .eq('role', 'admin')
        .single()

      if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' })

      const { error } = await supabase
        .from('users')
        .update({ is_suspended: input.suspend })
        .eq('id', input.tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: input.suspend ? 'SUSPEND' : 'ACTIVATE',
        entityType: 'tenant',
        entityId: input.tenantId,
        changes: {
          before: { is_suspended: tenant.is_suspended },
          after: { is_suspended: input.suspend },
        },
        metadata: { tenantEmail: tenant.email, reason: input.reason },
      })

      return { success: true }
    }),

  getGrowthChart: superAdminProcedure
    .input(z.object({ days: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      const days = input?.days ?? 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data } = await supabase
        .from('users')
        .select('created_at')
        .eq('role', 'admin')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // Group by date
      const dailyCounts: Record<string, number> = {}
      const start = new Date(startDate)
      for (let i = 0; i <= days; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        dailyCounts[d.toISOString().split('T')[0]] = 0
      }

      data?.forEach(u => {
        const d = new Date(u.created_at!).toISOString().split('T')[0]
        if (dailyCounts[d] !== undefined) dailyCounts[d]++
      })

      // Cumulative
      let cumulative = 0
      const { count: beforeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .lt('created_at', startDate.toISOString())
      cumulative = beforeCount || 0

      return Object.entries(dailyCounts).map(([date, count]) => {
        cumulative += count
        return { date, newTenants: count, totalTenants: cumulative }
      })
    }),

  getSettings: superAdminProcedure.query(async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value, updated_at')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const settings: Record<string, string> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }
    return settings
  }),

  updateSettings: superAdminProcedure
    .input(z.record(z.string(), z.string()))
    .mutation(async ({ input, ctx }) => {
      const allowedKeys = [
        'solana_wallet_address', 'solana_rpc_url',
        'bank_name', 'bank_account', 'bank_holder',
        'support_wa', 'qris_image_url',
      ]

      const entries = Object.entries(input).filter(([k]) => allowedKeys.includes(k))
      if (entries.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No valid settings to update' })
      }

      for (const [key, value] of entries) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({
            key,
            value,
            updated_at: new Date().toISOString(),
            updated_by: ctx.userId,
          })

        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session?.email || 'unknown',
        action: 'UPDATE',
        entityType: 'tenant',
        changes: input,
        metadata: { scope: 'platform_settings' },
      })

      return { success: true }
    }),
})
