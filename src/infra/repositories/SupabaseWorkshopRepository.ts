import { supabaseAdmin as supabase } from '../supabase/server'
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException'
import type {
  Customer,
  LoyaltyProgram,
  LoyaltyProgramType,
  Mechanic,
  MemberVoucher,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderSummary,
  Vehicle,
  VoucherReward,
} from '@/domain/entities/Workshop'
import type {
  CustomerInput,
  ServiceOrderInput,
  VehicleInput,
  WorkshopRepository,
} from '@/domain/repositories/WorkshopRepository'

type Row = Record<string, unknown>

const UNIQUE_VIOLATION = '23505'

function fail(what: string, error: { message: string }): never {
  throw new Error(`Failed to ${what}: ${error.message}`)
}

const toCustomer = (r: Row): Customer => ({
  id: r.id as string,
  tenantId: r.tenant_id as string,
  name: r.name as string,
  phone: (r.phone as string | null) ?? null,
  isMember: r.is_member as boolean,
  memberCode: (r.member_code as string | null) ?? null,
  joinedAt: (r.joined_at as string | null) ?? null,
  notes: (r.notes as string | null) ?? null,
  createdAt: r.created_at as string,
})

const toVehicle = (r: Row): Vehicle => ({
  id: r.id as string,
  tenantId: r.tenant_id as string,
  plateNumber: r.plate_number as string,
  brand: (r.brand as string | null) ?? null,
  model: (r.model as string | null) ?? null,
  customerId: (r.customer_id as string | null) ?? null,
  createdAt: r.created_at as string,
})

const toMechanic = (r: Row): Mechanic => ({
  id: r.id as string,
  tenantId: r.tenant_id as string,
  name: r.name as string,
  phone: (r.phone as string | null) ?? null,
  isActive: r.is_active as boolean,
})

const toVoucher = (r: Row): MemberVoucher => ({
  id: r.id as string,
  customerId: r.customer_id as string,
  code: r.code as string,
  reward: r.reward as VoucherReward,
  source: r.source as MemberVoucher['source'],
  status: r.status as MemberVoucher['status'],
  issuedAt: r.issued_at as string,
  expiresAt: (r.expires_at as string | null) ?? null,
  redeemedAt: (r.redeemed_at as string | null) ?? null,
})

const toProgram = (r: Row): LoyaltyProgram<unknown> => ({
  id: r.id as string,
  tenantId: r.tenant_id as string,
  type: r.type as LoyaltyProgramType,
  name: r.name as string,
  isActive: r.is_active as boolean,
  config: r.config,
})

// The column hints (!customer_id …) pick the right foreign key: vehicles also points at customers.
const ORDER_SELECT = `
  id, tenant_id, outlet_id, status, complaint, odometer_km, transaction_id, opened_at, closed_at, cancel_reason,
  vehicle:vehicles!vehicle_id(*),
  customer:customers!customer_id(*),
  mechanic:mechanics!mechanic_id(*),
  sale:transactions!transaction_id(total_amount),
  items:service_order_items(id, product_id, quantity, unit_price, created_at, product:products(name, sku, price, item_type))
`

function toServiceOrder(r: Row): ServiceOrder {
  // Lines in the order they were added, so editing one does not move it.
  const rows = [...((r.items as Row[] | null) ?? [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  const items = rows.map((i): ServiceOrderItem => {
    const p = (i.product as Row | null) ?? {}
    return {
      id: i.id as string,
      productId: i.product_id as string,
      productName: (p.name as string) ?? '',
      productSku: (p.sku as string) ?? '',
      itemType: (p.item_type as string) ?? 'PRODUCT',
      quantity: i.quantity as number,
      unitPrice: i.unit_price === null || i.unit_price === undefined ? null : Number(i.unit_price),
      listPrice: Number(p.price ?? 0),
    }
  })
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    outletId: r.outlet_id as string,
    status: r.status as ServiceOrder['status'],
    vehicle: toVehicle(r.vehicle as Row),
    customer: r.customer ? toCustomer(r.customer as Row) : null,
    mechanic: r.mechanic ? toMechanic(r.mechanic as Row) : null,
    complaint: (r.complaint as string | null) ?? null,
    odometerKm: (r.odometer_km as number | null) ?? null,
    transactionId: (r.transaction_id as string | null) ?? null,
    paidTotal: r.sale ? Number((r.sale as Row).total_amount) : null,
    openedAt: r.opened_at as string,
    closedAt: (r.closed_at as string | null) ?? null,
    cancelReason: (r.cancel_reason as string | null) ?? null,
    items,
  }
}

export class SupabaseWorkshopRepository implements WorkshopRepository {
  // ─── Customers ──────────────────────────────────────────────────────────
  async searchCustomers(tenantId: string, query: string, limit: number): Promise<Customer[]> {
    let q = supabase.from('customers').select('*').eq('tenant_id', tenantId).order('name').limit(limit)
    const term = query.trim().replace(/[%,()]/g, '')
    if (term) {
      const digits = term.replace(/\D/g, '')
      const filters = [`name.ilike.%${term}%`, `member_code.ilike.%${term}%`]
      if (digits.length >= 4) filters.push(`phone.like.%${digits}%`)
      q = q.or(filters.join(','))
    }
    const { data, error } = await q
    if (error) fail('search customers', error)
    return (data as Row[]).map(toCustomer)
  }

  async getCustomer(tenantId: string, id: string): Promise<Customer | null> {
    const { data, error } = await supabase.from('customers').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle()
    if (error) fail('fetch customer', error)
    return data ? toCustomer(data as Row) : null
  }

  async createCustomer(tenantId: string, input: CustomerInput, createdBy: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...(input.id ? { id: input.id } : {}), tenant_id: tenantId, name: input.name, phone: input.phone, notes: input.notes, created_by: createdBy })
      .select('*')
      .single()
    if (error) fail('create customer', error)
    return toCustomer(data as Row)
  }

  async updateCustomer(tenantId: string, id: string, input: CustomerInput): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({ name: input.name, phone: input.phone, notes: input.notes })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) fail('update customer', error)
    if (!data) throw new DomainException(DomainErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found')
    return toCustomer(data as Row)
  }

  async enrollMember(tenantId: string, id: string): Promise<Customer> {
    const { data: codes, error: codesError } = await supabase
      .from('customers')
      .select('member_code')
      .eq('tenant_id', tenantId)
      .not('member_code', 'is', null)
    if (codesError) fail('read member codes', codesError)

    let next = (codes as Row[]).reduce((max, r) => {
      const n = Number(String(r.member_code).replace(/^M/, ''))
      return Number.isInteger(n) && n > max ? n : max
    }, 0)

    // Two cashiers enrolling at once can pick the same number; the unique index
    // turns the second into a retry with the following number.
    for (let attempt = 0; attempt < 5; attempt++) {
      next += 1
      const { data, error } = await supabase
        .from('customers')
        .update({ is_member: true, member_code: `M${String(next).padStart(4, '0')}`, joined_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .eq('is_member', false)
        .select('*')
        .maybeSingle()
      if (error?.code === UNIQUE_VIOLATION) continue
      if (error) fail('enrol member', error)
      if (!data) throw new DomainException(DomainErrorCode.ALREADY_MEMBER, 'Customer not found or already a member')
      return toCustomer(data as Row)
    }
    throw new Error('Failed to enrol member: no free member code after 5 attempts')
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────
  async findVehicleByPlate(tenantId: string, plateNumber: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles').select('*').eq('tenant_id', tenantId).eq('plate_number', plateNumber).maybeSingle()
    if (error) fail('find vehicle', error)
    return data ? toVehicle(data as Row) : null
  }

  async getVehicle(tenantId: string, id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase.from('vehicles').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle()
    if (error) fail('fetch vehicle', error)
    return data ? toVehicle(data as Row) : null
  }

  async listVehiclesByCustomer(tenantId: string, customerId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles').select('*').eq('tenant_id', tenantId).eq('customer_id', customerId).order('plate_number')
    if (error) fail('list vehicles', error)
    return (data as Row[]).map(toVehicle)
  }

  async createVehicle(tenantId: string, input: VehicleInput): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ tenant_id: tenantId, plate_number: input.plateNumber, brand: input.brand, model: input.model, customer_id: input.customerId })
      .select('*')
      .single()
    if (error) fail('create vehicle', error)
    return toVehicle(data as Row)
  }

  async updateVehicle(tenantId: string, id: string, input: VehicleInput): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ plate_number: input.plateNumber, brand: input.brand, model: input.model, customer_id: input.customerId })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) fail('update vehicle', error)
    if (!data) throw new DomainException(DomainErrorCode.VEHICLE_NOT_FOUND, 'Vehicle not found')
    return toVehicle(data as Row)
  }

  // ─── Mechanics ──────────────────────────────────────────────────────────
  async listMechanics(tenantId: string, includeInactive: boolean): Promise<Mechanic[]> {
    let q = supabase.from('mechanics').select('*').eq('tenant_id', tenantId).order('name')
    if (!includeInactive) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) fail('list mechanics', error)
    return (data as Row[]).map(toMechanic)
  }

  async getMechanic(tenantId: string, id: string): Promise<Mechanic | null> {
    const { data, error } = await supabase.from('mechanics').select('*').eq('tenant_id', tenantId).eq('id', id).maybeSingle()
    if (error) fail('fetch mechanic', error)
    return data ? toMechanic(data as Row) : null
  }

  async saveMechanic(
    tenantId: string,
    input: { id?: string; name: string; phone: string | null; isActive: boolean },
  ): Promise<Mechanic> {
    const values = { name: input.name, phone: input.phone, is_active: input.isActive }
    const { data, error } = input.id
      ? await supabase.from('mechanics').update(values).eq('tenant_id', tenantId).eq('id', input.id).select('*').maybeSingle()
      : await supabase.from('mechanics').insert({ ...values, tenant_id: tenantId }).select('*').single()
    if (error) fail('save mechanic', error)
    if (!data) throw new DomainException(DomainErrorCode.MECHANIC_NOT_FOUND, 'Mechanic not found')
    return toMechanic(data as Row)
  }

  // ─── Service notes ──────────────────────────────────────────────────────
  async listOpenServiceOrders(tenantId: string, outletIds: string[]): Promise<ServiceOrderSummary[]> {
    if (outletIds.length === 0) return []
    const { data, error } = await supabase
      .from('service_orders')
      .select(`id, outlet_id, opened_at,
        vehicle:vehicles!vehicle_id(plate_number, brand, model),
        customer:customers!customer_id(name, is_member),
        mechanic:mechanics!mechanic_id(name),
        items:service_order_items(quantity)`)
      .eq('tenant_id', tenantId)
      .in('outlet_id', outletIds)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
    if (error) fail('list open service notes', error)

    return (data as Row[]).map((r) => {
      const v = (r.vehicle as Row | null) ?? {}
      const c = r.customer as Row | null
      const m = r.mechanic as Row | null
      const label = [v.brand, v.model].filter(Boolean).join(' ')
      return {
        id: r.id as string,
        outletId: r.outlet_id as string,
        plateNumber: (v.plate_number as string) ?? '',
        vehicleLabel: label || null,
        customerName: (c?.name as string | undefined) ?? null,
        isMember: Boolean(c?.is_member),
        mechanicName: (m?.name as string | undefined) ?? null,
        itemCount: ((r.items as Row[] | null) ?? []).reduce((s, i) => s + Number(i.quantity), 0),
        openedAt: r.opened_at as string,
      }
    })
  }

  async getServiceOrder(tenantId: string, id: string): Promise<ServiceOrder | null> {
    const { data, error } = await supabase.from('service_orders').select(ORDER_SELECT).eq('tenant_id', tenantId).eq('id', id).maybeSingle()
    if (error) fail('fetch service note', error)
    return data ? toServiceOrder(data as Row) : null
  }

  async findOpenServiceOrderId(tenantId: string, vehicleId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('service_orders').select('id').eq('tenant_id', tenantId).eq('vehicle_id', vehicleId).eq('status', 'open').maybeSingle()
    if (error) fail('find open service note', error)
    return data ? ((data as Row).id as string) : null
  }

  async createServiceOrder(tenantId: string, input: ServiceOrderInput): Promise<string> {
    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        ...(input.id ? { id: input.id } : {}),
        ...(input.openedAt ? { opened_at: input.openedAt } : {}),
        tenant_id: tenantId,
        outlet_id: input.outletId,
        vehicle_id: input.vehicleId,
        customer_id: input.customerId,
        mechanic_id: input.mechanicId,
        complaint: input.complaint,
        odometer_km: input.odometerKm,
        opened_by: input.openedBy,
      })
      .select('id')
      .single()
    if (error?.code === UNIQUE_VIOLATION) {
      throw new DomainException(DomainErrorCode.VEHICLE_HAS_OPEN_NOTE, 'This vehicle already has an open service note')
    }
    if (error) fail('open service note', error)
    return (data as Row).id as string
  }

  async updateServiceOrder(
    tenantId: string,
    id: string,
    input: { mechanicId: string | null; complaint: string | null; odometerKm: number | null },
  ): Promise<void> {
    const { error } = await supabase
      .from('service_orders')
      .update({ mechanic_id: input.mechanicId, complaint: input.complaint, odometer_km: input.odometerKm })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', 'open')
    if (error) fail('update service note', error)
  }

  async setServiceOrderItem(
    tenantId: string,
    orderId: string,
    input: { productId: string; quantity: number; unitPrice: number | null; addedBy: string },
  ): Promise<void> {
    const { error } = await supabase.from('service_order_items').upsert(
      {
        tenant_id: tenantId,
        service_order_id: orderId,
        product_id: input.productId,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        added_by: input.addedBy,
      },
      { onConflict: 'service_order_id,product_id' },
    )
    if (error) fail('save note item', error)
  }

  async removeServiceOrderItem(tenantId: string, orderId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('service_order_items')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('service_order_id', orderId)
      .eq('product_id', productId)
    if (error) fail('remove note item', error)
  }

  async cancelServiceOrder(tenantId: string, id: string, reason: string, cancelledBy: string): Promise<void> {
    const { data, error } = await supabase
      .from('service_orders')
      .update({ status: 'cancelled', cancel_reason: reason, cancelled_by: cancelledBy, closed_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('status', 'open')
      .select('id')
    if (error) fail('cancel service note', error)
    if (!data || data.length === 0) {
      throw new DomainException(DomainErrorCode.SERVICE_ORDER_NOT_OPEN, 'Service note is already paid or cancelled')
    }
  }

  async listServiceHistory(tenantId: string, vehicleId: string, limit: number): Promise<ServiceOrder[]> {
    const { data, error } = await supabase
      .from('service_orders')
      .select(ORDER_SELECT)
      .eq('tenant_id', tenantId)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'paid')
      .order('closed_at', { ascending: false })
      .limit(limit)
    if (error) fail('list service history', error)
    return (data as Row[]).map(toServiceOrder)
  }

  async reservedQuantities(tenantId: string, productIds: string[]): Promise<Record<string, number>> {
    if (productIds.length === 0) return {}
    const { data, error } = await supabase
      .from('service_order_items')
      .select('product_id, quantity, order:service_orders!inner(status)')
      .eq('tenant_id', tenantId)
      .in('product_id', productIds)
      .eq('order.status', 'open')
    if (error) fail('read reserved stock', error)
    const reserved: Record<string, number> = {}
    for (const r of data as Row[]) {
      const id = r.product_id as string
      reserved[id] = (reserved[id] ?? 0) + Number(r.quantity)
    }
    return reserved
  }

  async productBelongsToTenant(tenantId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase.from('products').select('id').eq('tenant_id', tenantId).eq('id', productId).maybeSingle()
    if (error) fail('check product', error)
    return Boolean(data)
  }

  // ─── Loyalty ────────────────────────────────────────────────────────────
  async getLoyaltyProgram(tenantId: string, type: LoyaltyProgramType): Promise<LoyaltyProgram<unknown> | null> {
    const { data, error } = await supabase
      .from('loyalty_programs').select('*').eq('tenant_id', tenantId).eq('type', type).maybeSingle()
    if (error) fail('fetch loyalty program', error)
    return data ? toProgram(data as Row) : null
  }

  async saveLoyaltyProgram(
    tenantId: string,
    type: LoyaltyProgramType,
    input: { name: string; isActive: boolean; config: unknown },
  ): Promise<LoyaltyProgram<unknown>> {
    const { data, error } = await supabase
      .from('loyalty_programs')
      .upsert(
        { tenant_id: tenantId, type, name: input.name, is_active: input.isActive, config: input.config },
        { onConflict: 'tenant_id,type' },
      )
      .select('*')
      .single()
    if (error) fail('save loyalty program', error)
    return toProgram(data as Row)
  }

  async getStampBalance(tenantId: string, programId: string, customerId: string): Promise<number> {
    const { data, error } = await supabase
      .from('loyalty_ledger')
      .select('delta')
      .eq('tenant_id', tenantId)
      .eq('program_id', programId)
      .eq('customer_id', customerId)
    if (error) fail('read stamp balance', error)
    return (data as Row[]).reduce((s, r) => s + Number(r.delta), 0)
  }

  async listVouchers(tenantId: string, customerId: string): Promise<MemberVoucher[]> {
    const { data, error } = await supabase
      .from('member_vouchers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .order('issued_at', { ascending: false })
    if (error) fail('list vouchers', error)
    return (data as Row[]).map(toVoucher)
  }

  async issueManualVoucher(
    tenantId: string,
    input: { customerId: string; reward: VoucherReward; expiresAt: string | null; createdBy: string },
  ): Promise<MemberVoucher> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = 'VCR-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
      const { data, error } = await supabase
        .from('member_vouchers')
        .insert({
          tenant_id: tenantId,
          customer_id: input.customerId,
          code,
          reward: input.reward,
          source: 'manual',
          expires_at: input.expiresAt,
          created_by: input.createdBy,
        })
        .select('*')
        .single()
      if (error?.code === UNIQUE_VIOLATION) continue
      if (error) fail('issue voucher', error)
      return toVoucher(data as Row)
    }
    throw new Error('Failed to issue voucher: no free code after 5 attempts')
  }

  async voidVoucher(tenantId: string, voucherId: string, reason: string): Promise<void> {
    const { data, error } = await supabase
      .from('member_vouchers')
      .update({ status: 'void', voided_at: new Date().toISOString(), void_reason: reason })
      .eq('tenant_id', tenantId)
      .eq('id', voucherId)
      .eq('status', 'issued')
      .select('id')
    if (error) fail('void voucher', error)
    if (!data || data.length === 0) {
      throw new DomainException(DomainErrorCode.VOUCHER_NOT_AVAILABLE, 'Voucher already used or void')
    }
  }
}
