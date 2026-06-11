import type { TransactionRepository } from '@/domain/repositories/TransactionRepository'

export interface VoidTransactionInput {
  transactionId: string
  reason: string
  userId: string
  tenantOutletIds: string[]
}

export class VoidTransactionUseCase {
  constructor(private readonly transactionRepo: TransactionRepository) {}

  async execute(input: VoidTransactionInput): Promise<{ success: boolean }> {
    const transaction = await this.transactionRepo.findById(input.transactionId)

    if (!transaction || !input.tenantOutletIds.includes(transaction.outletId)) {
      throw new Error('Transaction not found')
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only void completed transactions')
    }

    // Check if same day (can only void same-day transactions)
    const txDate = transaction.createdAt.toDateString()
    const today = new Date().toDateString()
    if (txDate !== today) {
      throw new Error('Can only void transactions from today. Use refund for older transactions.')
    }

    await this.transactionRepo.updateToVoided(input.transactionId, input.reason, input.userId)

    return { success: true }
  }
}
