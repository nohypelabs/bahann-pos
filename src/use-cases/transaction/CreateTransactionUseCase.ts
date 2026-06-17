import type { Transaction } from '@/domain/entities/Transaction'
import type { TransactionRepository } from '@/domain/repositories/TransactionRepository'
import type { DailySaleRepository } from '@/domain/repositories/DailySaleRepository'
import type { DailyStockRepository } from '@/domain/repositories/DailyStockRepository'
import type { ProductRepository } from '@/domain/repositories/ProductRepository'
import { DailySale } from '@/domain/entities/DailySale'
import { logger } from '@/lib/logger'

export interface CreateTransactionInput {
  tenantId: string
  transactionId?: string
  outletId: string
  cashierId: string
  items: {
    productId: string
    productName: string
    productSku: string
    quantity: number
    unitPrice: number
  }[]
  paymentMethod: 'cash' | 'card' | 'transfer' | 'ewallet'
  amountPaid: number
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

    // Check plan limit
    if (input.planLimit !== null && input.currentMonthCount >= input.planLimit) {
      throw new Error(`PLAN_LIMIT_REACHED:${input.currentMonthCount}:${input.planLimit}`)
    }

    // Calculate totals
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    )
    const taxAmount = 0
    const totalAmount = subtotal - input.discountAmount + taxAmount
    const changeAmount = input.amountPaid - totalAmount

    if (changeAmount < 0) {
      throw new Error('Insufficient payment amount')
    }

    // Generate transaction ID
    const transactionId = input.transactionId
      ?? `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create transaction
    const transaction = await this.transactionRepo.create({
      transactionId,
      outletId: input.outletId,
      cashierId: input.cashierId,
      status: 'completed',
      subtotal,
      discountAmount: input.discountAmount,
      taxAmount,
      totalAmount,
      paymentMethod: input.paymentMethod,
      amountPaid: input.amountPaid,
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

    // Insert transaction items
    const items = input.items.map((item) => ({
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
      // Rollback transaction by voiding it
      await this.transactionRepo.voidById(transaction.id)
      throw error
    }

    // Record daily_sales for backward compatibility
    for (const item of input.items) {
      try {
        const sale: DailySale = {
          id: crypto.randomUUID(),
          tenantId: input.tenantId,
          productId: item.productId,
          outletId: input.outletId,
          saleDate: new Date(),
          quantitySold: item.quantity,
          revenue: item.quantity * item.unitPrice,
          createdAt: new Date(),
        }
        await this.dailySaleRepo.save(sale)
      } catch (error) {
        logger.error('Failed to insert daily_sales:', error)
        // Don't fail the whole transaction, daily_sales is just for reporting
      }
    }

    // Deduct stock for TRACKED items
    await this.deductStock(input.items, input.outletId, input.tenantId)

    return {
      success: true,
      transaction,
      transactionId,
      replayed: false,
    }
  }

  private async deductStock(
    items: { productId: string; quantity: number }[],
    outletId: string,
    tenantId: string,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    // Fetch product stock_behavior for all items
    const productIds = items.map((item) => item.productId)
    const products = await this.productRepo.listAll()
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of items) {
      const product = productMap.get(item.productId)
      const stockBehavior = product?.stockBehavior ?? 'TRACKED'

      // Skip stock deduction for UNTRACKED/CONSUMED items
      if (stockBehavior === 'UNTRACKED' || stockBehavior === 'CONSUMED') {
        continue
      }

      // TRACKED: get latest stock for this product at this outlet for today
      const todayStock = await this.dailyStockRepo.getByDate(outletId, item.productId, new Date(today))

      if (todayStock) {
        // Update existing stock record
        const newStockOut = todayStock.stockOut + item.quantity
        const newStockAkhir = todayStock.stockAwal + todayStock.stockIn - newStockOut

        try {
          const updatedStock = {
            ...todayStock,
            stockOut: newStockOut,
            stockAkhir: newStockAkhir,
          }
          await this.dailyStockRepo.save(updatedStock)
        } catch (error) {
          logger.error('Failed to update stock:', error)
        }
      } else {
        // No stock record for today — get yesterday's stock as stock_awal
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStock = await this.dailyStockRepo.getByDate(outletId, item.productId, yesterday)

        const stockAwal = yesterdayStock?.stockAkhir ?? 0
        const stockAkhir = stockAwal - item.quantity

        try {
          const newStock = {
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
          }
          await this.dailyStockRepo.save(newStock)
        } catch (error) {
          logger.error('Failed to create stock record:', error)
        }
      }
    }
  }
}
