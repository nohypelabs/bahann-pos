// Pure workshop rules: input normalisation, stamp-card settings, voucher discounts.
import { DomainException, DomainErrorCode } from '../errors/DomainException'
import type { StampProgramConfig, VoucherReward } from '../entities/Workshop'

/** "b 1234 xyz" → "B1234XYZ". Throws when nothing plate-like remains. */
export function normalizePlate(input: string): string {
  const plate = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{2,12}$/.test(plate)) {
    throw new DomainException(DomainErrorCode.INVALID_PLATE, 'Invalid plate number')
  }
  return plate
}

/** "+62 812-3456-7890" → "081234567890". Empty input gives null. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input || !input.trim()) return null
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('62')) digits = '0' + digits.slice(2)
  if (!/^[0-9]{8,15}$/.test(digits)) {
    throw new DomainException(DomainErrorCode.INVALID_PHONE, 'Invalid phone number')
  }
  return digits
}

export const DEFAULT_STAMP_CONFIG: StampProgramConfig = {
  requiredStamps: 10,
  minSpend: 0,
  reward: { type: 'free_service', maxValue: null },
  voucherValidDays: 90,
}

const nonNegative = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null

/**
 * Reads a stored stamp config, filling defaults for anything missing or invalid,
 * so a half-saved config can never break checkout.
 */
export function readStampConfig(raw: unknown): StampProgramConfig {
  const c = (raw ?? {}) as Record<string, unknown>
  const r = (c.reward ?? {}) as Record<string, unknown>
  let reward: VoucherReward = DEFAULT_STAMP_CONFIG.reward
  if (r.type === 'fixed' && nonNegative(r.amount) !== null) {
    reward = { type: 'fixed', amount: r.amount as number }
  } else if (r.type === 'percent' && typeof r.percent === 'number' && r.percent > 0 && r.percent <= 100) {
    reward = { type: 'percent', percent: r.percent, maxValue: nonNegative(r.maxValue) }
  } else if (r.type === 'free_service') {
    reward = { type: 'free_service', maxValue: nonNegative(r.maxValue) }
  }

  const required = typeof c.requiredStamps === 'number' && Number.isInteger(c.requiredStamps) ? c.requiredStamps : 0
  const validDays = typeof c.voucherValidDays === 'number' && Number.isInteger(c.voucherValidDays) ? c.voucherValidDays : 0
  return {
    requiredStamps: required >= 1 && required <= 100 ? required : DEFAULT_STAMP_CONFIG.requiredStamps,
    minSpend: nonNegative(c.minSpend) ?? 0,
    reward,
    voucherValidDays: c.voucherValidDays === null ? null : validDays >= 1 ? validDays : DEFAULT_STAMP_CONFIG.voucherValidDays,
  }
}

/** Validates a config an admin is saving; unlike readStampConfig it refuses bad input. */
export function validateStampConfig(config: StampProgramConfig): StampProgramConfig {
  const fail = (message: string) => {
    throw new DomainException(DomainErrorCode.INVALID_LOYALTY_CONFIG, message)
  }
  if (!Number.isInteger(config.requiredStamps) || config.requiredStamps < 1 || config.requiredStamps > 100) {
    fail('Required stamps must be 1–100')
  }
  if (config.minSpend < 0) fail('Minimum spend cannot be negative')
  if (config.voucherValidDays !== null && (!Number.isInteger(config.voucherValidDays) || config.voucherValidDays < 1)) {
    fail('Voucher validity must be at least 1 day')
  }
  const r = config.reward
  if (r.type === 'fixed' && r.amount <= 0) fail('Voucher amount must be above 0')
  if (r.type === 'percent' && (r.percent <= 0 || r.percent > 100)) fail('Voucher percent must be 1–100')
  if ((r.type === 'free_service' || r.type === 'percent') && r.maxValue !== null && r.maxValue <= 0) {
    fail('Voucher cap must be above 0')
  }
  return config
}

export interface PricedLine {
  itemType: string
  unitPrice: number
  quantity: number
}

/**
 * Rupiah a voucher takes off a sale, never more than the sale's subtotal.
 * free_service: one unit of the dearest labour (SERVICE) line, up to maxValue;
 * parts are still paid. Throws when a free-service voucher meets a sale with no labour.
 */
export function voucherDiscount(reward: VoucherReward, lines: PricedLine[]): number {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  let discount: number
  switch (reward.type) {
    case 'free_service': {
      const labour = lines.filter((l) => l.itemType === 'SERVICE' && l.quantity > 0)
      if (labour.length === 0) {
        throw new DomainException(DomainErrorCode.VOUCHER_NEEDS_SERVICE, 'A free-service voucher needs at least one labour line')
      }
      const dearest = Math.max(...labour.map((l) => l.unitPrice))
      discount = reward.maxValue === null ? dearest : Math.min(dearest, reward.maxValue)
      break
    }
    case 'fixed':
      discount = reward.amount
      break
    case 'percent': {
      const raw = Math.floor((subtotal * reward.percent) / 100)
      discount = reward.maxValue === null ? raw : Math.min(raw, reward.maxValue)
      break
    }
  }
  return Math.max(0, Math.min(Math.floor(discount), subtotal))
}
