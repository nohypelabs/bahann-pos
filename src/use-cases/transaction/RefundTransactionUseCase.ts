import type { TransactionRepository } from '@/domain/repositories/TransactionRepository'

export interface RefundTransactionInput {
  transactionId: string
  reason: string
  refundAmount?: number
  userId: string
  tenantOutletIds: string[]
}

export class RefundTransactionUseCase {
  constructor(private readonly transactionRepo: TransactionRepository) {}

  async execute(input: RefundTransactionInput): Promise<{ success: boolean }> {
    const transaction = await this.transactionRepo.findById(input.transactionId)

    if (!transaction || !input.tenantOutletIds.includes(transaction.outletId)) {
      throw new Error('Transaction not found')
    }

    if (transaction.status === 'voided' || transaction.status === 'refunded') {
      throw new Error('Transaction already voided or refunded')
    }

    const refundAmount = input.refundAmount ?? transaction.totalAmount

    if (refundAmount > transaction.totalAmount) {
      throw new Error('Refund amount cannot exceed transaction total')
    }

    await this.transactionRepo.updateToRefunded(
      input.transactionId,
      input.reason,
      input.userId,
      refundAmount,
    )

    return { success: true }
  }
}
