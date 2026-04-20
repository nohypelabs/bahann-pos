'use client'

import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'

const ALERT_STYLES: Record<string, string> = {
  out_of_stock: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  low_stock:    'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  default:      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
}

const ALERT_BADGE: Record<string, string> = {
  out_of_stock: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  low_stock:    'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
  default:      'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
}

export default function AlertsPage() {
  const { showToast } = useToast()
  const { data: alerts, refetch } = trpc.stockAlerts.getActive.useQuery({})
  const { data: summary } = trpc.stockAlerts.getSummary.useQuery({})
  const acknowledgeMutation = trpc.stockAlerts.acknowledge.useMutation({ onSuccess: () => refetch() })
  const generateMutation    = trpc.stockAlerts.generate.useMutation({ onSuccess: () => refetch() })

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeMutation.mutateAsync({ alertId })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal acknowledge alert', 'error')
    }
  }

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync()
      showToast(`${result.alertsGenerated} alert baru dibuat`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal generate alerts', 'error')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Stock Alerts"
        subtitle="Monitor stok menipis dan habis"
        action={
          <Button variant="primary" onClick={handleGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? 'Generating…' : '⚡ Generate Alerts'}
          </Button>
        }
      />

      {summary && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <StatCard icon="🔴" label="Habis"         value={summary.outOfStock} color="red" />
          <StatCard icon="🟡" label="Hampir Habis"  value={summary.lowStock}   color="yellow" />
          <StatCard icon="📋" label="Total Alerts"  value={summary.total}      color="blue" />
        </div>
      )}

      <SectionCard title="Alert Aktif">
        {!alerts || alerts.length === 0 ? (
          <EmptyState icon="✅" title="Tidak ada alert aktif" description="Semua stok dalam kondisi aman." />
        ) : (
          <div className="space-y-2 md:space-y-3">
            {alerts.map(alert => {
              const style = ALERT_STYLES[alert.alert_type] ?? ALERT_STYLES.default
              const badge = ALERT_BADGE[alert.alert_type] ?? ALERT_BADGE.default
              return (
                <div key={alert.id} className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${style}`}>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{alert.product?.name}</p>
                    <p className="text-xs opacity-75">{alert.outlet?.name}</p>
                    <p className="text-xs mt-1 opacity-75">
                      Stok: <strong>{alert.current_stock}</strong> · Reorder: {alert.reorder_point}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badge}`}>
                      {alert.alert_type.replace('_', ' ')}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      ✓ Acknowledge
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
