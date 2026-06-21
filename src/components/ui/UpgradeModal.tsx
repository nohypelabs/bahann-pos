'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { getLimits, isUnlimited, type PlanId } from '@/lib/plans'

const PLAN_ORDER: PlanId[] = ['free', 'warung', 'starter', 'professional', 'business', 'enterprise']

const PLAN_DISPLAY: Record<string, { label: string; badge: string }> = {
  free:         { label: 'Gratis',     badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  warung:       { label: 'Warung',     badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  starter:      { label: 'Starter',   badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  professional: { label: 'Pro',       badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  business:     { label: 'Business',  badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  enterprise:   { label: 'Enterprise',badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
}

export type UpgradeFeature = 'outlets' | 'cashiers' | 'export' | 'pwa'

interface Suggestion { planId: string; label: string; benefit: string }

function getUpgradeSuggestion(feature: UpgradeFeature, currentPlan: string): Suggestion | null {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan as PlanId)
  const currentLimits = getLimits(currentPlan)

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i++) {
    const next = getLimits(PLAN_ORDER[i])
    let isBetter = false
    let benefit = ''

    if (feature === 'outlets') {
      isBetter = next.maxOutlets > currentLimits.maxOutlets
      benefit = isUnlimited(next.maxOutlets) ? 'Outlet tidak terbatas' : `Hingga ${next.maxOutlets} outlet`
    } else if (feature === 'cashiers') {
      isBetter = next.maxCashiers > currentLimits.maxCashiers
      benefit = isUnlimited(next.maxCashiers) ? 'Kasir tidak terbatas' : `Hingga ${next.maxCashiers} kasir`
    } else if (feature === 'export') {
      isBetter = next.canExport && !currentLimits.canExport
      benefit = 'Export laporan CSV & PDF'
    } else if (feature === 'pwa') {
      isBetter = next.canInstallPWA && !currentLimits.canInstallPWA
      benefit = 'Install sebagai aplikasi (PWA)'
    }

    if (isBetter) {
      return { planId: PLAN_ORDER[i], label: PLAN_DISPLAY[PLAN_ORDER[i]]?.label ?? PLAN_ORDER[i], benefit }
    }
  }
  return null
}

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: UpgradeFeature
  currentPlan: string
  title?: string
  description?: string
  currentUsage?: { used: number; max: number }
}

export function UpgradeModal({ isOpen, onClose, feature, currentPlan, title, description, currentUsage }: UpgradeModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const limits = getLimits(currentPlan)
  const currentDisplay = PLAN_DISPLAY[currentPlan] ?? PLAN_DISPLAY.free
  const suggestion = getUpgradeSuggestion(feature, currentPlan)
  const suggestDisplay = suggestion ? PLAN_DISPLAY[suggestion.planId] : null

  const defaultTitles: Record<UpgradeFeature, string> = {
    outlets:  'Limit Outlet Tercapai',
    cashiers: 'Limit Kasir Tercapai',
    export:   'Fitur Export Terkunci',
    pwa:      'Fitur PWA Terkunci',
  }

  const defaultDescriptions: Record<UpgradeFeature, string> = {
    outlets:  `Plan ${currentDisplay.label} hanya mendukung ${limits.maxOutlets} outlet. Upgrade untuk membuka lebih banyak lokasi.`,
    cashiers: `Plan ${currentDisplay.label} hanya mendukung ${limits.maxCashiers} kasir. Upgrade untuk menambah anggota tim.`,
    export:   `Fitur export laporan tersedia mulai plan Warung ke atas.`,
    pwa:      `Fitur install PWA tersedia mulai plan Warung ke atas.`,
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-[35px] shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6 space-y-5">
          {/* Icon + title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-3xl">
              🔒
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title ?? defaultTitles[feature]}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description ?? defaultDescriptions[feature]}
            </p>
          </div>

          {/* Current plan badge */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <span className="text-xs text-gray-500 dark:text-gray-400">Plan kamu sekarang</span>
            <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${currentDisplay.badge}`}>
              {currentDisplay.label}
            </span>
          </div>

          {/* Usage indicator */}
          {currentUsage && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Penggunaan</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentUsage.used} / {isUnlimited(currentUsage.max) ? '∞' : currentUsage.max}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-500"
                  style={{ width: isUnlimited(currentUsage.max) ? '0%' : `${Math.min((currentUsage.used / currentUsage.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Upgrade suggestion */}
          {suggestion && suggestDisplay && (
            <div className="p-3.5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upgrade ke</p>
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${suggestDisplay.badge}`}>
                  {suggestDisplay.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">✅ {suggestion.benefit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} fullWidth>Nanti Saja</Button>
            <Button variant="primary" onClick={() => { onClose(); router.push('/settings/subscriptions') }} fullWidth>
              🚀 Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
