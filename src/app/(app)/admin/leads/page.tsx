'use client'

import { useState } from 'react'
import { Check, Inbox, MessageCircle, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { friendlyError } from '@/lib/errors/friendlyError'

type Status = 'new' | 'contacted' | 'closed'

const TOPIC_LABEL: Record<string, string> = { general: 'Umum', workshop: 'Bengkel', shop: 'Toko', partner: 'Kemitraan' }
const STATUS_TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'new', label: 'Baru' },
  { key: 'contacted', label: 'Sudah dihubungi' },
  { key: 'closed', label: 'Selesai' },
  { key: 'all', label: 'Semua' },
]
const STATUS_BADGE: Record<Status, string> = {
  new: 'bg-amber-50 text-amber-700',
  contacted: 'bg-[#E3F1EE] text-[#0F5F56]',
  closed: 'bg-[#F3F4F4] text-[#5F675F]',
}

/** 0812… or +62 812… → wa.me/62812… */
function waLink(phone: string, name: string): string {
  const digits = phone.replace(/\D/g, '')
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${intl}?text=${encodeURIComponent(`Halo ${name}, terima kasih sudah menghubungi Laku POS lewat website.`)}`
}

export default function LeadsPage() {
  const { showToast } = useToast()
  const [tab, setTab] = useState<Status | 'all'>('new')
  const utils = trpc.useUtils()
  const list = trpc.contact.list.useQuery({ status: tab === 'all' ? undefined : tab })
  const update = trpc.contact.update.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
    onError: (err) => showToast(friendlyError(err), 'error'),
  })
  const counts = list.data?.counts

  return (
    <div className="space-y-5">
      <PageHeader title="Pesan Masuk" subtitle="Pesan dari formulir kontak di halaman depan Laku POS." />

      <div className="flex flex-wrap gap-2" role="tablist">
        {STATUS_TABS.map((s) => {
          const n = s.key === 'all' ? (counts ? counts.new + counts.contacted + counts.closed : undefined) : counts?.[s.key]
          return (
            <button key={s.key} role="tab" aria-selected={tab === s.key} onClick={() => setTab(s.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${tab === s.key ? 'border-[#0F5F56] bg-[#0F5F56] text-white' : 'border-[#E4E6E7] bg-white text-[#5F675F] hover:text-[#17201D]'}`}>
              {s.label}{n !== undefined && <span className="ml-1.5 tabular-nums opacity-80">{n}</span>}
            </button>
          )
        })}
      </div>

      {list.error && <p className="text-sm text-red-600">{friendlyError(list.error)}</p>}
      {list.isLoading && <div className="h-40 animate-pulse rounded-xl bg-white/50" />}
      {list.data && list.data.rows.length === 0 && (
        <EmptyState icon={<Inbox />} title="Belum ada pesan" description="Pesan dari formulir kontak di halaman depan akan muncul di sini." />
      )}

      <div className="space-y-3">
        {list.data?.rows.map((r) => (
          <article key={r.id} className="glass-surface rounded-xl border border-[#E4E6E7] bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-[#17201D]">{r.name}</h2>
                  {r.business_name && <span className="text-sm text-[#5F675F]">· {r.business_name}</span>}
                  <span className="rounded-md bg-[#F3F4F4] px-2 py-0.5 text-xs font-semibold text-[#5F675F]">{TOPIC_LABEL[r.topic] ?? r.topic}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status as Status]}`}>{STATUS_TABS.find((s) => s.key === r.status)?.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#8A9188]">
                  {new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  {r.handled_at && ` · ditangani ${new Date(r.handled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.phone && (
                  <a href={waLink(r.phone, r.name)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6E7] px-3 py-1.5 text-sm font-semibold text-[#0F5F56] hover:bg-[#F8F9F9]">
                    <MessageCircle className="h-4 w-4" /> {r.phone}
                  </a>
                )}
                {r.status !== 'contacted' && r.status !== 'closed' && (
                  <button onClick={() => update.mutate({ id: r.id, status: 'contacted' })} disabled={update.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F5F56] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0C4D46] disabled:opacity-60">
                    <Check className="h-4 w-4" /> Sudah dihubungi
                  </button>
                )}
                {r.status === 'contacted' && (
                  <button onClick={() => update.mutate({ id: r.id, status: 'closed' })} disabled={update.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F5F56] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0C4D46] disabled:opacity-60">
                    <Check className="h-4 w-4" /> Selesai
                  </button>
                )}
                {r.status !== 'new' && (
                  <button onClick={() => update.mutate({ id: r.id, status: 'new' })} disabled={update.isPending} title="Kembalikan ke Baru"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E6E7] px-3 py-1.5 text-sm font-semibold text-[#5F675F] hover:bg-[#F8F9F9] disabled:opacity-60">
                    <RotateCcw className="h-4 w-4" /> Baru
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#2F3A35]">{r.message}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
