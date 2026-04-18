'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { TransactionStatus } from '@/types'

export default function TransactionsPage() {
  const [filters, setFilters] = useState<{
    status?: TransactionStatus
    dateFrom?: string
    dateTo?: string
    outletId?: string
  }>({})

  const [selectedTx, setSelectedTx] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)

  const { data, isLoading, refetch } = trpc.transactions.list.useQuery(filters)
  const { data: outletsData } = trpc.outlets.getAll.useQuery()
  const { data: permissionsData } = trpc.users.getMyPermissions.useQuery()

  const voidMutation = trpc.transactions.void.useMutation({
    onSuccess: () => {
      refetch()
      setShowVoidModal(false)
      setVoidReason('')
      setSelectedTx(null)
    },
  })

  const refundMutation = trpc.transactions.refund.useMutation({
    onSuccess: () => {
      refetch()
      setShowRefundModal(false)
      setRefundReason('')
      setSelectedTx(null)
    },
  })

  const handleVoid = async () => {
    if (!selectedTx || !voidReason || voidReason.length < 10) {
      alert('Please provide a reason (min 10 characters)')
      return
    }

    try {
      await voidMutation.mutateAsync({
        transactionId: selectedTx,
        reason: voidReason,
      })
      alert('Transaction voided successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to void transaction')
    }
  }

  const handleRefund = async () => {
    if (!selectedTx || !refundReason || refundReason.length < 10) {
      alert('Please provide a reason (min 10 characters)')
      return
    }

    try {
      await refundMutation.mutateAsync({
        transactionId: selectedTx,
        reason: refundReason,
      })
      alert('Transaction refunded successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to refund transaction')
    }
  }

  const canVoid = (tx: any) => {
    const isToday = new Date(tx.created_at).toDateString() === new Date().toDateString()
    return tx.status === 'completed' && isToday && permissionsData?.permissions?.canVoidTransactions
  }

  const canRefund = (tx: any) => {
    return (tx.status === 'completed' || tx.status === 'voided') &&
           permissionsData?.permissions?.canVoidTransactions
  }

  const getStatusBadge = (status: TransactionStatus) => {
    const styles = {
      completed: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
      pending: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
      voided: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
      refunded: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Transaction Management</h1>
        <p className="text-gray-600 dark:text-gray-400">View, void, and refund transactions</p>
      </div>

      {/* Filters */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Status"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as TransactionStatus || undefined })}
              options={[
                { value: '', label: 'All' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'voided', label: 'Voided' },
                { value: 'refunded', label: 'Refunded' },
              ]}
              fullWidth
            />
            <Select
              label="Outlet"
              value={filters.outletId || ''}
              onChange={(e) => setFilters({ ...filters, outletId: e.target.value || undefined })}
              options={[
                { value: '', label: 'All Outlets' },
                ...(outletsData?.outlets?.map(o => ({ value: o.id, label: o.name })) || []),
              ]}
              fullWidth
            />
            <Input
              type="date"
              label="From"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
              fullWidth
            />
            <Input
              type="date"
              label="To"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
              fullWidth
            />
          </div>
        </CardBody>
      </Card>

      {/* Transactions List */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <CardTitle>Transactions ({data?.total || 0})</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</p>
          ) : !data?.transactions || data.transactions.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Payment</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{tx.transaction_id}</td>
                      <td className="px-4 py-3 text-sm">{formatDateTime(tx.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {formatCurrency(tx.total_amount)}
                        {tx.discount_amount > 0 && (
                          <span className="text-xs text-green-600 ml-1">
                            (-{formatCurrency(tx.discount_amount)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{tx.payment_method}</td>
                      <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {canVoid(tx) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTx(tx.id)
                                setShowVoidModal(true)
                              }}
                            >
                              Void
                            </Button>
                          )}
                          {canRefund(tx) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTx(tx.id)
                                setShowRefundModal(true)
                              }}
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" padding="lg" className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Void Transaction</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please provide a reason for voiding this transaction (minimum 10 characters):
                </p>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={4}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="E.g., Customer changed mind, incorrect items..."
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleVoid}
                    disabled={voidMutation.isPending}
                  >
                    {voidMutation.isPending ? 'Processing...' : 'Confirm Void'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowVoidModal(false)
                      setVoidReason('')
                      setSelectedTx(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" padding="lg" className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Refund Transaction</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please provide a reason for refunding this transaction:
                </p>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={4}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="E.g., Defective product, customer request..."
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleRefund}
                    disabled={refundMutation.isPending}
                  >
                    {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRefundModal(false)
                      setRefundReason('')
                      setSelectedTx(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
