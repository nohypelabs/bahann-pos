'use client'

import { SectionCard } from '@/components/ui/SectionCard'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  outletId?: string
  /** Last N days; 0 for all time. */
  days: number
}

/** Discounts cashiers gave by hand, for the owner: totals per cashier and reason, then each one. */
export function ManualDiscountReport({ outletId, days }: Props) {
  const { t } = useLanguage()
  const { data, isLoading, error } = trpc.transactions.manualDiscounts.useQuery({ outletId, days }, { retry: false })

  // Shown only to people allowed to see outlet reports.
  if (error?.data?.code === 'FORBIDDEN') return null

  const reasonText = (r: string) => t(`discount.reason.${r}`)

  return (
    <SectionCard title={t('reports.discounts.title')}>
      <p className="mb-4 text-sm text-gray-500">{t('reports.discounts.subtitle')}</p>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-400">{t('common.loading')}</p>
      ) : !data || data.rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{t('reports.discounts.empty')}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs font-semibold text-amber-700">{t('reports.discounts.total')}</p>
              <p className="text-xl font-bold text-amber-900 dark:text-amber-200">{formatCurrency(data.total.amount)}</p>
              <p className="text-xs text-amber-700">
                {t('reports.discounts.totalSub').replace('{count}', String(data.total.count)).replace('{sales}', String(data.total.sales))}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <p className="mb-2 text-xs font-semibold text-gray-500">{t('reports.discounts.byCashier')}</p>
              <ul className="space-y-1 text-sm">
                {data.byCashier.map((c) => (
                  <li key={c.cashier} className="flex justify-between gap-2">
                    <span className="truncate">{c.cashier} <span className="text-gray-400">({c.count}×)</span></span>
                    <span className="font-semibold">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <p className="mb-2 text-xs font-semibold text-gray-500">{t('reports.discounts.byReason')}</p>
              <ul className="space-y-1 text-sm">
                {data.byReason.map((r) => (
                  <li key={r.reason} className="flex justify-between gap-2">
                    <span className="truncate">{reasonText(r.reason)} <span className="text-gray-400">({r.count}×)</span></span>
                    <span className="font-semibold">{formatCurrency(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-700">
                  <th className="px-2 py-2">{t('reports.discounts.col.when')}</th>
                  <th className="px-2 py-2">{t('reports.discounts.col.cashier')}</th>
                  <th className="px-2 py-2">{t('reports.discounts.col.what')}</th>
                  <th className="px-2 py-2 text-right">{t('reports.discounts.col.amount')}</th>
                  <th className="px-2 py-2">{t('reports.discounts.col.reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.rows.map((r, i) => (
                  <tr key={`${r.transactionId}-${r.kind}-${r.item ?? ''}-${i}`} className={r.status === 'completed' ? '' : 'text-gray-400 line-through'}>
                    <td className="px-2 py-2 align-top">
                      <span className="block whitespace-nowrap text-xs">{formatDateTime(r.at)}</span>
                      <span className="block font-mono text-[11px] text-gray-400">{r.transactionNumber}</span>
                    </td>
                    <td className="px-2 py-2 align-top">{r.cashier}</td>
                    <td className="px-2 py-2 align-top">
                      {r.kind === 'sale' ? (
                        <span className="font-medium">{t('reports.discounts.wholeSale')}</span>
                      ) : (
                        <>
                          <span className="block font-medium">{r.item} × {r.quantity}</span>
                          <span className="block text-xs text-gray-500">
                            {formatCurrency(r.listPrice ?? 0)} → {formatCurrency(r.unitPrice ?? 0)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right align-top font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="px-2 py-2 align-top">
                      <span className="block">{reasonText(r.reason)}</span>
                      {r.note && <span className="block text-xs text-gray-500">{r.note}</span>}
                      {r.status !== 'completed' && <span className="block text-xs no-underline">{r.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.truncated && <p className="text-xs text-gray-500">{t('reports.discounts.truncated')}</p>}
        </div>
      )}
    </SectionCard>
  )
}
