import type { Transaction } from '@/domain/entities/Transaction'
import { DailySale } from '@/domain/entities/DailySale'
import type { DailySaleRepository } from '@/domain/repositories/DailySaleRepository'
import type { DailyStockRepository } from '@/domain/repositories/DailyStockRepository'
import type {
  ProductRepository,
  ProductRow,
} from '@/domain/repositories/ProductRepository'
import type { TransactionRepository } from '@/domain/repositories/TransactionRepository'
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

    const transaction = await this.transactionRepo.create({
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

    await this.recordDailySales(resolvedItems, input.tenantId, input.outletId)
    await this.deductStock(resolvedItems, input.outletId, input.tenantId)

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
    await this.recordDailySales(transaction.items, transaction.tenantId, transaction.outletId)
    await this.deductStock(transaction.items, transaction.outletId, transaction.tenantId)

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

  private async deductStock(
    items: { productId: string; quantity: number }[],
    outletId: string,
    tenantId: string,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const products = await this.productRepo.getByIds(
      items.map((item) => item.productId),
      tenantId,
    )
    const productMap = new Map(products.map((product) => [product.id, product]))

    for (const item of items) {
      const product = productMap.get(item.productId)
      const stockBehavior = product?.stock_behavior ?? 'TRACKED'

      if (stockBehavior === 'UNTRACKED' || stockBehavior === 'CONSUMED') {
        continue
      }

      const todayStock = await this.dailyStockRepo.getByDate(
        outletId,
        item.productId,
        new Date(today),
      )

      if (todayStock) {
        const newStockOut = todayStock.stockOut + item.quantity
        const newStockAkhir = todayStock.stockAwal + todayStock.stockIn - newStockOut

        try {
          await this.dailyStockRepo.save({
            ...todayStock,
            stockOut: newStockOut,
            stockAkhir: newStockAkhir,
          })
        } catch (error) {
          logger.error('Failed to update stock:', error)
        }
        continue
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStock = await this.dailyStockRepo.getByDate(
        outletId,
        item.productId,
        yesterday,
      )

      const stockAwal = yesterdayStock?.stockAkhir ?? 0
      const stockAkhir = stockAwal - item.quantity

      try {
        await this.dailyStockRepo.save({
          id: crypto.randomUUID(),
          tenantId,
          productId: item.productId,
          outletId,
          stockDate: new Date(today),
          stockAwal,
          stockIn: 0,
          stockOut: item.quantity,
          stockAkhir,
          createdAt: new Date(),
        })
      } catch (error) {
        logger.error('Failed to create stock record:', error)
      }
    }
  }
}
