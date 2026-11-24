import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { container } from '@/infra/container'
import { createAuditLog } from '@/lib/audit'
import { DomainException } from '@/domain/errors/DomainException'
import { assertOutletAccessible, getUserOutletIds } from '@/server/lib/tenant'

/**
 * Workshop (bengkel) module: customers and members, vehicles, mechanics, open
 * service notes, and the stamp card. Domain errors are returned with their code
 * as the message, so the client can show DOMAIN_ERROR_MESSAGES_ID/EN[code].
 */

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof DomainException) throw new TRPCError({ code: 'BAD_REQUEST', message: err.code, cause: err })
    throw err
  }
}

const uc = () => container.workshopUseCase()
const id = z.string().uuid()
const optionalText = (max: number) => z.string().max(max).nullish()

const rewardSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('free_service'), maxValue: z.number().int().positive().nullable() }),
  z.object({ type: z.literal('fixed'), amount: z.number().int().positive() }),
  z.object({ type: z.literal('percent'), percent: z.number().min(1).max(100), maxValue: z.number().int().positive().nullable() }),
])

/** Loads a note and checks the user may work at its outlet. */
async function noteInAccessibleOutlet(userId: string, tenantId: string, noteId: string) {
  const note = await run(() => uc().getServiceOrder(tenantId, noteId))
  await assertOutletAccessible(userId, tenantId, note.outletId)
  return note
}

const customersRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().max(100).default('') }))
    .query(({ input, ctx }) => run(() => uc().searchCustomers(ctx.session.tenantId!, input.query))),

  detail: protectedProcedure
    .input(z.object({ id }))
    .query(({ input, ctx }) => run(() => uc().getCustomerDetail(ctx.session.tenantId!, input.id))),

  create: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(100),
      phone: optionalText(20),
      notes: optionalText(500),
      enrollAsMember: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const customer = await run(() => uc().createCustomer(ctx.session.tenantId!, ctx.userId, input))
      await createAuditLog({
        userId: ctx.userId, userEmail: ctx.session.email || 'unknown', action: 'CREATE', entityType: 'customer',
        entityId: customer.id, metadata: { name: customer.name, isMember: customer.isMember, memberCode: customer.memberCode },
      })
      return customer
    }),

  update: protectedProcedure
    .input(z.object({ id, name: z.string().trim().min(1).max(100), phone: optionalText(20), notes: optionalText(500) }))
    .mutation(({ input, ctx }) => run(() => uc().updateCustomer(ctx.session.tenantId!, input.id, input))),

  enroll: protectedProcedure
    .input(z.object({ id }))
    .mutation(async ({ input, ctx }) => {
      const customer = await run(() => uc().enrollMember(ctx.session.tenantId!, input.id))
      await createAuditLog({
        userId: ctx.userId, userEmail: ctx.session.email || 'unknown', action: 'UPDATE', entityType: 'customer',
        entityId: customer.id, metadata: { enrolled: true, memberCode: customer.memberCode },
      })
      return customer
    }),
})

const vehiclesRouter = router({
  lookup: protectedProcedure
    .input(z.object({ plate: z.string().min(1).max(20) }))
    .query(({ input, ctx }) => run(() => uc().lookupPlate(ctx.session.tenantId!, input.plate))),

  save: protectedProcedure
    .input(z.object({
      id: id.optional(),
      plate: z.string().min(1).max(20),
      brand: optionalText(50),
      model: optionalText(50),
      customerId: id.nullish(),
    }))
    .mutation(({ input, ctx }) => run(() => uc().saveVehicle(ctx.session.tenantId!, input))),

  history: protectedProcedure
    .input(z.object({ vehicleId: id }))
    .query(({ input, ctx }) => run(() => uc().listServiceHistory(ctx.session.tenantId!, input.vehicleId))),
})

const mechanicsRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().default(false) }).optional())
    .query(({ input, ctx }) => run(() => uc().listMechanics(ctx.session.tenantId!, input?.includeInactive ?? false))),

  save: adminProcedure
    .input(z.object({ id: id.optional(), name: z.string().trim().min(1).max(100), phone: optionalText(20), isActive: z.boolean().default(true) }))
    .mutation(async ({ input, ctx }) => {
      const mechanic = await run(() => uc().saveMechanic(ctx.session!.tenantId!, input))
      await createAuditLog({
        userId: ctx.userId!, userEmail: ctx.session!.email || 'unknown', action: input.id ? 'UPDATE' : 'CREATE',
        entityType: 'mechanic', entityId: mechanic.id, metadata: { name: mechanic.name, isActive: mechanic.isActive },
      })
      return mechanic
    }),
})

const notesRouter = router({
  listOpen: protectedProcedure
    .input(z.object({ outletId: id.optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      let outletIds = await getUserOutletIds(ctx.userId, tenantId)
      if (input?.outletId) {
        await assertOutletAccessible(ctx.userId, tenantId, input.outletId)
        outletIds = [input.outletId]
      }
      return run(() => uc().listOpenServiceOrders(tenantId, outletIds))
    }),

  get: protectedProcedure
    .input(z.object({ id }))
    .query(({ input, ctx }) => noteInAccessibleOutlet(ctx.userId, ctx.session.tenantId!, input.id)),

  open: protectedProcedure
    .input(z.object({
      outletId: id,
      plate: z.string().min(1).max(20),
      brand: optionalText(50),
      model: optionalText(50),
      customerId: id.nullish(),
      mechanicId: id.nullish(),
      complaint: optionalText(1000),
      odometerKm: z.number().int().min(0).max(9_999_999).nullish(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await assertOutletAccessible(ctx.userId, tenantId, input.outletId)
      const noteId = await run(() => uc().openServiceOrder(tenantId, ctx.userId, input))
      return { id: noteId }
    }),

  update: protectedProcedure
    .input(z.object({
      id,
      mechanicId: id.nullish(),
      complaint: optionalText(1000),
      odometerKm: z.number().int().min(0).max(9_999_999).nullish(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await noteInAccessibleOutlet(ctx.userId, tenantId, input.id)
      await run(() => uc().updateServiceOrder(tenantId, input.id, input))
      return { success: true }
    }),

  setItem: protectedProcedure
    .input(z.object({
      id,
      productId: id,
      quantity: z.number().int().min(0).max(9999),
      unitPrice: z.number().min(0).max(1_000_000_000).nullish(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await noteInAccessibleOutlet(ctx.userId, tenantId, input.id)
      await run(() => uc().setServiceOrderItem(tenantId, ctx.userId, input.id, input))
      return { success: true }
    }),

  cancel: protectedProcedure
    .input(z.object({ id, reason: z.string().trim().min(1).max(500) }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.session.tenantId!
      await noteInAccessibleOutlet(ctx.userId, tenantId, input.id)
      const note = await run(() => uc().cancelServiceOrder(tenantId, ctx.userId, input.id, input.reason))
      await createAuditLog({
        userId: ctx.userId, userEmail: ctx.session.email || 'unknown', action: 'UPDATE', entityType: 'service_order',
        entityId: note.id,
        changes: { before: { status: 'open' }, after: { status: 'cancelled' } },
        metadata: {
          reason: input.reason,
          plate: note.vehicle.plateNumber,
          items: note.items.map((i) => ({ sku: i.productSku, quantity: i.quantity })),
        },
      })
      return { success: true }
    }),

  /** Quantities of products sitting in open notes, for the "reserved" hint on stock. */
  reserved: protectedProcedure
    .input(z.object({ productIds: z.array(id).max(500) }))
    .query(({ input, ctx }) => run(() => uc().reservedQuantities(ctx.session.tenantId!, input.productIds))),
})

const loyaltyRouter = router({
  stampProgram: protectedProcedure.query(({ ctx }) => run(() => uc().getStampProgram(ctx.session.tenantId!))),

  saveStampProgram: adminProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(100),
      isActive: z.boolean(),
      config: z.object({
        requiredStamps: z.number().int().min(1).max(100),
        minSpend: z.number().min(0),
        reward: rewardSchema,
        voucherValidDays: z.number().int().min(1).max(3650).nullable(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const program = await run(() => uc().saveStampProgram(ctx.session!.tenantId!, input))
      await createAuditLog({
        userId: ctx.userId!, userEmail: ctx.session!.email || 'unknown', action: 'UPDATE', entityType: 'loyalty_program',
        entityId: program.id, changes: { after: { isActive: program.isActive, config: program.config } },
      })
      return program
    }),

  issueVoucher: adminProcedure
    .input(z.object({ customerId: id, reward: rewardSchema, validDays: z.number().int().min(1).max(3650).nullable() }))
    .mutation(async ({ input, ctx }) => {
      const voucher = await run(() => uc().issueManualVoucher(ctx.session!.tenantId!, ctx.userId!, input))
      await createAuditLog({
        userId: ctx.userId!, userEmail: ctx.session!.email || 'unknown', action: 'CREATE', entityType: 'voucher',
        entityId: voucher.id, metadata: { customerId: input.customerId, code: voucher.code, reward: voucher.reward },
      })
      return voucher
    }),

  voidVoucher: adminProcedure
    .input(z.object({ id, reason: z.string().trim().min(1).max(500) }))
    .mutation(async ({ input, ctx }) => {
      await run(() => uc().voidVoucher(ctx.session!.tenantId!, input.id, input.reason))
      await createAuditLog({
        userId: ctx.userId!, userEmail: ctx.session!.email || 'unknown', action: 'UPDATE', entityType: 'voucher',
        entityId: input.id, changes: { after: { status: 'void' } }, metadata: { reason: input.reason },
      })
      return { success: true }
    }),
})

export const workshopRouter = router({
  customers: customersRouter,
  vehicles: vehiclesRouter,
  mechanics: mechanicsRouter,
  notes: notesRouter,
  loyalty: loyaltyRouter,
})
