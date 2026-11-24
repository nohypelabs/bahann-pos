export type PlanId = 'free' | 'warung' | 'starter' | 'professional' | 'business' | 'enterprise' | 'custom'

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
  // Contract clients. Their terms live in a signed contract, not in these limits,
  // and the plan never lapses on its own (see migration 053).
  custom:       { maxOutlets: UNLIMITED, maxCashiers: UNLIMITED, canExport: true, canInstallPWA: true },
}

/**
 * Sales a plan may record per outlet per month. One table for every caller: a copy
 * that misses a plan silently caps it at 100 (unknown plans fall back to free).
 */
export const MONTHLY_TRANSACTION_LIMITS: Record<PlanId, number> = {
  free: 100,
  warung: Infinity,
  starter: Infinity,
  professional: Infinity,
  business: Infinity,
  enterprise: Infinity,
  custom: Infinity,
}

/** The plan for contract clients: not sold on the website, granted by a super admin. */
export const CONTRACT_PLAN: PlanId = 'custom'

export function getLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free
}

export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED
}

/** Must match public.plan_grace_period() in the database. */
export const PLAN_GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export interface PlanStatus {
  /** The plan the account may use right now (falls back to free after grace). */
  plan: string
  /** The plan on record, which may have lapsed. */
  storedPlan: string
  isTrial: boolean
  /** End of the trial or paid period, before grace. */
  periodEndsAt: string | null
  /** Access ends here: period end plus the grace period. */
  accessEndsAt: string | null
  /** The period has ended but grace still allows access. */
  inGrace: boolean
  /** Whole days left in the period (negative once it has ended). */
  daysLeft: number | null
}

export function buildPlanStatus(input: {
  storedPlan: string
  effectivePlan: string
  isTrial: boolean
  periodEndsAt: string | null
  now?: Date
}): PlanStatus {
  const now = (input.now ?? new Date()).getTime()
  const end = input.periodEndsAt ? new Date(input.periodEndsAt).getTime() : null
  const paid = input.storedPlan !== 'free'

  return {
    plan: input.effectivePlan,
    storedPlan: input.storedPlan,
    isTrial: input.isTrial,
    periodEndsAt: input.periodEndsAt,
    accessEndsAt: end === null ? null : new Date(end + PLAN_GRACE_DAYS * DAY_MS).toISOString(),
    inGrace: paid && end !== null && now > end && input.effectivePlan !== 'free',
    daysLeft: end === null ? null : Math.ceil((end - now) / DAY_MS),
  }
}
