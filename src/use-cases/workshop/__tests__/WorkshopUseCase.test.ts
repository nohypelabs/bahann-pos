import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException';
import { WorkshopUseCase } from '@/use-cases/workshop/WorkshopUseCase';
import { DEFAULT_STAMP_CONFIG } from '@/domain/workshop/rules';

const T = 'tenant-1';

const vehicle = (overrides: Record<string, unknown> = {}) => ({
  id: 'veh-1', tenantId: T, plateNumber: 'B1234XYZ', brand: 'Honda', model: 'Beat', customerId: 'cus-1', createdAt: '', ...overrides,
});
const member = (overrides: Record<string, unknown> = {}) => ({
  id: 'cus-1', tenantId: T, name: 'Andi', phone: '081234567890', isMember: true, memberCode: 'M0001',
  joinedAt: '2026-11-01', notes: null, createdAt: '', ...overrides,
});
const order = (overrides: Record<string, unknown> = {}) => ({
  id: 'so-1', tenantId: T, outletId: 'out-1', status: 'open', vehicle: vehicle(), customer: member(), mechanic: null,
  complaint: null, odometerKm: null, transactionId: null, openedAt: '', closedAt: null, cancelReason: null, items: [],
  ...overrides,
});

function makeRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findVehicleByPlate: jest.fn().mockResolvedValue(null),
    createVehicle: jest.fn().mockImplementation(async (_t, v) => vehicle({ id: 'veh-new', ...v })),
    getCustomer: jest.fn().mockResolvedValue(member()),
    getMechanic: jest.fn().mockResolvedValue({ id: 'mec-1', tenantId: T, name: 'Budi', phone: null, isActive: true }),
    createServiceOrder: jest.fn().mockResolvedValue('so-new'),
    getServiceOrder: jest.fn().mockResolvedValue(order()),
    removeServiceOrderItem: jest.fn(),
    setServiceOrderItem: jest.fn(),
    productBelongsToTenant: jest.fn().mockResolvedValue(true),
    cancelServiceOrder: jest.fn(),
    getLoyaltyProgram: jest.fn().mockResolvedValue({ id: 'prog-1', tenantId: T, type: 'stamp', name: 'Kartu Servis', isActive: true, config: {} }),
    saveLoyaltyProgram: jest.fn().mockImplementation(async (_t, type, p) => ({ id: 'prog-1', tenantId: T, type, ...p })),
    getStampBalance: jest.fn().mockResolvedValue(7),
    listVouchers: jest.fn().mockResolvedValue([]),
    findOpenServiceOrderId: jest.fn().mockResolvedValue(null),
    listServiceHistory: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const useCase = (repo: ReturnType<typeof makeRepo>) => new WorkshopUseCase(repo as never);

describe('openServiceOrder', () => {
  it('creates the vehicle for a new plate, normalising it', async () => {
    const repo = makeRepo();
    await useCase(repo).openServiceOrder(T, 'user-1', { outletId: 'out-1', plate: 'b 9999 zz', brand: 'Yamaha' });

    expect(repo.createVehicle).toHaveBeenCalledWith(T, expect.objectContaining({ plateNumber: 'B9999ZZ', brand: 'Yamaha', customerId: null }));
    expect(repo.createServiceOrder).toHaveBeenCalledWith(T, expect.objectContaining({ vehicleId: 'veh-new', customerId: null }));
  });

  it('uses the known vehicle and its owner', async () => {
    const repo = makeRepo({ findVehicleByPlate: jest.fn().mockResolvedValue(vehicle()) });
    await useCase(repo).openServiceOrder(T, 'user-1', { outletId: 'out-1', plate: 'B1234XYZ' });

    expect(repo.createVehicle).not.toHaveBeenCalled();
    expect(repo.createServiceOrder).toHaveBeenCalledWith(T, expect.objectContaining({ vehicleId: 'veh-1', customerId: 'cus-1' }));
  });

  it('refuses a mechanic from another tenant', async () => {
    const repo = makeRepo({ getMechanic: jest.fn().mockResolvedValue(null) });
    await expect(
      useCase(repo).openServiceOrder(T, 'user-1', { outletId: 'out-1', plate: 'B1234XYZ', mechanicId: 'mec-x' }),
    ).rejects.toMatchObject({ code: DomainErrorCode.MECHANIC_NOT_FOUND });
    expect(repo.createServiceOrder).not.toHaveBeenCalled();
  });
});

describe('note items', () => {
  it('removes a line when its quantity is set to 0', async () => {
    const repo = makeRepo();
    await useCase(repo).setServiceOrderItem(T, 'user-1', 'so-1', { productId: 'p-1', quantity: 0 });
    expect(repo.removeServiceOrderItem).toHaveBeenCalledWith(T, 'so-1', 'p-1');
    expect(repo.setServiceOrderItem).not.toHaveBeenCalled();
  });

  it('refuses edits on a paid note', async () => {
    const repo = makeRepo({ getServiceOrder: jest.fn().mockResolvedValue(order({ status: 'paid' })) });
    await expect(
      useCase(repo).setServiceOrderItem(T, 'user-1', 'so-1', { productId: 'p-1', quantity: 1 }),
    ).rejects.toMatchObject({ code: DomainErrorCode.SERVICE_ORDER_NOT_OPEN });
  });

  it("refuses another tenant's product", async () => {
    const repo = makeRepo({ productBelongsToTenant: jest.fn().mockResolvedValue(false) });
    await expect(
      useCase(repo).setServiceOrderItem(T, 'user-1', 'so-1', { productId: 'p-x', quantity: 1 }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(repo.setServiceOrderItem).not.toHaveBeenCalled();
  });
});

describe('cancelServiceOrder', () => {
  it('needs a reason', async () => {
    const repo = makeRepo();
    await expect(useCase(repo).cancelServiceOrder(T, 'user-1', 'so-1', '   ')).rejects.toMatchObject({
      code: DomainErrorCode.CANCEL_REASON_REQUIRED,
    });
    expect(repo.cancelServiceOrder).not.toHaveBeenCalled();
  });
});

describe('loyalty', () => {
  it("shows a member's stamp card with the program's target", async () => {
    const repo = makeRepo({ findVehicleByPlate: jest.fn().mockResolvedValue(vehicle()) });
    const lookup = await useCase(repo).lookupPlate(T, 'b1234xyz');
    expect(lookup.stampCard).toEqual({ programActive: true, balance: 7, required: 10 });
  });

  it('has no stamp card for non-members', async () => {
    const repo = makeRepo({
      findVehicleByPlate: jest.fn().mockResolvedValue(vehicle()),
      getCustomer: jest.fn().mockResolvedValue(member({ isMember: false, memberCode: null, joinedAt: null })),
    });
    const lookup = await useCase(repo).lookupPlate(T, 'B1234XYZ');
    expect(lookup.stampCard).toBeNull();
    expect(repo.listVouchers).toHaveBeenCalled();
  });

  it('refuses an invalid stamp program', async () => {
    const repo = makeRepo();
    await expect(
      useCase(repo).saveStampProgram(T, { name: 'Kartu Servis', isActive: true, config: { ...DEFAULT_STAMP_CONFIG, requiredStamps: 0 } }),
    ).rejects.toMatchObject({ code: DomainErrorCode.INVALID_LOYALTY_CONFIG });
    expect(repo.saveLoyaltyProgram).not.toHaveBeenCalled();
  });

  it('issues manual vouchers to members only', async () => {
    const repo = makeRepo({ getCustomer: jest.fn().mockResolvedValue(member({ isMember: false })) });
    await expect(
      useCase(repo).issueManualVoucher(T, 'user-1', { customerId: 'cus-1', reward: { type: 'fixed', amount: 20000 }, validDays: 30 }),
    ).rejects.toMatchObject({ code: DomainErrorCode.NOT_A_MEMBER });
  });
});
