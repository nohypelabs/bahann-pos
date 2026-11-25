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
    findById: jest.fn().mockResolvedValue({
      id: 'tx-1', tenantId: 'tenant-1', outletId: 'outlet-1', status: 'completed',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 5000 }],
      createdAt: new Date('2026-11-24T20:00:00.000Z'), // 25 Nov in WIB
    }),
  };
  const dailyStockRepo = {
    getByDate: jest.fn().mockResolvedValue({
      id: 'stock-1', stockAwal: 20, stockIn: 0, stockOut: 2, stockAkhir, createdAt: new Date(),
    }),
    save: jest.fn(),
  };
  const productRepo = { getByIds: jest.fn().mockResolvedValue(products) };
  const dailySaleRepo = { save: jest.fn(), addToDay: jest.fn().mockResolvedValue(undefined) };
  const useCase = new CreateTransactionUseCase(
    transactionRepo as never, dailySaleRepo as never, dailyStockRepo as never, productRepo as never,
  );
  return { useCase, transactionRepo, dailyStockRepo, dailySaleRepo };
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

describe('CreateTransactionUseCase daily sales', () => {
  it("adds a completed sale to the product's row for the day instead of inserting a new one", async () => {
    const { useCase, dailySaleRepo } = makeUseCase();

    await useCase.execute({ ...baseInput, amountPaid: 10000, items: [{ productId: 'prod-1', quantity: 2 }] });

    expect(dailySaleRepo.save).not.toHaveBeenCalled();
    expect(dailySaleRepo.addToDay).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', productId: 'prod-1', outletId: 'outlet-1', quantitySold: 2, revenue: 10000 }),
    );
  });

  it('takes a voided sale out of the day it was made, in WIB', async () => {
    const { useCase, dailySaleRepo } = makeUseCase();

    await useCase.reverseDailySalesForVoidedSale('tx-1', 'tenant-1');

    expect(dailySaleRepo.addToDay).toHaveBeenCalledWith({
      tenantId: 'tenant-1', productId: 'prod-1', outletId: 'outlet-1',
      saleDate: new Date('2026-11-25T00:00:00.000Z'), quantitySold: -2, revenue: -10000,
    });
  });
});

describe('CreateTransactionUseCase.restoreStockForVoidedSale', () => {
  it("returns a voided sale's quantity to today's stock by undoing the outflow", async () => {
    const { useCase, dailyStockRepo } = makeUseCase({ stockAkhir: 18 });

    await useCase.restoreStockForVoidedSale('tx-1', 'tenant-1');

    expect(dailyStockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'stock-1', stockAwal: 20, stockIn: 0, stockOut: 0, stockAkhir: 20,
    }));
  });

  it('skips untracked items', async () => {
    const { useCase, dailyStockRepo } = makeUseCase({ products: [product({ stock_behavior: 'UNTRACKED' })] });

    await useCase.restoreStockForVoidedSale('tx-1', 'tenant-1');

    expect(dailyStockRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a transaction from another tenant', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.restoreStockForVoidedSale('tx-1', 'tenant-2')).rejects.toThrow('Transaction not found');
  });
});

describe('CreateTransactionUseCase prices', () => {
  const labour = product({ id: 'svc-1', sku: 'JASA', name: 'Jasa Servis', price: 50000, stock_behavior: 'UNTRACKED' });

  it('charges the list price even when the client sends another price', async () => {
    const { useCase, transactionRepo } = makeUseCase({ products: [labour] });
    await useCase.execute({ ...baseInput, status: 'pending', amountPaid: 0, items: [{ productId: 'svc-1', quantity: 1, unitPrice: 1 }] });
    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 50000 }));
  });

  it('charges the price agreed on a service note', async () => {
    const { useCase, transactionRepo } = makeUseCase({ products: [labour] });
    await useCase.execute({ ...baseInput, status: 'pending', amountPaid: 0, items: [{ productId: 'svc-1', quantity: 1, agreedUnitPrice: 45000 }] });
    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 45000 }));
  });
});

describe('CreateTransactionUseCase manual discounts', () => {
  const pending = { ...baseInput, status: 'pending' as const, amountPaid: 0 };

  it('sells a line below its price only with a reason, and records both prices', async () => {
    const { useCase, transactionRepo } = makeUseCase();
    await expect(useCase.execute({
      ...pending, items: [{ productId: 'prod-1', quantity: 2, priceOverride: { unitPrice: 4000 } }],
    })).rejects.toMatchObject({ code: 'DISCOUNT_REASON_REQUIRED' });

    await useCase.execute({
      ...pending, items: [{ productId: 'prod-1', quantity: 2, priceOverride: { unitPrice: 4000, reason: 'DAMAGED', note: 'segel sobek' } }],
    });
    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ subtotal: 8000 }));
    expect(transactionRepo.createItems).toHaveBeenCalledWith([expect.objectContaining({
      unitPrice: 4000, listPrice: 5000, discountReason: 'DAMAGED', discountNote: 'segel sobek',
    })]);
  });

  it('ignores an override that is not below the catalogue price', async () => {
    const { useCase, transactionRepo } = makeUseCase();
    await useCase.execute({ ...pending, items: [{ productId: 'prod-1', quantity: 1, priceOverride: { unitPrice: 9000, reason: 'OTHER' } }] });
    expect(transactionRepo.createItems).toHaveBeenCalledWith([expect.objectContaining({ unitPrice: 5000, discountReason: null })]);
  });

  it('adds an amount off the sale to the promo discount, with its reason', async () => {
    const { useCase, transactionRepo } = makeUseCase();
    await useCase.execute({
      ...pending, discountAmount: 1000, items: [{ productId: 'prod-1', quantity: 2 }],
      manualDiscount: { amount: 500, reason: 'ROUNDING' },
    });
    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      subtotal: 10000, discountAmount: 1500, manualDiscount: 500, discountReason: 'ROUNDING', totalAmount: 8500,
    }));
  });

  it('refuses an amount off larger than what is left to pay', async () => {
    const { useCase, transactionRepo } = makeUseCase();
    await expect(useCase.execute({
      ...pending, discountAmount: 6000, items: [{ productId: 'prod-1', quantity: 2 }],
      manualDiscount: { amount: 5000, reason: 'OWNER_POLICY' },
    })).rejects.toMatchObject({ code: 'DISCOUNT_TOO_LARGE' });
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("keeps a service note's reason for its agreed price", async () => {
    const { useCase, transactionRepo } = makeUseCase();
    await useCase.execute({
      ...pending, items: [{ productId: 'prod-1', quantity: 1, agreedUnitPrice: 4500, agreedReason: { reason: 'OWNER_POLICY', note: null } }],
    });
    expect(transactionRepo.createItems).toHaveBeenCalledWith([expect.objectContaining({
      unitPrice: 4500, listPrice: 5000, discountReason: 'OWNER_POLICY',
    })]);
  });
});
