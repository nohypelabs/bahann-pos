import { TRPCError } from '@trpc/server'
import { router } from '../trpc'
import { container } from '@/infra/container'
import { supabaseAdmin } from '@/infra/supabase/server'
import { DomainException } from '@/domain/errors/DomainException'
import { createAuditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { assertOutletAccessible, getUserOutletIds } from '@/server/lib/tenant'
import { run, workshopProcedure } from '@/server/lib/workshopProcedures'
import { runCheckout } from '@/server/routers/payments'
import { offlinePushSchema, type OfflineOp, type OfflineOpResult } from '@/shared/schemas/workshopOffline'

/**
 * Offline mode for the workshop cashier station.
 *
 *   snapshot   everything the station needs to keep working without internet
 *   openNotes  the open service notes (refreshed more often than the snapshot)
 *   push       the operations recorded on the station, applied in order, once each
 */

const uc = () => container.workshopUseCase()
const repo = () => container.workshopRepo()
const PAGE = 1000

interface OpContext {
  userId: string
  tenantId: string
  session: { tenantId?: string | null; email?: string | null }
}

/** Reads every row of a tenant's table, past PostgREST's 1000-row cap. */
async function selectAll<T>(table: string, columns: string, tenantId: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from(table).select(columns).eq('tenant_id', tenantId).order('id').range(from, from + PAGE - 1)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return rows
  }
}

/** Errors that will not go away by sending the same operation again. */
function isPermanent(err: unknown): boolean {
  if (err instanceof DomainException) return true
  if (err instanceof TRPCError) return ['BAD_REQUEST', 'NOT_FOUND', 'FORBIDDEN', 'CONFLICT', 'PRECONDITION_FAILED'].includes(err.code)
  return false
}

function errorMessage(err: unknown): string {
  if (err instanceof DomainException) return err.code
  return err instanceof Error ? err.message : String(err)
}

async function applyOp(ctx: OpContext, op: OfflineOp): Promise<unknown> {
  const { tenantId, userId } = ctx
  switch (op.kind) {
    case 'customer.create': {
      const existing = await repo().getCustomer(tenantId, op.customer.id)
      if (existing) return { id: existing.id, memberCode: existing.memberCode }
      const created = await run(() => uc().createCustomer(tenantId, userId, {
        id: op.customer.id, name: op.customer.name, phone: op.customer.phone ?? null, enrollAsMember: op.customer.member,
      }))
      return { id: created.id, memberCode: created.memberCode }
    }

    case 'note.open': {
      const n = op.note
      const existing = await repo().getServiceOrder(tenantId, n.id)
      if (existing) return { id: existing.id }
      await assertOutletAccessible(userId, tenantId, n.outletId)
      await run(() => uc().openServiceOrder(tenantId, userId, {
        id: n.id, openedAt: op.at, outletId: n.outletId, plate: n.plate, brand: n.brand ?? null, model: n.model ?? null,
        customerId: n.customerId ?? null, mechanicId: n.mechanicId ?? null, complaint: n.complaint ?? null,
        odometerKm: n.odometerKm ?? null,
      }))
      // A known motor without an owner gets the customer chosen for this visit.
      if (n.customerId) {
        const opened = await repo().getServiceOrder(tenantId, n.id)
        const vehicle = opened?.vehicle
        if (vehicle && !vehicle.customerId) {
          await run(() => uc().saveVehicle(tenantId, {
            id: vehicle.id, plate: vehicle.plateNumber, brand: vehicle.brand, model: vehicle.model, customerId: n.customerId,
          }))
        }
      }
      return { id: n.id }
    }

    case 'note.update': {
      await noteAtAccessibleOutlet(ctx, op.noteId)
      await run(() => uc().updateServiceOrder(tenantId, op.noteId, {
        mechanicId: op.mechanicId, complaint: op.complaint ?? null, odometerKm: op.odometerKm,
      }))
      return null
    }

    case 'note.setItem': {
      await noteAtAccessibleOutlet(ctx, op.noteId)
      await run(() => uc().setServiceOrderItem(tenantId, userId, op.noteId, {
        productId: op.productId, quantity: op.quantity, unitPrice: op.unitPrice, priceReason: op.priceReason, priceNote: op.priceNote,
      }))
      return null
    }

    case 'note.setDiscount': {
      await noteAtAccessibleOutlet(ctx, op.noteId)
      await run(() => uc().setServiceOrderDiscount(tenantId, op.noteId, { amount: op.amount, reason: op.reason, note: op.note }))
      return null
    }

    case 'note.cancel': {
      const note = await noteAtAccessibleOutlet(ctx, op.noteId)
      if (note.status === 'cancelled') return null
      await run(() => uc().cancelServiceOrder(tenantId, userId, op.noteId, op.reason))
      return null
    }

    case 'note.payCash': {
      const note = await noteAtAccessibleOutlet(ctx, op.noteId)
      if (note.status === 'paid') return { transactionId: note.transactionId, replayed: true }
      if (note.status !== 'open') throw new TRPCError({ code: 'BAD_REQUEST', message: 'SERVICE_ORDER_NOT_OPEN' })

      // Pin the note to exactly what was charged on the station.
      const charged = new Map(op.lines.map((l) => [l.productId, l]))
      for (const item of note.items) {
        if (!charged.has(item.productId)) {
          await run(() => uc().setServiceOrderItem(tenantId, userId, op.noteId, { productId: item.productId, quantity: 0 }))
        }
      }
      for (const line of op.lines) {
        await run(() => uc().setServiceOrderItem(tenantId, userId, op.noteId, line))
      }
      await run(() => uc().setServiceOrderDiscount(tenantId, op.noteId, op.discount ?? { amount: 0 }))

      const result = await runCheckout(ctx, {
        transactionId: op.transactionNumber,
        outletId: op.outletId,
        shiftId: op.shiftId,
        deviceId: op.deviceId ?? undefined,
        method: 'cash',
        amountPaid: op.amountPaid,
        items: op.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        discountAmount: 0,
        serviceOrderId: op.noteId,
      }, { offline: { occurredAt: new Date(op.at) } })

      if (Math.round(result.amount) !== Math.round(op.total)) {
        logger.warn('Offline sale total differs from what the station charged', {
          tenantId, noteId: op.noteId, charged: op.total, recorded: result.amount,
        })
      }
      return { transactionId: result.transactionId, transactionNumber: result.transactionNumber, loyalty: result.loyalty }
    }
  }
}

async function noteAtAccessibleOutlet(ctx: OpContext, noteId: string) {
  const note = await repo().getServiceOrder(ctx.tenantId, noteId)
  if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'SERVICE_ORDER_NOT_FOUND' })
  await assertOutletAccessible(ctx.userId, ctx.tenantId, note.outletId)
  return note
}

export const workshopOfflineRouter = router({
  /** Catalogue, stock, people, motors, mechanics and open shifts for the station's cache. */
  snapshot: workshopProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.tenantId!
    const outletIds = await getUserOutletIds(ctx.userId, tenantId)

    const [outlets, mechanics, catalogue, stock, customers, vehicles, shifts] = await Promise.all([
      supabaseAdmin.from('outlets').select('id, name, address').eq('tenant_id', tenantId).in('id', outletIds),
      repo().listMechanics(tenantId, false),
      container.listProductsUseCase().executeAll({ tenantId }),
      supabaseAdmin.rpc('current_stock_levels', { p_tenant_id: tenantId }),
      selectAll<{ id: string; name: string; phone: string | null; is_member: boolean; member_code: string | null }>(
        'customers', 'id, name, phone, is_member, member_code', tenantId),
      selectAll<{ id: string; plate_number: string; brand: string | null; model: string | null; customer_id: string | null }>(
        'vehicles', 'id, plate_number, brand, model, customer_id', tenantId),
      supabaseAdmin.from('shifts').select('id, outlet_id, device_id')
        .eq('tenant_id', tenantId).eq('cashier_user_id', ctx.userId).eq('status', 'open'),
    ])
    if (outlets.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: outlets.error.message })
    if (stock.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: stock.error.message })
    if (shifts.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: shifts.error.message })

    return {
      generatedAt: new Date().toISOString(),
      outlets: (outlets.data ?? []).map((o) => ({ id: o.id as string, name: o.name as string, address: (o.address as string | null) ?? '' })),
      mechanics: mechanics.map((m) => ({ id: m.id, name: m.name })),
      products: catalogue.products.map((p) => ({
        id: p.id, name: p.name, sku: p.sku, barcode: p.barcode ?? null, category: p.category ?? null,
        price: Number(p.price ?? 0), itemType: (p.item_type as string | null) ?? 'PRODUCT',
        stockBehavior: (p.stock_behavior as string | null) ?? 'TRACKED',
      })),
      stock: ((stock.data ?? []) as { product_id: string; outlet_id: string; stock: number }[])
        .filter((s) => outletIds.includes(s.outlet_id))
        .map((s) => ({ productId: s.product_id, outletId: s.outlet_id, stock: s.stock })),
      customers: customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, isMember: c.is_member, memberCode: c.member_code })),
      vehicles: vehicles.map((v) => ({ id: v.id, plateNumber: v.plate_number, brand: v.brand, model: v.model, customerId: v.customer_id })),
      shifts: (shifts.data ?? []).map((s) => ({ id: s.id as string, outletId: s.outlet_id as string, deviceId: (s.device_id as string | null) ?? null })),
    }
  }),

  /** Every open note at the user's outlets, with items. */
  openNotes: workshopProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.session.tenantId!
    const outletIds = await getUserOutletIds(ctx.userId, tenantId)
    const summaries = await run(() => uc().listOpenServiceOrders(tenantId, outletIds))
    const notes = await Promise.all(summaries.map((s) => repo().getServiceOrder(tenantId, s.id)))
    return notes.filter((n) => n !== null)
  }),

  /**
   * Applies the station's operations in order. Each opId runs once: a replay gets
   * the stored outcome. A business-rule refusal is stored as failed and processing
   * continues; a server error stops the batch so later operations keep their order.
   */
  push: workshopProcedure.input(offlinePushSchema).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.session.tenantId!
    const opCtx: OpContext = { userId: ctx.userId, tenantId, session: ctx.session }
    const results: OfflineOpResult[] = []

    for (const op of input.ops) {
      const { data: claimRows, error: claimError } = await supabaseAdmin.rpc('claim_offline_op', {
        p_tenant_id: tenantId, p_op_id: op.opId, p_kind: op.kind, p_user_id: ctx.userId,
        p_device_id: input.deviceId ?? null, p_occurred_at: op.at,
      })
      if (claimError) {
        results.push({ opId: op.opId, status: 'retry', error: claimError.message })
        break
      }
      const claim = (claimRows as { claimed: boolean; status: string; result: unknown; error: string | null }[])[0]
      if (!claim.claimed) {
        if (claim.status === 'done') { results.push({ opId: op.opId, status: 'done', result: claim.result }); continue }
        if (claim.status === 'failed') { results.push({ opId: op.opId, status: 'failed', error: claim.error ?? 'FAILED' }); continue }
        results.push({ opId: op.opId, status: 'retry', error: 'IN_PROGRESS' })
        break
      }

      try {
        const result = await applyOp(opCtx, op)
        await supabaseAdmin.from('offline_ops').update({ status: 'done', result: result ?? null, updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId).eq('op_id', op.opId)
        results.push({ opId: op.opId, status: 'done', result })
      } catch (err) {
        const message = errorMessage(err)
        if (isPermanent(err)) {
          await supabaseAdmin.from('offline_ops').update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
            .eq('tenant_id', tenantId).eq('op_id', op.opId)
          results.push({ opId: op.opId, status: 'failed', error: message })
          continue
        }
        // Let the operation be claimed again on the next push.
        await supabaseAdmin.from('offline_ops').delete().eq('tenant_id', tenantId).eq('op_id', op.opId).eq('status', 'processing')
        logger.error('Offline operation failed, will be retried', { tenantId, opId: op.opId, kind: op.kind, error: message })
        results.push({ opId: op.opId, status: 'retry', error: message })
        break
      }
    }

    const synced = results.filter((r) => r.status === 'done').length
    if (synced > 0) {
      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.session.email || 'unknown',
        action: 'CREATE',
        entityType: 'offline_sync',
        entityId: input.deviceId ?? 'station',
        metadata: { synced, failed: results.filter((r) => r.status === 'failed').length, kinds: input.ops.map((o) => o.kind) },
      })
    }
    return { results }
  }),
})
