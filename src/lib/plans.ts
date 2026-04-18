export type PlanId = 'free' | 'warung' | 'starter' | 'professional' | 'business' | 'enterprise'

export interface PlanLimits {
  maxOutlets: number
  maxProducts: number
  maxCashiers: number
  canExport: boolean
  canInstallPWA: boolean
}

const UNLIMITED = 999_999

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:         { maxOutlets: 1,  maxProducts: 50,   maxCashiers: 1,  canExport: false, canInstallPWA: false },
  warung:       { maxOutlets: 2,  maxProducts: 200,  maxCashiers: 3,  canExport: true,  canInstallPWA: true  },
  starter:      { maxOutlets: 5,  maxProducts: 1000, maxCashiers: 10, canExport: true,  canInstallPWA: true  },
  professional: { maxOutlets: 15, maxProducts: 5000, maxCashiers: 30, canExport: true,  canInstallPWA: true  },
  business:     { maxOutlets: 50, maxProducts: UNLIMITED, maxCashiers: 100, canExport: true, canInstallPWA: true },
  enterprise:   { maxOutlets: UNLIMITED, maxProducts: UNLIMITED, maxCashiers: UNLIMITED, canExport: true, canInstallPWA: true },
}

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free
}

export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED
}
