'use client'

import { useState, useRef, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Minus, Receipt, TrendingDown, Tag, X, Upload,
  CheckCircle2, XCircle, Info, Camera, Trash2, ChevronDown,
  Zap, Droplets, Users, ShoppingCart, Wrench, Car, Home, FileText,
} from 'lucide-react'

type AlertState = { type: 'success' | 'error' | 'info'; msg: string } | null

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  listrik: <Zap className="w-4 h-4" />,
  air: <Droplets className="w-4 h-4" />,
  gaji: <Users className="w-4 h-4" />,
  belanja_bahan: <ShoppingCart className="w-4 h-4" />,
  perbaikan: <Wrench className="w-4 h-4" />,
  transport: <Car className="w-4 h-4" />,
  sewa: <Home className="w-4 h-4" />,
  lainnya: <FileText className="w-4 h-4" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  listrik: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  air: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  gaji: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  belanja_bahan: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
  perbaikan: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  transport: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
  sewa: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700',
  lainnya: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
}

export default function ExpensesPage() {
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptUrl, setReceiptUrl] = useState('')
  const [showForm, setShowForm] = useState(true)
  const [alert, setAlert] = useState<AlertState>(null)
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [userRole, setUserRole] = useState('user')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()

  // Get user role
  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const u = JSON.parse(user)
        setUserRole(u.role || 'user')
      } catch {}
    }
  }, [])

  const flash = (type: NonNullable<AlertState>['type'], msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 4000)
  }

  // Queries
  const { data: outletsData } = trpc.outlets.getAll.useQuery()
  const { data: categories } = trpc.expenses.getCategories.useQuery()
  const { data: dailySummary, isLoading: summaryLoading } = trpc.expenses.getDailySummary.useQuery(
    { outletId: selectedOutlet || undefined, date: expenseDate },
    { enabled: !!selectedOutlet }
  )

  // Mutations
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      flash('success', 'Pengeluaran berhasil dicatat!')
      setDescription('')
      setAmount('')
      setReceiptUrl('')
      utils.expenses.getDailySummary.invalidate()
      utils.expenses.list.invalidate()
    },
    onError: (err) => flash('error', err.message || 'Gagal mencatat pengeluaran'),
  })

  const voidMutation = trpc.expenses.void.useMutation({
    onSuccess: () => {
      flash('success', 'Pengeluaran berhasil dibatalkan')
      setVoidingId(null)
      setVoidReason('')
      utils.expenses.getDailySummary.invalidate()
      utils.expenses.list.invalidate()
    },
    onError: (err) => flash('error', err.message || 'Gagal membatalkan'),
  })

  const outlets = outletsData?.outlets ?? []
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  const handleSubmit = async () => {
    if (!selectedOutlet) { flash('error', 'Pilih outlet terlebih dahulu'); return }
    if (!category) { flash('error', 'Pilih kategori'); return }
    if (!description.trim()) { flash('error', 'Isi deskripsi'); return }
    if (!amount || parseFloat(amount) <= 0) { flash('error', 'Masukkan nominal yang valid'); return }

    await createMutation.mutateAsync({
      outletId: selectedOutlet,
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      receiptUrl: receiptUrl || undefined,
      expenseDate,
    })
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { flash('error', 'Ukuran file maksimal 5MB'); return }

    const reader = new FileReader()
    reader.onload = () => {
      // For now, just store as data URL. In production, upload to Cloudinary/Supabase Storage
      setReceiptUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const expenses = dailySummary?.expenses || []
  const totalExpenses = dailySummary?.totalExpenses || 0

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <PageHeader
        title="Pengeluaran Operasional"
        subtitle="Catat pengeluaran harian outlet"
        action={
          <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <><Minus className="w-4 h-4 mr-1" /> Tutup</> : <><Plus className="w-4 h-4 mr-1" /> Input Baru</>}
          </Button>
        }
      />

      {/* Alert */}
      {alert && (
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium ${
          alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
          : alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
        }`}>
          <span>{alert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : alert.type === 'error' ? <XCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}</span>
          {alert.msg}
        </div>
      )}

      {/* Outlet selector */}
      <SectionCard title="Pilih Outlet">
        <div className="relative">
          <select
            value={selectedOutlet}
            onChange={e => setSelectedOutlet(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          >
            <option value="">Pilih outlet…</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
        </div>
      </SectionCard>

      {/* Input Form */}
      {selectedOutlet && showForm && (
        <SectionCard title="Input Pengeluaran">
          <div className="space-y-4">
            {/* Category pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
              <div className="grid grid-cols-4 gap-1.5">
                {categories?.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-[10px] font-medium transition-all ${
                      category === cat.value
                        ? `${CATEGORY_COLORS[cat.value]} ring-2 ring-blue-500/30`
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nominal (Rp)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Deskripsi</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Contoh: Bayar listrik bulan Juni"
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500"
              />
            </div>

            {/* Receipt photo (optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Bukti Nota <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              {receiptUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                    <img src={receiptUrl} alt="Bukti" className="w-full h-full object-cover" />
                  </div>
                  <button onClick={() => setReceiptUrl('')} className="text-red-500 hover:text-red-600 text-xs font-medium">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Foto Nota
                </button>
              )}
            </div>

            {/* Submit */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Menyimpan...' : <><Receipt className="w-4 h-4 mr-1.5" /> Catat Pengeluaran</>}
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Daily Summary */}
      {selectedOutlet && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<TrendingDown />}
            label="Total Hari Ini"
            value={formatCurrency(totalExpenses)}
            color="red"
          />
          <StatCard
            icon={<Receipt />}
            label="Jumlah"
            value={`${expenses.length} item`}
            color="gray"
          />
          <StatCard
            icon={<Tag />}
            label="Kategori Terbesar"
            value={dailySummary?.byCategory?.[0]?.category?.replace('_', ' ') || '-'}
            color="yellow"
          />
        </div>
      )}

      {/* Today's Expenses List */}
      {selectedOutlet && (
        <SectionCard title={`Pengeluaran ${expenseDate === new Date().toISOString().split('T')[0] ? 'Hari Ini' : expenseDate}`}>
          {summaryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState icon={<Receipt />} title="Belum ada pengeluaran"
              description="Catat pengeluaran pertama untuk hari ini."
              action={<Button variant="primary" size="sm" onClick={() => setShowForm(true)}>Catat Pengeluaran</Button>} />
          ) : (
            <div className="space-y-2">
              {expenses.map((exp: any) => {
                const catColor = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.lainnya
                const catIcon = CATEGORY_ICONS[exp.category] || CATEGORY_ICONS.lainnya
                const isVoided = exp.is_voided

                return (
                  <div
                    key={exp.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      isVoided
                        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Category icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catColor}`}>
                      {catIcon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${isVoided ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {exp.description}
                        </p>
                        {isVoided && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex-shrink-0">
                            VOID
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {exp.user?.name || '—'} • {exp.category.replace('_', ' ')}
                        {exp.receipt_url && ' • 📎'}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${isVoided ? 'line-through text-gray-400' : 'text-red-600 dark:text-red-400'}`}>
                        -{formatCurrency(Number(exp.amount))}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(exp.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Void button (admin only) */}
                    {isAdmin && !isVoided && (
                      voidingId === exp.id ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input
                            type="text"
                            value={voidReason}
                            onChange={e => setVoidReason(e.target.value)}
                            placeholder="Alasan"
                            className="w-24 px-2 py-1 text-[11px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                          />
                          <button
                            onClick={() => voidMutation.mutate({ expenseId: exp.id, reason: voidReason || undefined })}
                            className="p-1 text-red-500 hover:text-red-600"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setVoidingId(null); setVoidReason('') }} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setVoidingId(exp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                          title="Batalkan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* Category breakdown */}
      {selectedOutlet && dailySummary?.byCategory && dailySummary.byCategory.length > 0 && (
        <SectionCard title="Breakdown per Kategori">
          <div className="space-y-2">
            {dailySummary.byCategory.map((item: any) => {
              const percentage = totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0
              const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.lainnya
              return (
                <div key={item.category} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${catColor}`}>
                    {CATEGORY_ICONS[item.category] || CATEGORY_ICONS.lainnya}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{item.category.replace('_', ' ')}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 w-10 text-right">{percentage.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
