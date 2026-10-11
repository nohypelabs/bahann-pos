import { DashboardUseCase } from '@/use-cases/dashboard/DashboardUseCase';
import type { DashboardRepository } from '@/domain/repositories/DashboardRepository';

function makeRepo(overrides: Partial<DashboardRepository> = {}): jest.Mocked<DashboardRepository> {
  return {
    getSalesSummary: jest.fn().mockResolvedValue({ totalRevenue: 1_000_000, transactionCount: 4, totalItemsSold: 9 }),
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
  it('reports revenue as gross sales and operating profit as revenue minus expenses', async () => {
    const repo = makeRepo();
    const stats = await new DashboardUseCase(repo).getStats(['outlet-1'], 'tenant-1', 7);

    expect(stats.totalRevenue).toBe(1_000_000);
    expect(stats.totalExpenses).toBe(250_000);
    expect(stats.expenseCount).toBe(2);
    expect(stats.operatingProfit).toBe(750_000);
    expect(stats.profitMargin).toBeCloseTo(75);
  });

  it('queries expenses by calendar day over the same period as sales', async () => {
    const repo = makeRepo();
    await new DashboardUseCase(repo).getStats(['outlet-1'], 'tenant-1', 7);

    const [, salesStart, salesEnd] = repo.getSalesSummary.mock.calls[0];
    const [outletIds, expenseStart, expenseEnd] = repo.getExpenseSummary.mock.calls[0];
    expect(outletIds).toEqual(['outlet-1']);
    expect(expenseStart).toBe(salesStart.slice(0, 10));
    expect(expenseEnd).toBe(salesEnd.slice(0, 10));
    expect(expenseStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows a loss and no margin when expenses exceed zero revenue', async () => {
    const repo = makeRepo({
      getSalesSummary: jest.fn().mockResolvedValue({ totalRevenue: 0, transactionCount: 0, totalItemsSold: 0 }),
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
