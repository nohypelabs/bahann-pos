import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException'
import type {
  Customer,
  LoyaltyProgram,
  Mechanic,
  MemberVoucher,
  ServiceOrder,
  ServiceOrderSummary,
  StampCard,
  StampProgramConfig,
  Vehicle,
  VoucherReward,
} from '@/domain/entities/Workshop'
import type { WorkshopRepository } from '@/domain/repositories/WorkshopRepository'
import { checkManualDiscount, justifyDiscount, type DiscountJustification } from '@/domain/sales/manualDiscount'
import { normalizePhone, normalizePlate, readStampConfig, validateStampConfig } from '@/domain/workshop/rules'

const clean = (s: string | null | undefined): string | null => (s && s.trim() ? s.trim() : null)

export interface PlateLookup {
  plateNumber: string
  vehicle: Vehicle | null
  owner: Customer | null
  stampCard: StampCard | null
  vouchers: MemberVoucher[]
  openServiceOrderId: string | null
  recentServices: ServiceOrder[]
}

export interface OpenServiceOrderInput {
  /** Client-generated id (offline notes). */
  id?: string
  openedAt?: string
  outletId: string
  plate: string
  /** Used only when the plate is new. */
  brand?: string | null
  model?: string | null
  /** Overrides the vehicle's owner for this visit; a new vehicle is assigned to them. */
  customerId?: string | null
  mechanicId?: string | null
  complaint?: string | null
  odometerKm?: number | null
}

/**
 * Workshop rules on top of WorkshopRepository: normalised plates and phones,
 * one open note per vehicle, edits only on open notes, valid loyalty settings.
 * Outlet access is checked by the caller (tRPC router).
 */
export class WorkshopUseCase {
  constructor(private readonly repo: WorkshopRepository) {}

  // ─── Customers and members ──────────────────────────────────────────────
  searchCustomers(tenantId: string, query: string): Promise<Customer[]> {
    return this.repo.searchCustomers(tenantId, query, 20)
  }

  async createCustomer(
    tenantId: string,
    userId: string,
    input: { id?: string; name: string; phone?: string | null; notes?: string | null; enrollAsMember?: boolean },
  ): Promise<Customer> {
    const customer = await this.repo.createCustomer(
      tenantId,
      { id: input.id, name: input.name.trim(), phone: normalizePhone(input.phone), notes: clean(input.notes) },
      userId,
    )
    return input.enrollAsMember ? this.repo.enrollMember(tenantId, customer.id) : customer
  }

  async updateCustomer(
    tenantId: string,
    id: string,
    input: { name: string; phone?: string | null; notes?: string | null },
  ): Promise<Customer> {
    return this.repo.updateCustomer(tenantId, id, {
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      notes: clean(input.notes),
    })
  }

  async enrollMember(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.requireCustomer(tenantId, id)
    if (customer.isMember) throw new DomainException(DomainErrorCode.ALREADY_MEMBER, 'Already a member')
    return this.repo.enrollMember(tenantId, id)
  }

  async getCustomerDetail(tenantId: string, id: string) {
    const customer = await this.requireCustomer(tenantId, id)
    const [vehicles, stampCard, vouchers] = await Promise.all([
      this.repo.listVehiclesByCustomer(tenantId, id),
      this.getStampCard(tenantId, customer),
      this.repo.listVouchers(tenantId, id),
    ])
    return { customer, vehicles, stampCard, vouchers }
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────
  /** Everything the cashier needs after typing a plate. */
  async lookupPlate(tenantId: string, rawPlate: string): Promise<PlateLookup> {
    const plateNumber = normalizePlate(rawPlate)
    const vehicle = await this.repo.findVehicleByPlate(tenantId, plateNumber)
    if (!vehicle) {
      return { plateNumber, vehicle: null, owner: null, stampCard: null, vouchers: [], openServiceOrderId: null, recentServices: [] }
    }
    const owner = vehicle.customerId ? await this.repo.getCustomer(tenantId, vehicle.customerId) : null
    const [stampCard, vouchers, openServiceOrderId, recentServices] = await Promise.all([
      owner ? this.getStampCard(tenantId, owner) : Promise.resolve(null),
      owner ? this.repo.listVouchers(tenantId, owner.id) : Promise.resolve([]),
      this.repo.findOpenServiceOrderId(tenantId, vehicle.id),
      this.repo.listServiceHistory(tenantId, vehicle.id, 3),
    ])
    return { plateNumber, vehicle, owner, stampCard, vouchers: vouchers.filter(isUsable), openServiceOrderId, recentServices }
  }

  async saveVehicle(
    tenantId: string,
    input: { id?: string; plate: string; brand?: string | null; model?: string | null; customerId?: string | null },
  ): Promise<Vehicle> {
    const customerId = input.customerId ?? null
    if (customerId) await this.requireCustomer(tenantId, customerId)
    const values = { plateNumber: normalizePlate(input.plate), brand: clean(input.brand), model: clean(input.model), customerId }
    return input.id ? this.repo.updateVehicle(tenantId, input.id, values) : this.repo.createVehicle(tenantId, values)
  }

  listServiceHistory(tenantId: string, vehicleId: string): Promise<ServiceOrder[]> {
    return this.repo.listServiceHistory(tenantId, vehicleId, 50)
  }

  // ─── Mechanics ──────────────────────────────────────────────────────────
  listMechanics(tenantId: string, includeInactive = false): Promise<Mechanic[]> {
    return this.repo.listMechanics(tenantId, includeInactive)
  }

  saveMechanic(
    tenantId: string,
    input: { id?: string; name: string; phone?: string | null; isActive?: boolean },
  ): Promise<Mechanic> {
    return this.repo.saveMechanic(tenantId, {
      id: input.id,
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      isActive: input.isActive ?? true,
    })
  }

  // ─── Service notes ──────────────────────────────────────────────────────
  listOpenServiceOrders(tenantId: string, outletIds: string[]): Promise<ServiceOrderSummary[]> {
    return this.repo.listOpenServiceOrders(tenantId, outletIds)
  }

  /** Opens a note for a plate, creating the vehicle when it is new. Returns the note id. */
  async openServiceOrder(tenantId: string, userId: string, input: OpenServiceOrderInput): Promise<string> {
    const plateNumber = normalizePlate(input.plate)
    if (input.customerId) await this.requireCustomer(tenantId, input.customerId)
    if (input.mechanicId) await this.requireMechanic(tenantId, input.mechanicId)

    let vehicle = await this.repo.findVehicleByPlate(tenantId, plateNumber)
    if (!vehicle) {
      vehicle = await this.repo.createVehicle(tenantId, {
        plateNumber,
        brand: clean(input.brand),
        model: clean(input.model),
        customerId: input.customerId ?? null,
      })
    }

    return this.repo.createServiceOrder(tenantId, {
      id: input.id,
      openedAt: input.openedAt,
      outletId: input.outletId,
      vehicleId: vehicle.id,
      customerId: input.customerId ?? vehicle.customerId,
      mechanicId: input.mechanicId ?? null,
      complaint: clean(input.complaint),
      odometerKm: input.odometerKm ?? null,
      openedBy: userId,
    })
  }

  async getServiceOrder(tenantId: string, id: string): Promise<ServiceOrder & { stampCard: StampCard | null; vouchers: MemberVoucher[] }> {
    const order = await this.requireOrder(tenantId, id)
    const [stampCard, vouchers] = order.customer
      ? await Promise.all([this.getStampCard(tenantId, order.customer), this.repo.listVouchers(tenantId, order.customer.id)])
      : [null, []]
    return { ...order, stampCard, vouchers: vouchers.filter(isUsable) }
  }

  async updateServiceOrder(
    tenantId: string,
    id: string,
    input: { mechanicId?: string | null; complaint?: string | null; odometerKm?: number | null },
  ): Promise<void> {
    await this.requireOpenOrder(tenantId, id)
    if (input.mechanicId) await this.requireMechanic(tenantId, input.mechanicId)
    await this.repo.updateServiceOrder(tenantId, id, {
      mechanicId: input.mechanicId ?? null,
      complaint: clean(input.complaint),
      odometerKm: input.odometerKm ?? null,
    })
  }

  /**
   * Sets a line's quantity (0 removes it) and an optional agreed price. A price
   * below the list price needs a reason; a line already saved at that price keeps
   * its reason when only the quantity changes.
   */
  async setServiceOrderItem(
    tenantId: string,
    userId: string,
    orderId: string,
    input: { productId: string; quantity: number; unitPrice?: number | null; priceReason?: string | null; priceNote?: string | null },
  ): Promise<void> {
    const order = await this.requireOpenOrder(tenantId, orderId)
    if (input.quantity <= 0) {
      await this.repo.removeServiceOrderItem(tenantId, orderId, input.productId)
      return
    }
    const listPrice = await this.repo.productPrice(tenantId, input.productId)
    if (listPrice === null) {
      throw new DomainException(DomainErrorCode.ITEM_NOT_FOUND, 'Product not found')
    }
    const unitPrice = input.unitPrice ?? null
    let justification: DiscountJustification | null = null
    if (unitPrice !== null && unitPrice < listPrice) {
      const saved = order.items.find((i) => i.productId === input.productId)
      justification = !input.priceReason && saved?.unitPrice === unitPrice && saved.priceReason
        ? { reason: saved.priceReason, note: saved.priceNote }
        : justifyDiscount({ reason: input.priceReason, note: input.priceNote })
    }
    await this.repo.setServiceOrderItem(tenantId, orderId, {
      productId: input.productId,
      quantity: input.quantity,
      unitPrice,
      priceReason: justification?.reason ?? null,
      priceNote: justification?.note ?? null,
      addedBy: userId,
    })
  }

  /** Sets (or with amount 0 clears) an amount off the whole note, with a reason. */
  async setServiceOrderDiscount(
    tenantId: string,
    orderId: string,
    input: { amount: number; reason?: string | null; note?: string | null },
  ): Promise<void> {
    const order = await this.requireOpenOrder(tenantId, orderId)
    const subtotal = order.items.reduce((sum, i) => sum + (i.unitPrice ?? i.listPrice) * i.quantity, 0)
    await this.repo.setServiceOrderDiscount(tenantId, orderId, checkManualDiscount(input, subtotal))
  }

  async cancelServiceOrder(tenantId: string, userId: string, id: string, reason: string): Promise<ServiceOrder> {
    const why = reason.trim()
    if (!why) throw new DomainException(DomainErrorCode.CANCEL_REASON_REQUIRED, 'A cancellation reason is required')
    const order = await this.requireOpenOrder(tenantId, id)
    await this.repo.cancelServiceOrder(tenantId, id, why, userId)
    return order
  }

  reservedQuantities(tenantId: string, productIds: string[]): Promise<Record<string, number>> {
    return this.repo.reservedQuantities(tenantId, productIds)
  }

  // ─── Loyalty ────────────────────────────────────────────────────────────
  /** The stamp program, with defaults filled in. Null when the tenant has never set it up. */
  async getStampProgram(tenantId: string): Promise<LoyaltyProgram | null> {
    const program = await this.repo.getLoyaltyProgram(tenantId, 'stamp')
    return program ? { ...program, config: readStampConfig(program.config) } : null
  }

  async saveStampProgram(
    tenantId: string,
    input: { name: string; isActive: boolean; config: StampProgramConfig },
  ): Promise<LoyaltyProgram> {
    const config = validateStampConfig(input.config)
    const saved = await this.repo.saveLoyaltyProgram(tenantId, 'stamp', { name: input.name.trim(), isActive: input.isActive, config })
    return { ...saved, config: readStampConfig(saved.config) }
  }

  async issueManualVoucher(
    tenantId: string,
    userId: string,
    input: { customerId: string; reward: VoucherReward; validDays: number | null },
  ): Promise<MemberVoucher> {
    const customer = await this.requireCustomer(tenantId, input.customerId)
    if (!customer.isMember) throw new DomainException(DomainErrorCode.NOT_A_MEMBER, 'Vouchers are for members only')
    // Reuse the stamp-config validation for the reward itself.
    validateStampConfig({ requiredStamps: 1, minSpend: 0, reward: input.reward, voucherValidDays: input.validDays })
    const expiresAt = input.validDays ? new Date(Date.now() + input.validDays * 86_400_000).toISOString() : null
    return this.repo.issueManualVoucher(tenantId, { customerId: customer.id, reward: input.reward, expiresAt, createdBy: userId })
  }

  /**
   * Voids an unused voucher. Voiding a stamp reward by hand does not give the
   * stamps back: that only happens automatically when the sale behind it is voided.
   */
  async voidVoucher(tenantId: string, voucherId: string, reason: string): Promise<void> {
    const why = reason.trim()
    if (!why) throw new DomainException(DomainErrorCode.CANCEL_REASON_REQUIRED, 'A reason is required')
    await this.repo.voidVoucher(tenantId, voucherId, why)
  }

  // ─── helpers ────────────────────────────────────────────────────────────
  private async getStampCard(tenantId: string, customer: Customer): Promise<StampCard | null> {
    if (!customer.isMember) return null
    const program = await this.getStampProgram(tenantId)
    if (!program) return null
    const balance = await this.repo.getStampBalance(tenantId, program.id, customer.id)
    return { programActive: program.isActive, balance: Math.max(0, balance), required: program.config.requiredStamps }
  }

  private async requireCustomer(tenantId: string, id: string): Promise<Customer> {
    const c = await this.repo.getCustomer(tenantId, id)
    if (!c) throw new DomainException(DomainErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found')
    return c
  }

  private async requireMechanic(tenantId: string, id: string): Promise<Mechanic> {
    const m = await this.repo.getMechanic(tenantId, id)
    if (!m) throw new DomainException(DomainErrorCode.MECHANIC_NOT_FOUND, 'Mechanic not found')
    return m
  }

  private async requireOrder(tenantId: string, id: string): Promise<ServiceOrder> {
    const o = await this.repo.getServiceOrder(tenantId, id)
    if (!o) throw new DomainException(DomainErrorCode.SERVICE_ORDER_NOT_FOUND, 'Service note not found')
    return o
  }

  private async requireOpenOrder(tenantId: string, id: string): Promise<ServiceOrder> {
    const o = await this.requireOrder(tenantId, id)
    if (o.status !== 'open') throw new DomainException(DomainErrorCode.SERVICE_ORDER_NOT_OPEN, 'Service note is not open')
    return o
  }
}

/** Unused and unexpired. */
function isUsable(v: MemberVoucher): boolean {
  return v.status === 'issued' && (!v.expiresAt || new Date(v.expiresAt).getTime() > Date.now())
}
