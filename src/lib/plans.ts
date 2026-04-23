export type PlanId = 'free' | 'warung' | 'starter' | 'professional' | 'business' | 'enterprise'

export interface PlanLimits {
  maxOutlets: number
  maxCashiers: number
  canExport: boolean
  canInstallPWA: boolean
}

const UNLIMITED = 999_999

// Source of truth — aligned with homepage pricing section
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:         { maxOutlets: 1, maxCashiers: 1,        canExport: false, canInstallPWA: true  },
  warung:       { maxOutlets: 1, maxCashiers: 2,        canExport: false, canInstallPWA: true  },
  starter:      { maxOutlets: 1, maxCashiers: 3,        canExport: true,  canInstallPWA: true  },
  professional: { maxOutlets: 3, maxCashiers: 10,       canExport: true,  canInstallPWA: true  },
  business:     { maxOutlets: UNLIMITED, maxCashiers: UNLIMITED, canExport: true, canInstallPWA: true },
  enterprise:   { maxOutlets: UNLIMITED, maxCashiers: UNLIMITED, canExport: true, canInstallPWA: true },
}

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free
}

export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED
}
