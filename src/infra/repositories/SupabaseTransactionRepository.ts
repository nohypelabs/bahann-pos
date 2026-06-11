import { supabaseAdmin as supabase } from '../supabase/server'
import type {
  Transaction,
  TransactionItem,
} from '@/domain/entities/Transaction'
import type {
  TransactionRepository,
  TransactionFilters,
  TransactionWithRelations,
  TransactionSummary,
} from '@/domain/repositories/TransactionRepository'

interface TransactionRow {
  id: string
  transaction_id: string
  outlet_id: string
  cashier_id: string
  status: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  payment_method: string
  amount_paid: number
  change_amount: number
  notes: string | null
  void_reason: string | null
  voided_by: string | null
  voided_at: string | null
  refund_reason: string | null
  refunded_by: string | null
  refunded_at: string | null
  refund_amount: number | null
  created_at: string | null
}

interface TransactionItemRow {
  id: string
  transaction_id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number
  line_total: number
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    outletId: row.outlet_id,
    cashierId: row.cashier_id,
    status: row.status as Transaction['status'],
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method as Transaction['paymentMethod'],
    amountPaid: row.amount_paid,
    changeAmount: row.change_amount,
    notes: row.notes,
    voidReason: row.void_reason,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at ? new Date(row.voided_at) : null,
    refundReason: row.refund_reason,
    refundedBy: row.refunded_by,
    refundedAt: row.refunded_at ? new Date(row.refunded_at) : null,
    refundAmount: row.refund_amount,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  }
}

function toTransactionItem(row: TransactionItemRow): TransactionItem {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
  }
}

export class SupabaseTransactionRepository implements TransactionRepository {
  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        transaction_id: transaction.transactionId,
        outlet_id: transaction.outletId,
        cashier_id: transaction.cashierId,
        status: transaction.status,
        subtotal: transaction.subtotal,
        discount_amount: transaction.discountAmount,
        tax_amount: transaction.taxAmount,
        total_amount: transaction.totalAmount,
        payment_method: transaction.paymentMethod,
        amount_paid: transaction.amountPaid,
        change_amount: transaction.changeAmount,
        notes: transaction.notes,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create transaction: ${error.message}`)
    return toTransaction(data as TransactionRow)
  }

  async createItems(items: Omit<TransactionItem, 'id'>[]): Promise<void> {
    const rows = items.map((item) => ({
      transaction_id: item.transactionId,
      product_id: item.productId,
      product_name: item.productName,
      product_sku: item.productSku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
    }))

    const { error } = await supabase
      .from('transaction_items')
      .insert(rows)

    if (error) throw new Error(`Failed to create transaction items: ${error.message}`)
  }

  async findById(id: string): Promise<TransactionWithRelations | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (*),
        outlets (id, name, address),
        cashier:users!cashier_id (id, name, email)
      `)
      .eq('id', id)
      .single()

    if (error || !data) return null

    const row = data as TransactionRow & {
      transaction_items: TransactionItemRow[]
      outlets: { id: string; name: string; address?: string } | null
      cashier: { id: string; name: string; email?: string } | null
    }

    return {
      ...toTransaction(row),
      items: (row.transaction_items ?? []).map(toTransactionItem),
      outlet: row.outlets ?? undefined,
      cashier: row.cashier ?? undefined,
    }
  }

  async findByOutletIds(
    outletIds: string[],
    filters: TransactionFilters,
  ): Promise<{ transactions: TransactionWithRelations[]; total: number }> {
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        transaction_items (*),
        outlets (id, name),
        cashier:users!cashier_id (id, name)
      `,
        { count: 'estimated' },
      )
      .in('outlet_id', outletIds)
      .order('created_at', { ascending: false })

    if (filters.outletId) query = query.eq('outlet_id', filters.outletId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`)

    const transactions = (data ?? []).map((row) => {
      const r = row as TransactionRow & {
        transaction_items: TransactionItemRow[]
        outlets: { id: string; name: string } | null
        cashier: { id: string; name: string } | null
      }
      return {
        ...toTransaction(r),
        items: (r.transaction_items ?? []).map(toTransactionItem),
        outlet: r.outlets ?? undefined,
        cashier: r.cashier ?? undefined,
      }
    })

    return { transactions, total: count ?? 0 }
  }

  async findByOutletIdsForSummary(
    outletIds: string[],
    outletId: string | undefined,
    dateFrom: string,
    dateTo: string,
  ): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .in('outlet_id', outletIds)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)

    if (outletId) query = query.eq('outlet_id', outletId)

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch transaction summary: ${error.message}`)

    return (data as TransactionRow[]).map(toTransaction)
  }

  async updateToVoided(id: string, reason: string, voidedBy: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'voided',
        void_reason: reason,
        voided_by: voidedBy,
        voided_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new Error(`Failed to void transaction: ${error.message}`)
  }

  async updateToRefunded(id: string, reason: string, refundedBy: string, refundAmount: number): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'refunded',
        refund_reason: reason,
        refunded_by: refundedBy,
        refunded_at: new Date().toISOString(),
        refund_amount: refundAmount,
      })
      .eq('id', id)

    if (error) throw new Error(`Failed to refund transaction: ${error.message}`)
  }

  async countByOutletSince(outletId: string, since: string): Promise<number> {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('outlet_id', outletId)
      .eq('status', 'completed')
      .gte('created_at', since)

    return count ?? 0
  }

  async voidById(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'voided', void_reason: 'Failed to insert items' })
      .eq('id', id)

    if (error) throw new Error(`Failed to void transaction: ${error.message}`)
  }
}
