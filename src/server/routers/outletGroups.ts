import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin } from '@/infra/supabase/server'

export const outletGroupsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.tenantId!

    const { data: groups, error } = await supabaseAdmin
      .from('outlet_groups')
      .select('id, name, description, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('name')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    // Fetch member counts and outlet names for each group
    const groupsWithDetails = await Promise.all(
      (groups || []).map(async (group) => {
        const { data: members } = await supabaseAdmin
          .from('outlet_group_members')
          .select('outlet_id, outlets(id, name)')
          .eq('outlet_group_id', group.id)

        return {
          ...group,
          memberCount: members?.length ?? 0,
          outlets: members?.map((m: any) => ({ id: m.outlets?.id, name: m.outlets?.name })) ?? [],
        }
      }),
    )

    return groupsWithDetails
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId!

      const { data: group, error } = await supabaseAdmin
        .from('outlet_groups')
        .select('id, name, description, created_at, updated_at')
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .single()

      if (error || !group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet group not found' })
      }

      const { data: members } = await supabaseAdmin
        .from('outlet_group_members')
        .select('outlet_id, outlets(id, name)')
        .eq('outlet_group_id', group.id)

      return {
        ...group,
        outlets: members?.map((m: any) => ({ id: m.outlets?.id, name: m.outlets?.name })) ?? [],
      }
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        outletIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId!

      // Validate all outlets belong to tenant
      const { data: outlets, error: outletError } = await supabaseAdmin
        .from('outlets')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('id', input.outletIds)

      if (outletError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: outletError.message })

      if (!outlets || outlets.length !== input.outletIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more outlets do not belong to this tenant',
        })
      }

      // Create group
      const { data: group, error: groupError } = await supabaseAdmin
        .from('outlet_groups')
        .insert({
          tenant_id: tenantId,
          name: input.name,
          description: input.description || null,
        })
        .select('id, name, description, created_at, updated_at')
        .single()

      if (groupError || !group) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: groupError?.message ?? 'Failed to create group' })
      }

      // Create members
      const memberRows = input.outletIds.map((outletId) => ({
        outlet_group_id: group.id,
        outlet_id: outletId,
      }))

      const { error: memberError } = await supabaseAdmin
        .from('outlet_group_members')
        .insert(memberRows)

      if (memberError) {
        // Rollback: delete the group if member insert fails
        await supabaseAdmin.from('outlet_groups').delete().eq('id', group.id)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: memberError.message })
      }

      return group
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        outletIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId!

      // Verify group belongs to tenant
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('outlet_groups')
        .select('id')
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .single()

      if (existingError || !existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet group not found' })
      }

      // Update group fields if provided
      if (input.name !== undefined || input.description !== undefined) {
        const updateData: Record<string, any> = {}
        if (input.name !== undefined) updateData.name = input.name
        if (input.description !== undefined) updateData.description = input.description

        const { error: updateError } = await supabaseAdmin
          .from('outlet_groups')
          .update(updateData)
          .eq('id', input.id)

        if (updateError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
      }

      // Replace members if outletIds provided
      if (input.outletIds) {
        // Validate all outlets belong to tenant
        const { data: outlets, error: outletError } = await supabaseAdmin
          .from('outlets')
          .select('id')
          .eq('tenant_id', tenantId)
          .in('id', input.outletIds)

        if (outletError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: outletError.message })

        if (!outlets || outlets.length !== input.outletIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more outlets do not belong to this tenant',
          })
        }

        // Delete existing members
        const { error: deleteError } = await supabaseAdmin
          .from('outlet_group_members')
          .delete()
          .eq('outlet_group_id', input.id)

        if (deleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message })

        // Insert new members
        if (input.outletIds.length > 0) {
          const memberRows = input.outletIds.map((outletId) => ({
            outlet_group_id: input.id,
            outlet_id: outletId,
          }))

          const { error: memberError } = await supabaseAdmin
            .from('outlet_group_members')
            .insert(memberRows)

          if (memberError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: memberError.message })
        }
      }

      // Return updated group
      const { data: updated } = await supabaseAdmin
        .from('outlet_groups')
        .select('id, name, description, created_at, updated_at')
        .eq('id', input.id)
        .single()

      return updated
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId!

      // Verify group belongs to tenant
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('outlet_groups')
        .select('id, name')
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .single()

      if (existingError || !existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet group not found' })
      }

      // Delete members first
      const { error: memberDeleteError } = await supabaseAdmin
        .from('outlet_group_members')
        .delete()
        .eq('outlet_group_id', input.id)

      if (memberDeleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: memberDeleteError.message })

      // Delete group
      const { error: groupDeleteError } = await supabaseAdmin
        .from('outlet_groups')
        .delete()
        .eq('id', input.id)

      if (groupDeleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: groupDeleteError.message })

      return { success: true }
    }),

  addOutlet: adminProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        outletId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId!

      // Verify group belongs to tenant
      const { data: group, error: groupError } = await supabaseAdmin
        .from('outlet_groups')
        .select('id')
        .eq('id', input.groupId)
        .eq('tenant_id', tenantId)
        .single()

      if (groupError || !group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet group not found' })
      }

      // Verify outlet belongs to tenant
      const { data: outlet, error: outletError } = await supabaseAdmin
        .from('outlets')
        .select('id')
        .eq('id', input.outletId)
        .eq('tenant_id', tenantId)
        .single()

      if (outletError || !outlet) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' })
      }

      // Check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from('outlet_group_members')
        .select('outlet_group_id')
        .eq('outlet_group_id', input.groupId)
        .eq('outlet_id', input.outletId)
        .maybeSingle()

      if (existingMember) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Outlet is already a member of this group' })
      }

      const { error: insertError } = await supabaseAdmin
        .from('outlet_group_members')
        .insert({
          outlet_group_id: input.groupId,
          outlet_id: input.outletId,
        })

      if (insertError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })

      return { success: true }
    }),

  removeOutlet: adminProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        outletId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId!

      // Verify group belongs to tenant
      const { data: group, error: groupError } = await supabaseAdmin
        .from('outlet_groups')
        .select('id')
        .eq('id', input.groupId)
        .eq('tenant_id', tenantId)
        .single()

      if (groupError || !group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet group not found' })
      }

      const { error: deleteError } = await supabaseAdmin
        .from('outlet_group_members')
        .delete()
        .eq('outlet_group_id', input.groupId)
        .eq('outlet_id', input.outletId)

      if (deleteError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message })

      return { success: true }
    }),
})
