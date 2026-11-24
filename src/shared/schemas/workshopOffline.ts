import { z } from 'zod/v4'

// Operations a workshop cashier station records locally and sends to the server
// (workshop.offline.push). Every id is generated on the client, so replaying an
// operation after a lost response finds the same rows instead of making new ones.

const uuid = z.string().uuid()
const text = (max: number) => z.string().trim().max(max).nullish()

const base = {
  /** Idempotency key: the server records each opId once. */
  opId: uuid,
  /** When it happened on the client (ISO). */
  at: z.string().datetime(),
}

export const offlineOpSchema = z.discriminatedUnion('kind', [
  z.object({
    ...base,
    kind: z.literal('customer.create'),
    customer: z.object({
      id: uuid,
      name: z.string().trim().min(1).max(100),
      phone: text(20),
      member: z.boolean(),
    }),
  }),
  z.object({
    ...base,
    kind: z.literal('note.open'),
    note: z.object({
      id: uuid,
      outletId: uuid,
      plate: z.string().min(1).max(20),
      brand: text(50),
      model: text(50),
      customerId: uuid.nullish(),
      mechanicId: uuid.nullish(),
      complaint: text(1000),
      odometerKm: z.number().int().min(0).max(9_999_999).nullish(),
    }),
  }),
  z.object({
    ...base,
    kind: z.literal('note.update'),
    noteId: uuid,
    mechanicId: uuid.nullable(),
    complaint: text(1000),
    odometerKm: z.number().int().min(0).max(9_999_999).nullable(),
  }),
  z.object({
    ...base,
    kind: z.literal('note.setItem'),
    noteId: uuid,
    productId: uuid,
    quantity: z.number().int().min(0).max(9999),
    unitPrice: z.number().min(0).max(1_000_000_000).nullable(),
  }),
  z.object({
    ...base,
    kind: z.literal('note.cancel'),
    noteId: uuid,
    reason: z.string().trim().min(1).max(500),
  }),
  z.object({
    ...base,
    kind: z.literal('note.payCash'),
    noteId: uuid,
    outletId: uuid,
    shiftId: uuid,
    deviceId: uuid.nullish(),
    /** The receipt number printed offline; becomes the sale's transaction number. */
    transactionNumber: z.string().min(1).max(60),
    amountPaid: z.number().min(0),
    /**
     * The lines and prices the customer was charged. The server pins the note to
     * them before recording the sale, so a price changed meanwhile does not change
     * what this sale says was paid.
     */
    lines: z.array(z.object({
      productId: uuid,
      quantity: z.number().int().min(1).max(9999),
      unitPrice: z.number().min(0).max(1_000_000_000),
    })).min(1).max(500),
    total: z.number().min(0),
  }),
])

export type OfflineOp = z.infer<typeof offlineOpSchema>
export type OfflineOpKind = OfflineOp['kind']

export const offlinePushSchema = z.object({
  deviceId: z.string().max(100).optional(),
  ops: z.array(offlineOpSchema).min(1).max(200),
})

/** Per-operation result of a push. */
export type OfflineOpResult =
  | { opId: string; status: 'done'; result?: unknown }
  /** Refused for good (a business rule); the client shows it for review. */
  | { opId: string; status: 'failed'; error: string }
  /** Not processed (server error, or another push is on it); send again later. */
  | { opId: string; status: 'retry'; error?: string }
