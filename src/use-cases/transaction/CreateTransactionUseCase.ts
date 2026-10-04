import type { Transaction } from '@/domain/entities/Transaction'
import { DailySale } from '@/domain/entities/DailySale'
import type { DailyStock } from '@/domain/entities/DailyStock'
import type { DailySaleRepository } from '@/domain/repositories/DailySaleRepository'
import type { DailyStockRepository } from '@/domain/repositories/DailyStockRepository'
import type {
  ProductRepository,
  ProductRow,
} from '@/domain/repositories/ProductRepository'
import type { TransactionRepository } from '@/domain/repositories/TransactionRepository'
import { StockService } from '@/domain/services/StockService'
import { StockBehavior } from '@/domain/catalog/value-objects/stock-behavior'
import { DomainException, DomainErrorCode } from '@/domain/errors/DomainException'
import { logger } from '@/lib/logger'

export interface CreateTransactionInput {
  tenantId: string
  transactionId?: string
  outletId: string
  cashierId: string
  deviceId?: string
  shiftId?: string
  status?: 'pending' | 'completed'
  items: {
    productId: string
    productName?: string
    productSku?: string
    quantity: number
    unitPrice?: number
  }[]
  paymentMethod: 'cash' | 'card' | 'transfer' | 'ewallet'
  amountPaid?: number
  discountAmount: number
  notes?: string
  planLimit: number | null
  currentMonthCount: number
}

export interface CreateTransactionResult {
  success: boolean
  transaction: Transaction
  transactionId: string
  replayed: boolean
}

type ResolvedTransactionItem = {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
}

export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly dailySaleRepo: DailySaleRepository,
    private readonly dailyStockRepo: DailyStockRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  async execute(input: CreateTransactionInput): Promise<CreateTransactionResult> {
    if (input.transactionId) {
      const existingTransaction = await this.transactionRepo.findByTransactionId(input.transactionId)

      if (existingTransaction) {
        if (existingTransaction.outletId !== input.outletId) {
          throw new Error('Transaction ID conflict')
        }

        return {
          success: true,
          transaction: existingTransaction,
          transactionId: existingTransaction.transactionId,
          replayed: true,
        }
      }
    }

    if (input.planLimit !== null && input.currentMonthCount >= input.planLimit) {
      throw new Error(`PLAN_LIMIT_REACHED:${input.currentMonthCount}:${input.planLimit}`)
    }

    const resolvedItems = await this.resolveItems(input.items, input.tenantId)
    const subtotal = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    )
    const taxAmount = 0
    const totalAmount = subtotal - input.discountAmount + taxAmount
    const status = input.status ?? 'completed'
    const amountPaid = status === 'pending' ? 0 : input.amountPaid ?? totalAmount
    const changeAmount = status === 'pending' ? 0 : amountPaid - totalAmount

    if (status === 'completed' && changeAmount < 0) {
      throw new Error('Insufficient payment amount')
    }

    const transactionId = input.transactionId
      ?? `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    let transaction: Transaction
    try {
      transaction = await this.transactionRepo.create({
        transactionId,
        tenantId: input.tenantId,
        outletId: input.outletId,
        cashierId: input.cashierId,
        deviceId: input.deviceId ?? null,
        shiftId: input.shiftId ?? null,
        status,
        subtotal,
        discountAmount: input.discountAmount,
        taxAmount,
        totalAmount,
        paymentMethod: input.paymentMethod,
        amountPaid,
        changeAmount,
        notes: input.notes ?? null,
        voidReason: null,
        voidedBy: null,
        voidedAt: null,
        refundReason: null,
        refundedBy: null,
        refundedAt: null,
        refundAmount: null,
      })
    } catch (error: any) {
      if (input.transactionId && (error?.message?.includes('unique constraint') || error?.message?.includes('idx_transactions_tenant_txn_id') || error?.message?.includes('duplicate key'))) {
        const existing = await this.transactionRepo.findByTransactionId(input.transactionId)
        if (existing) {
          return {
            success: true,
            transaction: existing,
            transactionId: existing.transactionId,
            replayed: true,
          }
        }
      }
      throw error
    }

    const items = resolvedItems.map((item) => ({
      tenantId: input.tenantId,
      transactionId: transaction.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }))

    try {
      await this.transactionRepo.createItems(items)
    } catch (error) {
      await this.transactionRepo.voidById(transaction.id)
      throw error
    }

    if (status === 'pending') {
      return {
        success: true,
        transaction,
        transactionId,
        replayed: false,
      }
    }

    // Stock before daily sales: a short tracked line voids the sale, and the daily
    // sales aggregate must not have been written for a sale that no longer exists.
    try {
      await this.deductStock(resolvedItems, input.outletId, input.tenantId)
    } catch (error) {
      await this.transactionRepo.voidById(transaction.id)
      throw error
    }

    await this.recordDailySales(resolvedItems, input.tenantId, input.outletId)

    return {
      success: true,
      transaction,
      transactionId,
      replayed: false,
    }
  }

  async finalizePendingTransaction(input: {
    tenantId: string
    transactionId: string
    amountPaid?: number
  }): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(input.transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    if (transaction.tenantId !== input.tenantId) {
      throw new Error('Transaction belongs to a different tenant')
    }

    if (transaction.status === 'completed') {
      return transaction
    }

    if (transaction.status !== 'pending') {
      throw new Error(`Cannot finalize transaction with status ${transaction.status}`)
    }

    const amountPaid = input.amountPaid ?? transaction.totalAmount
    const changeAmount = amountPaid - transaction.totalAmount
    if (changeAmount < 0) {
      throw new Error('Insufficient payment amount')
    }

    await this.transactionRepo.updateToCompleted(transaction.id, amountPaid, changeAmount)

    try {
      await this.recordDailySales(transaction.items, transaction.tenantId, transaction.outletId)
    } catch (error) {
      logger.error('Failed to record daily sales during finalize:', error)
    }

    try {
      await this.deductStock(transaction.items, transaction.outletId, transaction.tenantId)
    } catch (error) {
      // The payment was already captured, so voiding the sale here would be wrong.
      // Surface it loudly instead: stock and sales now disagree until reconciled.
      logger.error(
        'STOCK NOT DEDUCTED for a finalized transaction — stock and sales now disagree and need manual reconciliation',
        error,
      )
    }

    const finalizedTransaction = await this.transactionRepo.findById(transaction.id)
    if (!finalizedTransaction) {
      throw new Error('Failed to reload finalized transaction')
    }

    return finalizedTransaction
  }

  private async resolveItems(
    items: CreateTransactionInput['items'],
    tenantId: string,
  ): Promise<ResolvedTransactionItem[]> {
    const products = await this.productRepo.getByIds(
      items.map((item) => item.productId),
      tenantId,
    )
    const productMap = new Map(products.map((product) => [product.id, product]))

    return items.map((item) => {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`)
      }

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: this.resolveUnitPrice(product, item.unitPrice),
      }
    })
  }

  private resolveUnitPrice(product: ProductRow, fallback?: number): number {
    if (product.price !== null && product.price !== undefined) {
      return product.price
    }

    return fallback ?? 0
  }

  private async recordDailySales(
    items: Array<{ productId: string; quantity: number; unitPrice: number }>,
    tenantId: string,
    outletId: string,
  ): Promise<void> {
    for (const item of items) {
      try {
        const sale: DailySale = {
          id: crypto.randomUUID(),
          tenantId,
          productId: item.productId,
          outletId,
          saleDate: new Date(),
          quantitySold: item.quantity,
          revenue: item.quantity * item.unitPrice,
          createdAt: new Date(),
        }
        await this.dailySaleRepo.save(sale)
      } catch (error) {
        logger.error('Failed to insert daily_sales:', error)
      }
    }
  }

  /**
   * Deduct stock for every tracked line.
   *
   * Whether a line may be deducted at all comes from StockService, so a POS sale
   * cannot drift from the rule the rest of the system documents.
   *
   * A level is only enforced when the tenant actually keeps a daily record for the
   * product — today's row, or yesterday's carried forward. With no record at all,
   * the product is not being tracked at this outlet, so nothing is deducted and no
   * row is created. The previous code opened a brand new row at zero and wrote a
   * negative level, which then failed every later sale of that product.
   *
   * Insufficient stock raises DomainException instead of writing a negative level,
   * and write failures propagate instead of being swallowed: a sale that took money
   * must not quietly fail to move stock.
   */
  private async deductStock(
    items: { productId: string; quantity: number }[],
    outletId: string,
    tenantId: string,
  ): Promise<void> {
    // stock_date is compared as a UTC calendar day (getByDate uses toISOString), so
    // the boundaries must be built in UTC. Local midnight is wrong in any timezone
    // east of UTC — in WIB (UTC+7) it lands on the previous UTC day, the lookups miss
    // every row, and stock silently stops being deducted.
    const today = new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`)
    const yesterday = new Date(today)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)

    const products = await this.productRepo.getByIds(
      items.map((item) => item.productId),
      tenantId,
    )
    const productMap = new Map(products.map((product) => [product.id, product]))

    // Plan every line before writing any of them, so a multi-line sale cannot be
    // half-applied when one product turns out to be short.
    const writes: DailyStock[] = []

    for (const item of items) {
      const product = productMap.get(item.productId)
      const stockBehavior = (product?.stock_behavior ?? StockBehavior.TRACKED) as StockBehavior

      if (stockBehavior === StockBehavior.UNTRACKED || stockBehavior === StockBehavior.CONSUMED) {
        continue
      }

      const todayStock = await this.dailyStockRepo.getByDate(outletId, item.productId, today)
      const knownStock =
        todayStock ?? (await this.dailyStockRepo.getByDate(outletId, item.productId, yesterday))

      if (!knownStock) {
        continue
      }

      const result = StockService.deductBehavior(stockBehavior, knownStock.stockAkhir, item.quantity)

      if (!result.success || result.newStockLevel === null) {
        throw new DomainException(
          DomainErrorCode.INSUFFICIENT_STOCK,
          `Insufficient stock for "${product?.name ?? item.productId}": ${knownStock.stockAkhir} available, ${item.quantity} requested`,
        )
      }

      writes.push({
        id: todayStock ? knownStock.id : crypto.randomUUID(),
        tenantId,
        productId: item.productId,
        outletId,
        stockDate: today,
        stockAwal: todayStock ? knownStock.stockAwal : knownStock.stockAkhir,
        stockIn: todayStock ? knownStock.stockIn : 0,
        stockOut: (todayStock ? knownStock.stockOut : 0) + item.quantity,
        stockAkhir: result.newStockLevel,
        createdAt: todayStock ? knownStock.createdAt : new Date(),
      })
    }

    for (const write of writes) {
      await this.dailyStockRepo.save(write)
    }
  }

}
