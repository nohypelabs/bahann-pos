'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { TransactionStatus } from '@/types'

const STATUS_BADGE: Record<TransactionStatus, string> = {
  completed: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
  pending:   'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
  voided:    'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  refunded:  'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
}

function StyledTextarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-none"
    />
  )
}

function StyledSelect({ label, value, onChange, options }: {
  label: string; value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { showToast } = useToast()
  const [filters, setFilters] = useState<{
    status?: TransactionStatus; dateFrom?: string; dateTo?: string; outletId?: string
  }>({})
  const [selectedTx,   setSelectedTx]   = useState<string | null>(null)
  const [voidReason,   setVoidReason]   = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [showVoid,     setShowVoid]     = useState(false)
  const [showRefund,   setShowRefund]   = useState(false)

  const { data, isLoading, refetch } = trpc.transactions.list.useQuery(filters)
  const { data: outletsData }        = trpc.outlets.getAll.useQuery()
  const { data: permissionsData }    = trpc.users.getMyPermissions.useQuery()

  const voidMutation = trpc.transactions.void.useMutation({
    onSuccess: () => { refetch(); setShowVoid(false); setVoidReason(''); setSelectedTx(null) },
  })
  const refundMutation = trpc.transactions.refund.useMutation({
    onSuccess: () => { refetch(); setShowRefund(false); setRefundReason(''); setSelectedTx(null) },
  })

  const handleVoid = async () => {
    if (!selectedTx || voidReason.length < 10) { showToast('Alasan minimal 10 karakter', 'error'); return }
    try {
      await voidMutation.mutateAsync({ transactionId: selectedTx, reason: voidReason })
      showToast('Transaksi berhasil divoid', 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal void transaksi', 'error') }
  }

  const handleRefund = async () => {
    if (!selectedTx || refundReason.length < 10) { showToast('Alasan minimal 10 karakter', 'error'); return }
    try {
      await refundMutation.mutateAsync({ transactionId: selectedTx, reason: refundReason })
      showToast('Transaksi berhasil direfund', 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal refund transaksi', 'error') }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canVoid = (tx: any) =>
    tx.status === 'completed' &&
    new Date(tx.created_at).toDateString() === new Date().toDateString() &&
    permissionsData?.permissions?.canVoidTransactions

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canRefund = (tx: any) =>
    (tx.status === 'completed' || tx.status === 'voided') &&
    permissionsData?.permissions?.canVoidTransactions

  const outletOptions = [
    { value: '', label: 'Semua Outlet' },
    ...(outletsData?.outlets?.map(o => ({ value: o.id, label: o.name })) || []),
  ]

  const closeVoid = () => { setShowVoid(false); setVoidReason(''); setSelectedTx(null) }
  const closeRefund = () => { setShowRefund(false); setRefundReason(''); setSelectedTx(null) }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Manajemen Transaksi" subtitle="Lihat, void, dan refund transaksi" />

      {/* Filter bar */}
      <SectionCard title="Filter">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StyledSelect label="Status" value={filters.status || ''}
            onChange={v => setFilters(f => ({ ...f, status: (v as TransactionStatus) || undefined }))}
            options={[
              { value: '', label: 'Semua' },
              { value: 'completed', label: 'Completed' },
              { value: 'pending',   label: 'Pending' },
              { value: 'voided',    label: 'Voided' },
              { value: 'refunded',  label: 'Refunded' },
            ]}
          />
          <StyledSelect label="Outlet" value={filters.outletId || ''}
            onChange={v => setFilters(f => ({ ...f, outletId: v || undefined }))}
            options={outletOptions}
          />
          <Input type="date" label="Dari" value={filters.dateFrom || ''}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))} fullWidth />
          <Input type="date" label="Sampai" value={filters.dateTo || ''}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))} fullWidth />
        </div>
      </SectionCard>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Transaksi <span className="text-gray-400 dark:text-gray-500 font-normal">({data?.total || 0})</span>
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Memuat…</div>
        ) : !data?.transactions?.length ? (
          <EmptyState icon="🧾" title="Tidak ada transaksi" description="Coba ubah filter untuk melihat data lain." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                  {['ID Transaksi', 'Tanggal', 'Total', 'Pembayaran', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 md:px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{tx.transaction_id}</td>
                    <td className="px-3 md:px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{formatDateTime(tx.created_at)}</td>
                    <td className="px-3 md:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(tx.total_amount)}
                      {tx.discount_amount > 0 && (
                        <span className="block text-[10px] font-normal text-green-600 dark:text-green-400">
                          -{formatCurrency(tx.discount_amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-xs capitalize text-gray-600 dark:text-gray-400">{tx.payment_method}</td>
                    <td className="px-3 md:px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[tx.status]}`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex gap-1.5">
                        {canVoid(tx) && (
                          <Button variant="outline" size="sm" onClick={() => { setSelectedTx(tx.id); setShowVoid(true) }}>Void</Button>
                        )}
                        {canRefund(tx) && (
                          <Button variant="outline" size="sm" onClick={() => { setSelectedTx(tx.id); setShowRefund(true) }}>Refund</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Void Modal */}
      {showVoid && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <SectionCard title="Void Transaksi"
              action={<button onClick={closeVoid} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Berikan alasan void (minimal 10 karakter):</p>
                <StyledTextarea value={voidReason} onChange={setVoidReason}
                  placeholder="Contoh: Pelanggan membatalkan, salah input…" />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" fullWidth onClick={closeVoid}>Batal</Button>
                  <Button variant="primary" fullWidth onClick={handleVoid} disabled={voidMutation.isPending}>
                    {voidMutation.isPending ? 'Memproses…' : 'Konfirmasi Void'}
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefund && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <SectionCard title="Refund Transaksi"
              action={<button onClick={closeRefund} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>}
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Berikan alasan refund (minimal 10 karakter):</p>
                <StyledTextarea value={refundReason} onChange={setRefundReason}
                  placeholder="Contoh: Produk cacat, permintaan pelanggan…" />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" fullWidth onClick={closeRefund}>Batal</Button>
                  <Button variant="primary" fullWidth onClick={handleRefund} disabled={refundMutation.isPending}>
                    {refundMutation.isPending ? 'Memproses…' : 'Konfirmasi Refund'}
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
