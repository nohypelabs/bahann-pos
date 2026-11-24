'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, IdCard } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { workshopErrorMessage } from '@/lib/workshop/errors'

export default function MembersPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', member: true })

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const customers = trpc.workshop.customers.search.useQuery({ query })
  const create = trpc.workshop.customers.create.useMutation()

  const submit = async () => {
    try {
      const c = await create.mutateAsync({ name: form.name, phone: form.phone || null, enrollAsMember: form.member })
      setNewOpen(false)
      setForm({ name: '', phone: '', member: true })
      router.push(`/members/${c.id}`)
    } catch (err) {
      showToast(workshopErrorMessage(err, language), 'error')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title={t('workshop.members.title')}
        subtitle={t('workshop.members.subtitle')}
        action={<Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4 mr-1" /> {t('workshop.members.new')}</Button>}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('workshop.newNote.searchCustomer')}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      {customers.error && <p className="text-sm text-red-600">{workshopErrorMessage(customers.error, language)}</p>}
      {customers.data?.length === 0 && (
        <EmptyState icon={<IdCard />} title={t('workshop.members.emptyTitle')} description={t('workshop.members.emptyBody')} />
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
        {customers.data?.map((c) => (
          <button key={c.id} onClick={() => router.push(`/members/${c.id}`)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-gray-400">{c.phone ?? '—'}</p>
            </div>
            {c.isMember ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">{c.memberCode}</span>
            ) : (
              <span className="text-xs text-gray-400">{t('workshop.members.notMember')}</span>
            )}
          </button>
        ))}
      </div>

      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title={t('workshop.members.new')} size="sm">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <Input label={t('workshop.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus fullWidth />
          <Input label={t('workshop.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="08…" fullWidth />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.member} onChange={(e) => setForm({ ...form, member: e.target.checked })} />
            {t('workshop.newNote.makeMember')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={!form.name.trim() || create.isPending}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
