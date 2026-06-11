import type {
  TransactionRepository,
  TransactionFilters,
  TransactionWithRelations,
  TransactionSummary,
} from '@/domain/repositories/TransactionRepository'

export interface PlanUsage {
  plan: string
  limit: number | null
  count: number
  remaining: number | null
  isAtLimit: boolean
}

export class ListTransactionsUseCase {
  constructor(private readonly transactionRepo: TransactionRepository) {}

  async getPlanUsage(outletId: string, plan: string, planLimits: Record<string, number>): Promise<PlanUsage> {
    const limit = planLimits[plan] ?? 100
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const count = await this.transactionRepo.countByOutletSince(outletId, startOfMonth)

    return {
      plan,
      limit: limit === Infinity ? null : limit,
      count,
      remaining: limit === Infinity ? null : Math.max(0, limit - count),
      isAtLimit: limit !== Infinity && count >= limit,
    }
  }

  async getById(id: string, tenantOutletIds: string[]): Promise<TransactionWithRelations> {
    const transaction = await this.transactionRepo.findById(id)

    if (!transaction || !tenantOutletIds.includes(transaction.outletId)) {
      throw new Error('Transaction not found')
    }

    return transaction
  }

  async list(
    tenantOutletIds: string[],
    filters: TransactionFilters,
  ): Promise<{ transactions: TransactionWithRelations[]; total: number }> {
    if (tenantOutletIds.length === 0) return { transactions: [], total: 0 }
    return this.transactionRepo.findByOutletIds(tenantOutletIds, filters)
  }

  async getSummary(
    tenantOutletIds: string[],
    outletId: string | undefined,
    dateFrom: string,
    dateTo: string,
  ): Promise<TransactionSummary> {
    if (tenantOutletIds.length === 0) {
      return {
        totalTransactions: 0,
        completedTransactions: 0,
        voidedTransactions: 0,
        refundedTransactions: 0,
        totalRevenue: 0,
        totalDiscounts: 0,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        ewalletSales: 0,
      }
    }

    const transactions = await this.transactionRepo.findByOutletIdsForSummary(
      tenantOutletIds,
      outletId,
      dateFrom,
      dateTo,
    )

    return {
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter((t) => t.status === 'completed').length,
      voidedTransactions: transactions.filter((t) => t.status === 'voided').length,
      refundedTransactions: transactions.filter((t) => t.status === 'refunded').length,
      totalRevenue: transactions
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + t.totalAmount, 0),
      totalDiscounts: transactions
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + t.discountAmount, 0),
      cashSales: transactions
        .filter((t) => t.status === 'completed' && t.paymentMethod === 'cash')
        .reduce((sum, t) => sum + t.totalAmount, 0),
      cardSales: transactions
        .filter((t) => t.status === 'completed' && t.paymentMethod === 'card')
        .reduce((sum, t) => sum + t.totalAmount, 0),
      transferSales: transactions
        .filter((t) => t.status === 'completed' && t.paymentMethod === 'transfer')
        .reduce((sum, t) => sum + t.totalAmount, 0),
      ewalletSales: transactions
        .filter((t) => t.status === 'completed' && t.paymentMethod === 'ewallet')
        .reduce((sum, t) => sum + t.totalAmount, 0),
    }
  }
}
