import { DashboardUseCase } from '@/use-cases/dashboard/DashboardUseCase';
import type { DashboardRepository } from '@/domain/repositories/DashboardRepository';

function makeRepo(overrides: Partial<DashboardRepository> = {}): jest.Mocked<DashboardRepository> {
  return {
    getSalesSummary: jest.fn().mockResolvedValue({ totalRevenue: 1_000_000, transactionCount: 4, totalItemsSold: 9, totalCogs: 400_000, uncostedLines: 0 }),
    getExpenseSummary: jest.fn().mockResolvedValue({ totalExpenses: 250_000, expenseCount: 2 }),
    getSalesTrend: jest.fn().mockResolvedValue([]),
    getTopProducts: jest.fn().mockResolvedValue([]),
    getLowStock: jest.fn().mockResolvedValue([]),
    getRecentTransactions: jest.fn().mockResolvedValue([]),
    getProductCount: jest.fn().mockResolvedValue(3),
    getOutletCount: jest.fn().mockResolvedValue(1),
    ...overrides,
  } as jest.Mocked<DashboardRepository>;
}

describe('DashboardUseCase.getStats', () => {
  it('reports revenue as gross sales, then gross and operating profit', async () => {
    const repo = makeRepo();
    const stats = await new DashboardUseCase(repo).getStats(['outlet-1'], 'tenant-1', 7);

    expect(stats.totalRevenue).toBe(1_000_000);
    expect(stats.totalCogs).toBe(400_000);
    expect(stats.grossProfit).toBe(600_000);
    expect(stats.totalExpenses).toBe(250_000);
    expect(stats.expenseCount).toBe(2);
    expect(stats.operatingProfit).toBe(350_000);
    expect(stats.profitMargin).toBeCloseTo(35);
  });

  it('passes through how many sold items had no cost price', async () => {
    const repo = makeRepo({
      getSalesSummary: jest.fn().mockResolvedValue({ totalRevenue: 500_000, transactionCount: 2, totalItemsSold: 3, totalCogs: 0, uncostedLines: 3 }),
    });
    const stats = await new DashboardUseCase(repo).getStats(['outlet-1'], 'tenant-1', 7);

    expect(stats.uncostedLines).toBe(3);
    expect(stats.grossProfit).toBe(500_000);
  });

  it('queries sales and expenses over the same WIB business days', async () => {
    const repo = makeRepo();
    await new DashboardUseCase(repo).getStats(['outlet-1'], 'tenant-1', 7);

    const [, salesStart, salesEnd] = repo.getSalesSummary.mock.calls[0];
    const [outletIds, expenseStart, expenseEnd] = repo.getExpenseSummary.mock.calls[0];
    expect(outletIds).toEqual(['outlet-1']);
    expect(salesStart).toBe(`${expenseStart}T00:00:00+07:00`);
    expect(salesEnd).toBe(`${expenseEnd}T23:59:59.999+07:00`);
    expect(expenseStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows a loss and no margin when expenses exceed zero revenue', async () => {
    const repo = makeRepo({
      getSalesSummary: jest.fn().mockResolvedValue({ totalRevenue: 0, transactionCount: 0, totalItemsSold: 0, totalCogs: 0, uncostedLines: 0 }),
    });
    const stats = await new DashboardUseCase(repo).getStats(['outlet-1'], 'tenant-1', 1);

    expect(stats.operatingProfit).toBe(-250_000);
    expect(stats.profitMargin).toBeNull();
  });

  it('skips expense queries when the user has no outlets', async () => {
    const repo = makeRepo();
    const stats = await new DashboardUseCase(repo).getStats([], 'tenant-1', 7);

    expect(repo.getExpenseSummary).not.toHaveBeenCalled();
    expect(stats.totalExpenses).toBe(0);
    expect(stats.operatingProfit).toBe(0);
  });
});
