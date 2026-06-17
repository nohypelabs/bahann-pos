'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { ApprovalCard } from '@/components/ui/ApprovalCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import {
  CheckCircle, Clock, CheckCircle2, XCircle,
  ShieldAlert, RotateCcw, Percent, Loader2,
} from 'lucide-react'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'
type FilterTab = 'all' | ApprovalStatus

const ACTION_LABELS: Record<string, string> = {
  void: 'Void',
  refund: 'Refund',
  discount_override: 'Diskon Manual',
  cash_drawer_open: 'Buka Laci',
  payment_correction: 'Koreksi Pembayaran',
  shift_close: 'Tutup Shift',
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  void: <ShieldAlert className="w-4 h-4" />,
  refund: <RotateCcw className="w-4 h-4" />,
  discount_override: <Percent className="w-4 h-4" />,
  cash_drawer_open: <ShieldAlert className="w-4 h-4" />,
  payment_correction: <ShieldAlert className="w-4 h-4" />,
  shift_close: <ShieldAlert className="w-4 h-4" />,
}

const STATUS_MAP: Record<ApprovalStatus, 'pending' | 'active' | 'rejected'> = {
  pending: 'pending',
  approved: 'active',
  rejected: 'rejected',
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [rejectModal, setRejectModal] = useState<{ open: boolean; approvalId: string | null }>({
    open: false,
    approvalId: null,
  })
  const [rejectionReason, setRejectionReason] = useState('')

  const { showToast } = useToast()
  const utils = trpc.useUtils()

  // Fetch all approvals (we'll filter client-side for tabs, or use status param)
  const { data: allData, isLoading: allLoading } = trpc.transactionApprovals.list.useQuery(
    { limit: 100 },
    { staleTime: 30_000 },
  )
  const { data: pendingData } = trpc.transactionApprovals.list.useQuery(
    { status: 'pending', limit: 100 },
    { staleTime: 15_000 },
  )

  const pendingCount = pendingData?.approvals?.length ?? 0

  // Mutations
  const approveMutation = trpc.transactionApprovals.approve.useMutation({
    onSuccess: () => {
      showToast('Persetujuan berhasil disetujui', 'success')
      utils.transactionApprovals.list.invalidate()
    },
    onError: (err) => showToast(err.message || 'Gagal menyetujui', 'error'),
  })

  const rejectMutation = trpc.transactionApprovals.reject.useMutation({
    onSuccess: () => {
      showToast('Permintaan berhasil ditolak', 'success')
      setRejectModal({ open: false, approvalId: null })
      setRejectionReason('')
      utils.transactionApprovals.list.invalidate()
    },
    onError: (err) => showToast(err.message || 'Gagal menolak', 'error'),
  })

  // Filter approvals by tab
  const allApprovals = allData?.approvals ?? []
  const pendingApprovals = pendingData?.approvals ?? []

  const filteredApprovals = activeTab === 'all'
    ? allApprovals
    : allApprovals.filter((a: any) => a.status === activeTab)

  // Sort: pending first, then by requested_at desc
  const sortedApprovals = [...filteredApprovals].sort((a: any, b: any) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })

  const handleApprove = async (approvalId: string) => {
    await approveMutation.mutateAsync({ approvalId })
  }

  const handleRejectClick = (approvalId: string) => {
    setRejectModal({ open: true, approvalId })
    setRejectionReason('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectModal.approvalId) return
    await rejectMutation.mutateAsync({
      approvalId: rejectModal.approvalId,
      rejectionReason: rejectionReason.trim() || undefined,
    })
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
  ]

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <PageHeader
        title="Antrian Persetujuan"
        subtitle="Kelola permintaan void, refund, dan koreksi dari kasir"
        action={
          pendingCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-full">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                {pendingCount} menunggu
              </span>
            </div>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {allLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!allLoading && sortedApprovals.length === 0 && (
        <SectionCard>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Tidak ada yang perlu disetujui
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Semua transaksi outlet aman.
            </p>
          </div>
        </SectionCard>
      )}

      {/* Pending Approvals (always at top) */}
      {!allLoading && pendingApprovals.length > 0 && (activeTab === 'all' || activeTab === 'pending') && (
        <SectionCard title="Menunggu Persetujuan" action={
          <StatusBadge status="pending" label={`${pendingCount} pending`} />
        }>
          <div className="space-y-3">
            {pendingApprovals.map((approval: any) => (
              <ApprovalCard
                key={approval.id}
                actionType={ACTION_LABELS[approval.action_type] || approval.action_type}
                actorName={approval.requester?.name || 'Unknown'}
                referenceId={approval.transaction?.transaction_id || approval.transaction_id || '-'}
                amount={approval.amount ? formatCurrency(Number(approval.amount)) : approval.transaction?.total_amount ? formatCurrency(Number(approval.transaction.total_amount)) : undefined}
                reason={approval.reason || ''}
                onApprove={() => handleApprove(approval.id)}
                onReject={() => handleRejectClick(approval.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Other Approvals (approved/rejected) */}
      {!allLoading && activeTab !== 'pending' && (() => {
        const nonPending = sortedApprovals.filter((a: any) => a.status !== 'pending')
        if (nonPending.length === 0) return null

        return (
          <SectionCard title={activeTab === 'all' ? 'Riwayat' : activeTab === 'approved' ? 'Disetujui' : 'Ditolak'}>
            <div className="space-y-3">
              {nonPending.map((approval: any) => (
                <div
                  key={approval.id}
                  className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {ACTION_LABELS[approval.action_type] || approval.action_type}
                        </p>
                        <StatusBadge
                          status={STATUS_MAP[approval.status as ApprovalStatus] || 'neutral'}
                          label={approval.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        />
                      </div>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400">
                        {approval.requester?.name || 'Unknown'} · {approval.transaction?.transaction_id || '-'}
                        {approval.amount && (
                          <> · <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(Number(approval.amount))}</span></>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-gray-400">
                        {approval.decided_at
                          ? new Date(approval.decided_at).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '-'}
                      </p>
                      {approval.approver?.name && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          oleh {approval.approver.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {approval.reason && (
                    <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400 italic">
                      &ldquo;{approval.reason}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )
      })()}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, approvalId: null })}
        title="Tolak Permintaan"
        size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setRejectModal({ open: false, approvalId: null })}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {rejectMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              ) : (
                'Tolak'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Berikan alasan penolakan (opsional) agar kasir mengerti mengapa permintaan ditolak.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Contoh: Tidak ada bukti kerusakan barang"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-red-400 dark:focus:border-red-500 resize-none"
          />
        </div>
      </Modal>
    </div>
  )
}
