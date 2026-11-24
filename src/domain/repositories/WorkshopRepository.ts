import type {
  Customer,
  LoyaltyProgram,
  LoyaltyProgramType,
  Mechanic,
  MemberVoucher,
  ServiceOrder,
  ServiceOrderSummary,
  Vehicle,
  VoucherReward,
} from '../entities/Workshop'

export interface CustomerInput {
  /** Set by an offline client, so a replayed create finds the same row. */
  id?: string
  name: string
  phone: string | null
  notes: string | null
}

export interface VehicleInput {
  plateNumber: string
  brand: string | null
  model: string | null
  customerId: string | null
}

export interface ServiceOrderInput {
  /** Set by an offline client, so a replayed open finds the same note. */
  id?: string
  /** When the note was opened on an offline client. */
  openedAt?: string
  outletId: string
  vehicleId: string
  customerId: string | null
  mechanicId: string | null
  complaint: string | null
  odometerKm: number | null
  openedBy: string
}

/**
 * Every method is scoped to tenantId: rows of another tenant are neither read nor written.
 */
export interface WorkshopRepository {
  // Customers and members
  searchCustomers(tenantId: string, query: string, limit: number): Promise<Customer[]>
  getCustomer(tenantId: string, id: string): Promise<Customer | null>
  createCustomer(tenantId: string, input: CustomerInput, createdBy: string): Promise<Customer>
  updateCustomer(tenantId: string, id: string, input: CustomerInput): Promise<Customer>
  /** Marks the customer a member with the next free member code (M0001, M0002, …). */
  enrollMember(tenantId: string, id: string): Promise<Customer>

  // Vehicles
  findVehicleByPlate(tenantId: string, plateNumber: string): Promise<Vehicle | null>
  getVehicle(tenantId: string, id: string): Promise<Vehicle | null>
  listVehiclesByCustomer(tenantId: string, customerId: string): Promise<Vehicle[]>
  createVehicle(tenantId: string, input: VehicleInput): Promise<Vehicle>
  updateVehicle(tenantId: string, id: string, input: VehicleInput): Promise<Vehicle>

  // Mechanics
  listMechanics(tenantId: string, includeInactive: boolean): Promise<Mechanic[]>
  getMechanic(tenantId: string, id: string): Promise<Mechanic | null>
  saveMechanic(tenantId: string, input: { id?: string; name: string; phone: string | null; isActive: boolean }): Promise<Mechanic>

  // Open service notes
  listOpenServiceOrders(tenantId: string, outletIds: string[]): Promise<ServiceOrderSummary[]>
  getServiceOrder(tenantId: string, id: string): Promise<ServiceOrder | null>
  findOpenServiceOrderId(tenantId: string, vehicleId: string): Promise<string | null>
  /** Throws VEHICLE_HAS_OPEN_NOTE when the vehicle already has one. */
  createServiceOrder(tenantId: string, input: ServiceOrderInput): Promise<string>
  updateServiceOrder(
    tenantId: string,
    id: string,
    input: { mechanicId: string | null; complaint: string | null; odometerKm: number | null },
  ): Promise<void>
  /** Sets a line's quantity and agreed price, adding the line if new. */
  setServiceOrderItem(
    tenantId: string,
    orderId: string,
    input: { productId: string; quantity: number; unitPrice: number | null; addedBy: string },
  ): Promise<void>
  removeServiceOrderItem(tenantId: string, orderId: string, productId: string): Promise<void>
  cancelServiceOrder(tenantId: string, id: string, reason: string, cancelledBy: string): Promise<void>
  /** Paid notes for a vehicle, newest first: its service history. */
  listServiceHistory(tenantId: string, vehicleId: string, limit: number): Promise<ServiceOrder[]>
  /** Quantities of each product sitting in open notes, for the "reserved" hint. */
  reservedQuantities(tenantId: string, productIds: string[]): Promise<Record<string, number>>
  productBelongsToTenant(tenantId: string, productId: string): Promise<boolean>

  // Loyalty
  getLoyaltyProgram(tenantId: string, type: LoyaltyProgramType): Promise<LoyaltyProgram<unknown> | null>
  saveLoyaltyProgram(
    tenantId: string,
    type: LoyaltyProgramType,
    input: { name: string; isActive: boolean; config: unknown },
  ): Promise<LoyaltyProgram<unknown>>
  getStampBalance(tenantId: string, programId: string, customerId: string): Promise<number>
  listVouchers(tenantId: string, customerId: string): Promise<MemberVoucher[]>
  issueManualVoucher(
    tenantId: string,
    input: { customerId: string; reward: VoucherReward; expiresAt: string | null; createdBy: string },
  ): Promise<MemberVoucher>
  voidVoucher(tenantId: string, voucherId: string, reason: string): Promise<void>
}
