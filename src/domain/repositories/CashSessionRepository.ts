export interface CashSession {
  id: string;
  outlet_id: string;
  opened_by: string;
  opened_at: string;
  opening_cash: number;
  closed_by: string | null;
  closed_at: string | null;
  closing_cash: number | null;
  expected_cash: number | null;
  actual_cash: number | null;
  difference: number | null;
  total_sales: number | null;
  total_transactions: number | null;
  cash_sales: number | null;
  card_sales: number | null;
  transfer_sales: number | null;
  ewallet_sales: number | null;
  total_discount: number | null;
  notes: string | null;
  status: string;
}

export interface CashSessionWithJoins extends CashSession {
  outlet: { id: string; name: string; address: string | null } | null;
  opened_by_user: { id: string; name: string } | null;
  closed_by_user?: { id: string; name: string } | null;
}

export interface Transaction {
  id: string;
  total_amount: number;
  payment_method: string;
  discount_amount: number;
  created_at: string;
}

export interface CloseSessionData {
  closedBy: string;
  closingCash: number;
  notes?: string;
}

export interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  ewalletSales: number;
  totalDiscount: number;
}

export interface CashSessionFilters {
  outletId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface CashSessionRepository {
  findOpenByOutletId(outletId: string): Promise<CashSessionWithJoins | null>;
  create(data: { outletId: string; openedBy: string; openingCash: number }): Promise<CashSession>;
  findById(id: string): Promise<CashSession | null>;
  findWithJoins(id: string): Promise<CashSessionWithJoins | null>;
  close(id: string, data: CloseSessionData & SalesSummary & { expectedCash: number; actualCash: number; difference: number }): Promise<void>;
  findByOutletIds(outletIds: string[], filters?: CashSessionFilters): Promise<{ sessions: CashSessionWithJoins[]; total: number }>;
  getTransactionsForPeriod(outletId: string, openedAt: string, closedAt?: string): Promise<Transaction[]>;
}
