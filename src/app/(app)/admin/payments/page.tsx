'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import {
  CheckCircle, XCircle, Clock, Image, Eye, ChevronLeft, ChevronRight,
  CreditCard, Search, Filter, ExternalLink, Wallet,
} from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  warung: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  starter: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  professional: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  business: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  enterprise: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

const STATUS_STYLE: Record<string, { icon: React.ReactNode; label: string; rowColor: string; badgeColor: string }> = {
  pending:  { icon: <Clock className="w-4 h-4" />,       label: 'Menunggu',  rowColor: 'bg-yellow-50/50 dark:bg-yellow-900/10', badgeColor: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40' },
  approved: { icon: <CheckCircle className="w-4 h-4" />, label: 'Disetujui', rowColor: '',                                     badgeColor: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40' },
  rejected: { icon: <XCircle className="w-4 h-4" />,     label: 'Ditolak',   rowColor: '',                                     badgeColor: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40' },
}

function fmtRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PaymentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const u = JSON.parse(user)
        if (u.role !== 'super_admin') { router.push('/dashboard'); return }
        setUserRole(u.role)
      } catch { router.push('/dashboard') }
    }
  }, [router])

  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | undefined>(
    (searchParams.get('status') as any) || undefined
  )
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading, refetch } = trpc.paymentRequests.listAll.useQuery(
    { status: statusFilter, limit, offset: page * limit },
    { enabled: userRole === 'super_admin' }
  )

  const approveMutation = trpc.paymentRequests.approve.useMutation({ onSuccess: () => refetch() })
  const rejectMutation = trpc.paymentRequests.reject.useMutation({ onSuccess: () => refetch() })

  const [reviewModal, setReviewModal] = useState<{
    id: string; action: 'approve' | 'reject'
  } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [proofModal, setProofModal] = useState<string | null>(null)

  if (userRole !== 'super_admin') return null

  const totalPages = Math.ceil((data?.total ?? 0) / limit)
  const requests = data?.requests ?? []

  const pendingCount = statusFilter === undefined
    ? requests.filter(r => r.status === 'pending').length
    : statusFilter === 'pending' ? data?.total ?? 0 : 0

  const handleReviewSubmit = async () => {
    if (!reviewModal) return
    try {
      if (reviewModal.action === 'approve') {
        await approveMutation.mutateAsync({ requestId: reviewModal.id, note: reviewNote || undefined })
      } else {
        if (!reviewNote.trim()) return
        await rejectMutation.mutateAsync({ requestId: reviewModal.id, note: reviewNote })
      }
      setReviewModal(null)
      setReviewNote('')
    } catch { /* shown via mutation state */ }
  }

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pembayaran Manual</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review dan verifikasi permintaan upgrade tenant</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => {
          const isActive = s === 'all' ? !statusFilter : statusFilter === s
          return (
            <button key={s}
              onClick={() => { setStatusFilter(s === 'all' ? undefined : s); setPage(0) }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                isActive
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {s === 'all' ? 'Semua' : STATUS_STYLE[s]?.label || s}
              {s === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-yellow-500 text-white rounded-full">{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Memuat data...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Belum ada permintaan pembayaran
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Jumlah</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Bukti</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {requests.map(req => {
                    const s = STATUS_STYLE[req.status] || STATUS_STYLE.pending
                    return (
                      <tr key={req.id} className={`${s.rowColor} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{req.user?.name || '-'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{req.user?.email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {req.user?.plan && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[req.user.plan] || PLAN_COLORS.free}`}>
                                {req.user.plan}
                              </span>
                            )}
                            <span className="text-gray-400">→</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[req.plan] || PLAN_COLORS.free}`}>
                              {req.plan}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {req.cryptoAmount
                            ? <span className="text-purple-600 dark:text-purple-400">{req.cryptoAmount.toFixed(4)} {req.cryptoToken?.toUpperCase()}</span>
                            : (
                              <div>
                                <span>{fmtRupiah(req.uniqueAmount || req.amount)}</span>
                                {req.uniqueAmount && (
                                  <p className="text-[10px] text-green-600 dark:text-green-400 font-normal">unik</p>
                                )}
                              </div>
                            )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {req.cryptoToken ? (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <Wallet className="w-3.5 h-3.5" /> {req.cryptoToken.toUpperCase()} (SOL)
                            </span>
                          ) : req.paymentMethod === 'qris' ? 'QRIS' : 'Transfer Bank'}
                        </td>
                        <td className="px-4 py-3">
                          {req.cryptoTxHash ? (
                            <a href={`https://solscan.io/tx/${req.cryptoTxHash}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline">
                              <ExternalLink className="w-3.5 h-3.5" /> TX
                            </a>
                          ) : req.proofUrl ? (
                            <button onClick={() => setProofModal(req.proofUrl!)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                              <Eye className="w-3.5 h-3.5" /> Lihat
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Belum upload</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.badgeColor}`}>
                            {s.icon} {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(req.createdAt)}</td>
                        <td className="px-4 py-3">
                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setReviewModal({ id: req.id, action: 'approve' }); setReviewNote('') }}
                                className="px-2.5 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                                Setujui
                              </button>
                              <button onClick={() => { setReviewModal({ id: req.id, action: 'reject' }); setReviewNote('') }}
                                className="px-2.5 py-1 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">{req.adminNote || '-'}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {requests.map(req => {
                const s = STATUS_STYLE[req.status] || STATUS_STYLE.pending
                return (
                  <div key={req.id} className={`p-4 ${s.rowColor}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{req.user?.name || '-'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{req.user?.email || '-'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${s.badgeColor}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {req.user?.plan && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[req.user.plan] || PLAN_COLORS.free}`}>
                          {req.user.plan}
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">→</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_COLORS[req.plan] || PLAN_COLORS.free}`}>
                        {req.plan}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-auto">
                        {req.cryptoAmount
                          ? <span className="text-purple-600 dark:text-purple-400">{req.cryptoAmount.toFixed(4)} {req.cryptoToken?.toUpperCase()}</span>
                          : (
                            <span>
                              {fmtRupiah(req.uniqueAmount || req.amount)}
                              {req.uniqueAmount && <span className="text-[10px] text-green-600 dark:text-green-400 ml-1">unik</span>}
                            </span>
                          )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span>{req.cryptoToken
                        ? <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400"><Wallet className="w-3 h-3" /> {req.cryptoToken.toUpperCase()} (SOL)</span>
                        : req.paymentMethod === 'qris' ? 'QRIS' : 'Transfer Bank'}</span>
                      <span>{fmtDate(req.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      {req.cryptoTxHash ? (
                        <a href={`https://solscan.io/tx/${req.cryptoTxHash}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                          <ExternalLink className="w-3.5 h-3.5" /> TX: {req.cryptoTxHash.slice(0, 8)}...
                        </a>
                      ) : req.proofUrl ? (
                        <button onClick={() => setProofModal(req.proofUrl!)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                          <Eye className="w-3.5 h-3.5" /> Lihat Bukti
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Belum upload bukti</span>
                      )}

                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setReviewModal({ id: req.id, action: 'approve' }); setReviewNote('') }}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            Setujui
                          </button>
                          <button onClick={() => { setReviewModal({ id: req.id, action: 'reject' }); setReviewNote('') }}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                            Tolak
                          </button>
                        </div>
                      ) : req.adminNote ? (
                        <span className="text-xs text-gray-400 max-w-[150px] truncate">{req.adminNote}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data?.total ?? 0} permintaan — Halaman {page + 1} dari {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {reviewModal.action === 'approve' ? 'Setujui Pembayaran' : 'Tolak Pembayaran'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {reviewModal.action === 'approve'
                ? 'Plan tenant akan langsung diaktifkan setelah disetujui.'
                : 'Berikan alasan penolakan agar tenant bisa memahami.'}
            </p>

            <textarea
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder={reviewModal.action === 'approve' ? 'Catatan (opsional)' : 'Alasan penolakan (wajib)'}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
            />

            {(approveMutation.error || rejectMutation.error) && (
              <p className="text-xs text-red-500 mb-3">
                {approveMutation.error?.message || rejectMutation.error?.message}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Batal
              </button>
              <button onClick={handleReviewSubmit}
                disabled={
                  (reviewModal.action === 'reject' && !reviewNote.trim()) ||
                  approveMutation.isPending || rejectMutation.isPending
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  reviewModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}>
                {approveMutation.isPending || rejectMutation.isPending
                  ? 'Memproses...'
                  : reviewModal.action === 'approve' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Image Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setProofModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-w-lg w-full">
            <img src={proofModal} alt="Bukti Pembayaran" className="w-full rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700" />
            <button onClick={() => setProofModal(null)}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<p className="text-center py-16 text-gray-400 text-sm">Memuat...</p>}>
      <PaymentsContent />
    </Suspense>
  )
}
