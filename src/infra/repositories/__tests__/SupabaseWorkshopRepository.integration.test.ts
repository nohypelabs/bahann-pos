/**
 * @jest-environment node
 *
 * Integration test for the workshop module against a real PostgREST + Postgres.
 * Skipped unless WORKSHOP_IT=1 and NEXT_PUBLIC_SUPABASE_URL points at localhost,
 * so it can never run against production. It writes rows and removes them after.
 *
 * Run against a throwaway copy (see deployment/backup/ for making one):
 *   WORKSHOP_IT=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port> SUPABASE_SERVICE_ROLE_KEY=<service-role JWT> \
 *     pnpm test -- SupabaseWorkshopRepository.integration
 */
import { DomainErrorCode } from '@/domain/errors/DomainException';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const enabled = process.env.WORKSHOP_IT === '1' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
const suite = enabled ? describe : describe.skip;

suite('workshop module on PostgREST', () => {
  // Imported lazily so a skipped run never builds a Supabase client.
  let supabase: typeof import('@/infra/supabase/server').supabaseAdmin;
  let uc: import('@/use-cases/workshop/WorkshopUseCase').WorkshopUseCase;
  let tenantId: string;
  let outletId: string;
  let userId: string;
  const created = { products: [] as string[], customers: [] as string[], mechanics: [] as string[] };
  const tag = Date.now().toString(36).toUpperCase();
  const plate = `B${tag.slice(-4)}IT`.replace(/[^A-Z0-9]/g, '');
  let serviceId: string;
  let partId: string;

  beforeAll(async () => {
    supabase = (await import('@/infra/supabase/server')).supabaseAdmin;
    const { WorkshopUseCase } = await import('@/use-cases/workshop/WorkshopUseCase');
    const { SupabaseWorkshopRepository } = await import('@/infra/repositories/SupabaseWorkshopRepository');
    uc = new WorkshopUseCase(new SupabaseWorkshopRepository());

    const { data: outlet } = await supabase.from('outlets').select('id, tenant_id').not('tenant_id', 'is', null).limit(1).single();
    tenantId = outlet!.tenant_id;
    outletId = outlet!.id;
    const { data: user } = await supabase.from('users').select('id').eq('tenant_id', tenantId).limit(1).single();
    userId = user!.id;

    const { data: products, error } = await supabase
      .from('products')
      .insert([
        { tenant_id: tenantId, sku: `IT-SVC-${tag}`, name: 'Jasa servis ringan (IT)', price: 50000, item_type: 'SERVICE', stock_behavior: 'UNTRACKED' },
        // Bulk inserts fill unlisted columns with NULL, not their defaults, so list them all.
        { tenant_id: tenantId, sku: `IT-OLI-${tag}`, name: 'Oli (IT)', price: 60000, item_type: 'PRODUCT', stock_behavior: 'TRACKED' },
      ])
      .select('id, sku');
    if (error) throw error;
    serviceId = products!.find((p) => p.sku.startsWith('IT-SVC'))!.id;
    partId = products!.find((p) => p.sku.startsWith('IT-OLI'))!.id;
    created.products.push(serviceId, partId);
  });

  afterAll(async () => {
    if (!supabase || !tenantId) return;
    const { data: vehicles } = await supabase.from('vehicles').select('id').eq('tenant_id', tenantId).eq('plate_number', plate);
    const vehicleIds = (vehicles ?? []).map((v) => v.id);
    if (vehicleIds.length) await supabase.from('service_orders').delete().in('vehicle_id', vehicleIds);
    if (vehicleIds.length) await supabase.from('vehicles').delete().in('id', vehicleIds);
    if (created.customers.length) await supabase.from('customers').delete().in('id', created.customers);
    if (created.mechanics.length) await supabase.from('mechanics').delete().in('id', created.mechanics);
    await supabase.from('loyalty_programs').delete().eq('tenant_id', tenantId).eq('name', `IT ${tag}`);
    if (created.products.length) await supabase.from('products').delete().in('id', created.products);
  });

  it('runs a member through a service note end to end', async () => {
    const member = await uc.createCustomer(tenantId, userId, { name: `Andi IT ${tag}`, phone: '+62 812-0000-1111', enrollAsMember: true });
    created.customers.push(member.id);
    expect(member).toMatchObject({ isMember: true, phone: '081200001111' });
    expect(member.memberCode).toMatch(/^M\d{4,}$/);

    const mechanic = await uc.saveMechanic(tenantId, { name: `Budi IT ${tag}` });
    created.mechanics.push(mechanic.id);

    const noteId = await uc.openServiceOrder(tenantId, userId, {
      outletId, plate: plate.toLowerCase(), brand: 'Honda', model: 'Beat', customerId: member.id,
      mechanicId: mechanic.id, complaint: 'Ganti oli', odometerKm: 12345,
    });

    await expect(uc.openServiceOrder(tenantId, userId, { outletId, plate })).rejects.toMatchObject({
      code: DomainErrorCode.VEHICLE_HAS_OPEN_NOTE,
    });

    await uc.setServiceOrderItem(tenantId, userId, noteId, { productId: serviceId, quantity: 1 });
    await uc.setServiceOrderItem(tenantId, userId, noteId, { productId: partId, quantity: 1 });
    await uc.setServiceOrderItem(tenantId, userId, noteId, { productId: partId, quantity: 2, unitPrice: 55000 });

    const note = await uc.getServiceOrder(tenantId, noteId);
    expect(note.vehicle.plateNumber).toBe(plate);
    expect(note.customer?.id).toBe(member.id);
    expect(note.mechanic?.name).toBe(mechanic.name);
    expect(note.odometerKm).toBe(12345);
    const part = note.items.find((i) => i.productId === partId)!;
    expect(part).toMatchObject({ quantity: 2, unitPrice: 55000, listPrice: 60000, itemType: 'PRODUCT' });
    expect(note.items.find((i) => i.productId === serviceId)?.itemType).toBe('SERVICE');

    const open = await uc.listOpenServiceOrders(tenantId, [outletId]);
    expect(open.find((o) => o.id === noteId)).toMatchObject({ plateNumber: plate, customerName: member.name, isMember: true, itemCount: 3 });
    expect((await uc.reservedQuantities(tenantId, [partId]))[partId]).toBe(2);

    const lookup = await uc.lookupPlate(tenantId, plate);
    expect(lookup.openServiceOrderId).toBe(noteId);
    expect(lookup.owner?.id).toBe(member.id);

    const found = await uc.searchCustomers(tenantId, '0000-1111');
    expect(found.map((c) => c.id)).toContain(member.id);

    const cancelled = await uc.cancelServiceOrder(tenantId, userId, noteId, 'Test selesai');
    expect(cancelled.id).toBe(noteId);
    expect((await uc.listOpenServiceOrders(tenantId, [outletId])).find((o) => o.id === noteId)).toBeUndefined();
    await expect(uc.setServiceOrderItem(tenantId, userId, noteId, { productId: partId, quantity: 1 })).rejects.toMatchObject({
      code: DomainErrorCode.SERVICE_ORDER_NOT_OPEN,
    });
  });

  it('saves the stamp program and manages manual vouchers', async () => {
    const existing = await uc.getStampProgram(tenantId);
    if (!existing) {
      const program = await uc.saveStampProgram(tenantId, {
        name: `IT ${tag}`, isActive: true,
        config: { requiredStamps: 10, minSpend: 0, reward: { type: 'free_service', maxValue: 50000 }, voucherValidDays: 90 },
      });
      expect(program.config.reward).toEqual({ type: 'free_service', maxValue: 50000 });
    }

    const member = await uc.createCustomer(tenantId, userId, { name: `Citra IT ${tag}`, enrollAsMember: true });
    created.customers.push(member.id);
    const voucher = await uc.issueManualVoucher(tenantId, userId, { customerId: member.id, reward: { type: 'fixed', amount: 20000 }, validDays: 30 });
    expect(voucher.code).toMatch(/^VCR-/);

    const detail = await uc.getCustomerDetail(tenantId, member.id);
    expect(detail.vouchers.map((v) => v.id)).toContain(voucher.id);
    expect(detail.stampCard?.balance).toBe(0);

    await uc.voidVoucher(tenantId, voucher.id, 'Salah terbit');
    await expect(uc.voidVoucher(tenantId, voucher.id, 'Lagi')).rejects.toMatchObject({ code: DomainErrorCode.VOUCHER_NOT_AVAILABLE });
  });
});
