/**
 * POS Devices Router
 * Handles device registration, status, and heartbeat for outlet binding
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { supabaseAdmin } from '@/infra/supabase/server'
import { TRPCError } from '@trpc/server'

export const posDevicesRouter = router({
  /**
   * List all POS devices for the tenant
   * Includes outlet info
   */
  list: protectedProcedure
    .input(
      z.object({
        outletId: z.string().uuid().optional(),
        status: z.enum(['active', 'inactive', 'maintenance']).optional(),
      }).optional(),
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      let query = supabaseAdmin
        .from('pos_devices')
        .select(`
          *,
          outlet:outlet_id (
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (input?.outletId) {
        query = query.eq('outlet_id', input.outletId)
      }

      if (input?.status) {
        query = query.eq('status', input.status)
      }

      const { data: devices, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch devices: ${error.message}`,
        })
      }

      return devices || []
    }),

  /**
   * Register a new POS device for an outlet
   * Validates outlet belongs to tenant
   */
  register: adminProcedure
    .input(
      z.object({
        outletId: z.string().uuid(),
        name: z.string().min(1),
        deviceCode: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      // Validate outlet belongs to tenant
      const { data: outlet, error: outletError } = await supabaseAdmin
        .from('outlets')
        .select('id')
        .eq('id', input.outletId)
        .eq('owner_id', tenantId)
        .single()

      if (outletError || !outlet) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Outlet not found or does not belong to this tenant',
        })
      }

      // Check for duplicate device_code
      const { data: existing } = await supabaseAdmin
        .from('pos_devices')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('device_code', input.deviceCode)
        .single()

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A device with this code already exists',
        })
      }

      const { data: device, error } = await supabaseAdmin
        .from('pos_devices')
        .insert({
          tenant_id: tenantId,
          outlet_id: input.outletId,
          name: input.name,
          device_code: input.deviceCode,
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to register device: ${error.message}`,
        })
      }

      return device
    }),

  /**
   * Update device status
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        deviceId: z.string().uuid(),
        status: z.enum(['active', 'inactive', 'maintenance']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: device, error: fetchError } = await supabaseAdmin
        .from('pos_devices')
        .select('id, tenant_id')
        .eq('id', input.deviceId)
        .single()

      if (fetchError || !device) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Device not found' })
      }

      if (device.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      const { data: updated, error } = await supabaseAdmin
        .from('pos_devices')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.deviceId)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update device status: ${error.message}`,
        })
      }

      return updated
    }),

  /**
   * Update device heartbeat (last_seen_at)
   */
  heartbeat: protectedProcedure
    .input(z.object({ deviceId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: device, error: fetchError } = await supabaseAdmin
        .from('pos_devices')
        .select('id, tenant_id')
        .eq('id', input.deviceId)
        .single()

      if (fetchError || !device) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Device not found' })
      }

      if (device.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      const { data: updated, error } = await supabaseAdmin
        .from('pos_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', input.deviceId)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update heartbeat: ${error.message}`,
        })
      }

      return updated
    }),

  /**
   * Delete a POS device
   */
  delete: adminProcedure
    .input(z.object({ deviceId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!

      const { data: device, error: fetchError } = await supabaseAdmin
        .from('pos_devices')
        .select('id, tenant_id')
        .eq('id', input.deviceId)
        .single()

      if (fetchError || !device) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Device not found' })
      }

      if (device.tenant_id !== tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
      }

      const { error } = await supabaseAdmin
        .from('pos_devices')
        .delete()
        .eq('id', input.deviceId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete device: ${error.message}`,
        })
      }

      return { success: true }
    }),
})

export type PosDevicesRouter = typeof posDevicesRouter
