import {
  CashSessionRepository, CashSession, CashSessionWithJoins,
  SalesSummary, CashSessionFilters,
} from '@/domain/repositories/CashSessionRepository';

export class CashSessionUseCase {
  constructor(private readonly sessionRepo: CashSessionRepository) {}

  async open(outletId: string, openedBy: string, openingCash: number): Promise<CashSession> {
    const existing = await this.sessionRepo.findOpenByOutletId(outletId);
    if (existing) {
      throw new Error('There is already an open cash session for this outlet');
    }
    return this.sessionRepo.create({ outletId, openedBy, openingCash });
  }

  async close(
    sessionId: string,
    closedBy: string,
    closingCash: number,
    notes: string | undefined,
    tenantOutletIds: string[],
  ): Promise<{ success: true; difference: number }> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session || !tenantOutletIds.includes(session.outlet_id)) {
      throw new Error('Session not found');
    }
    if (session.status === 'closed') {
      throw new Error('Session already closed');
    }

    const transactions = await this.sessionRepo.getTransactionsForPeriod(
      session.outlet_id,
      session.opened_at,
    );

    const summary = this.calculateSalesSummary(transactions);
    const expectedCash = session.opening_cash + summary.cashSales;
    const actualCash = closingCash;
    const difference = actualCash - expectedCash;

    await this.sessionRepo.close(sessionId, {
      closedBy,
      closingCash,
      notes,
      ...summary,
      expectedCash,
      actualCash,
      difference,
    });

    return { success: true, difference };
  }

  async getCurrent(outletId: string): Promise<CashSessionWithJoins | null> {
    return this.sessionRepo.findOpenByOutletId(outletId);
  }

  async getReport(sessionId: string, tenantOutletIds: string[]): Promise<CashSessionWithJoins> {
    const session = await this.sessionRepo.findWithJoins(sessionId);
    if (!session || !tenantOutletIds.includes(session.outlet_id)) {
      throw new Error('Session not found');
    }
    return session;
  }

  async list(tenantOutletIds: string[], filters?: CashSessionFilters): Promise<{ sessions: CashSessionWithJoins[]; total: number }> {
    if (tenantOutletIds.length === 0) return { sessions: [], total: 0 };
    return this.sessionRepo.findByOutletIds(tenantOutletIds, filters);
  }

  private calculateSalesSummary(transactions: Array<{ total_amount: number; payment_method: string; discount_amount: number }>): SalesSummary {
    return transactions.reduce(
      (acc, tx) => ({
        totalSales: acc.totalSales + tx.total_amount,
        totalTransactions: acc.totalTransactions + 1,
        cashSales: acc.cashSales + (tx.payment_method === 'cash' ? tx.total_amount : 0),
        cardSales: acc.cardSales + (tx.payment_method === 'card' ? tx.total_amount : 0),
        transferSales: acc.transferSales + (tx.payment_method === 'transfer' ? tx.total_amount : 0),
        ewalletSales: acc.ewalletSales + (tx.payment_method === 'ewallet' ? tx.total_amount : 0),
        totalDiscount: acc.totalDiscount + tx.discount_amount,
      }),
      {
        totalSales: 0,
        totalTransactions: 0,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        ewalletSales: 0,
        totalDiscount: 0,
      },
    );
  }
}
