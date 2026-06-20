import type { Transaction, TransactionItem } from '../entities/Transaction'

export interface TransactionFilters {
  outletId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export interface TransactionWithRelations extends Transaction {
  items: TransactionItem[]
  outlet?: { id: string; name: string; address?: string }
  cashier?: { id: string; name: string; email?: string }
}

export interface TransactionSummary {
  totalTransactions: number
  completedTransactions: number
  voidedTransactions: number
  refundedTransactions: number
  totalRevenue: number
  totalDiscounts: number
  cashSales: number
  cardSales: number
  transferSales: number
  ewalletSales: number
}

export interface TransactionRepository {
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>
  createItems(items: Omit<TransactionItem, 'id'>[]): Promise<void>
  findById(id: string): Promise<TransactionWithRelations | null>
  findByTransactionId(transactionId: string): Promise<TransactionWithRelations | null>
  findByOutletIds(outletIds: string[], filters: TransactionFilters): Promise<{ transactions: TransactionWithRelations[]; total: number }>
  findByOutletIdsForSummary(outletIds: string[], outletId: string | undefined, dateFrom: string, dateTo: string): Promise<Transaction[]>
  updateToCompleted(id: string, amountPaid: number, changeAmount: number): Promise<void>
  updateToVoided(id: string, reason: string, voidedBy: string): Promise<void>
  updateToRefunded(id: string, reason: string, refundedBy: string, refundAmount: number): Promise<void>
  countByOutletSince(outletId: string, since: string): Promise<number>
  voidById(id: string): Promise<void>
}
