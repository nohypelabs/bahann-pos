import { CreateTransactionUseCase } from '@/use-cases/transaction/CreateTransactionUseCase';
import { DomainException } from '@/domain/errors/DomainException';

const product = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-1', sku: 'AQUA', name: 'Air Mineral', price: 5000, cost_price: 3000,
  stock_behavior: 'TRACKED', tenant_id: 'tenant-1', ...overrides,
});

function makeUseCase({ stockAkhir = 18, products = [product()] } = {}) {
  const transactionRepo = {
    create: jest.fn().mockImplementation(async (t) => ({ ...t, id: 'tx-1', createdAt: new Date() })),
    createItems: jest.fn().mockResolvedValue(undefined),
    voidById: jest.fn(),
    findByTransactionId: jest.fn(),
  };
  const dailyStockRepo = {
    getByDate: jest.fn().mockResolvedValue({
      id: 'stock-1', stockAwal: 20, stockIn: 0, stockOut: 2, stockAkhir, createdAt: new Date(),
    }),
    save: jest.fn(),
  };
  const productRepo = { getByIds: jest.fn().mockResolvedValue(products) };
  const dailySaleRepo = { save: jest.fn() };
  const useCase = new CreateTransactionUseCase(
    transactionRepo as never, dailySaleRepo as never, dailyStockRepo as never, productRepo as never,
  );
  return { useCase, transactionRepo, dailyStockRepo };
}

const baseInput = {
  tenantId: 'tenant-1', outletId: 'outlet-1', cashierId: 'user-1',
  paymentMethod: 'cash' as const, discountAmount: 0, planLimit: null, currentMonthCount: 0,
};

describe('CreateTransactionUseCase stock check', () => {
  it('refuses a pending (POS checkout) sale that exceeds stock before creating anything', async () => {
    const { useCase, transactionRepo, dailyStockRepo } = makeUseCase({ stockAkhir: 18 });

    await expect(
      useCase.execute({ ...baseInput, status: 'pending', amountPaid: 0, items: [{ productId: 'prod-1', quantity: 50 }] }),
    ).rejects.toBeInstanceOf(DomainException);

    expect(transactionRepo.create).not.toHaveBeenCalled();
    expect(dailyStockRepo.save).not.toHaveBeenCalled();
  });

  it('creates a pending sale within stock without deducting yet', async () => {
    const { useCase, transactionRepo, dailyStockRepo } = makeUseCase({ stockAkhir: 18 });

    await useCase.execute({ ...baseInput, status: 'pending', amountPaid: 0, items: [{ productId: 'prod-1', quantity: 5 }] });

    expect(transactionRepo.create).toHaveBeenCalled();
    expect(dailyStockRepo.save).not.toHaveBeenCalled();
  });

  it('snapshots the product cost price on each sold item', async () => {
    const { useCase, transactionRepo } = makeUseCase();

    await useCase.execute({ ...baseInput, amountPaid: 10000, items: [{ productId: 'prod-1', quantity: 2 }] });

    expect(transactionRepo.createItems).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 'prod-1', quantity: 2, unitPrice: 5000, unitCost: 3000 }),
    ]);
  });

  it('does not check stock for untracked items', async () => {
    const { useCase, dailyStockRepo } = makeUseCase({ products: [product({ stock_behavior: 'UNTRACKED' })] });

    await useCase.execute({ ...baseInput, status: 'pending', amountPaid: 0, items: [{ productId: 'prod-1', quantity: 500 }] });

    expect(dailyStockRepo.getByDate).not.toHaveBeenCalled();
  });
});
