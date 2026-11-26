import idText from '@/locales/id.json'
import enText from '@/locales/en.json'
import { DOMAIN_ERROR_MESSAGES_EN, DOMAIN_ERROR_MESSAGES_ID, type DomainErrorCode } from '@/domain/errors/DomainException'

type Language = 'id' | 'en'
type ErrorKey = 'noPermission' | 'sessionExpired' | 'offline' | 'tooManyRequests' | 'invalidInput' | 'notFound' | 'generic'

const TEXT = { id: idText, en: enText } as const

// Server errors are written in English for developers (guards, Supabase, Zod). These words mark such a message;
// the Indonesian words mark one already written for the user, which is shown as it is.
const ENGLISH = /\b(you|your|the|not|must|is|are|failed|invalid|error|permission|required|cannot|unable|denied|found|only|already|unexpected|violates|duplicate)\b/i
const INDONESIAN = /\b(tidak|gagal|silakan|belum|sudah|anda|kamu|dengan|untuk|yang|akun|harus|masih|coba)\b/i

// English server messages that say something specific, in plain Indonesian.
const SERVER_MESSAGES_ID: Record<string, string> = {
  'Shift is not open': 'Shift kasir sudah tidak aktif. Buka shift baru lalu ulangi.',
  'Shift is not in open status': 'Shift kasir sudah tidak aktif. Buka shift baru lalu ulangi.',
  'Shift not found': 'Shift kasir tidak ditemukan. Buka shift baru lalu ulangi.',
  'Shift does not belong to this outlet': 'Shift ini milik outlet lain. Buka shift di outlet ini.',
  'Shift does not belong to this device': 'Shift ini dibuka di perangkat lain. Buka shift di perangkat ini.',
  'Shift is not pending approval': 'Shift ini tidak sedang menunggu persetujuan.',
  'Only the shift cashier can submit this shift': 'Hanya kasir pemilik shift yang bisa menutup shift ini.',
  'Only the active shift cashier can checkout this sale': 'Hanya kasir yang membuka shift ini yang bisa menerima pembayaran.',
  'Can only request approval for completed transactions': 'Hanya transaksi yang sudah selesai yang bisa dibatalkan atau di-refund.',
  'A pending approval request already exists for this transaction': 'Permintaan untuk transaksi ini sudah dikirim dan masih menunggu persetujuan.',
  'Approval request is not pending': 'Permintaan ini sudah diproses sebelumnya.',
  'Refund amount must be positive and cannot exceed transaction total': 'Jumlah refund harus lebih dari 0 dan tidak boleh melebihi total transaksi.',
  'Refund amount cannot exceed transaction total': 'Jumlah refund tidak boleh melebihi total transaksi.',
  'Payment method is not active': 'Metode pembayaran ini sedang tidak aktif. Pilih metode lain.',
  'Vouchers are redeemed on service notes': 'Voucher dipakai di Nota Servis, bukan di Kasir.',
  'Outlet is already a member of this group': 'Outlet ini sudah ada di grup tersebut.',
  'A device with this code already exists': 'Kode perangkat ini sudah dipakai. Gunakan kode lain.',
  'Business profile not found. Complete the setup first.': 'Profil usaha belum dibuat. Selesaikan pengaturan awal dulu.',
  'A business profile already exists. Use update to change it.': 'Profil usaha sudah ada. Ubah lewat Pengaturan → Usaha.',
  'Not available while impersonating a tenant. Exit impersonation first.': 'Tidak bisa saat sedang masuk sebagai tenant. Keluar dari mode tenant dulu.',
}

const CODE_TO_KEY: Record<string, ErrorKey> = {
  UNAUTHORIZED: 'sessionExpired',
  FORBIDDEN: 'noPermission',
  TOO_MANY_REQUESTS: 'tooManyRequests',
  NOT_FOUND: 'notFound',
  BAD_REQUEST: 'invalidInput',
  PARSE_ERROR: 'invalidInput',
}

function currentLanguage(): Language {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('language') === 'en' ? 'en' : 'id'
  } catch {
    return 'id'
  }
}

function text(key: ErrorKey, language: Language): string {
  return TEXT[language][`errors.${key}` as keyof (typeof TEXT)[Language]] as string
}

function isNetworkFailure(message: string): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)
}

/** Whether a message reads as an English developer message rather than text written for the user. */
export function isDeveloperMessage(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return true
  // Zod issues arrive as a JSON array; machine codes like PLAN_LIMIT_REACHED are upper case.
  if (trimmed.startsWith('[') || trimmed.startsWith('{') || /^[A-Z0-9_]+$/.test(trimmed)) return true
  return ENGLISH.test(trimmed) && !INDONESIAN.test(trimmed)
}

/**
 * Text for the user from any error: tRPC errors by their code, domain error codes by the
 * domain tables, network failures, and English server messages replaced by plain Indonesian.
 * A message the server already wrote for the user (in Indonesian) is kept.
 * `fallback` is what the screen would say about the failed action ("Gagal menyimpan produk…").
 */
export function friendlyError(err: unknown, fallback?: string, language: Language = currentLanguage()): string {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  const code = (err as { data?: { code?: string } } | null)?.data?.code

  if (isNetworkFailure(message)) return text('offline', language)

  const domainTable = language === 'en' ? DOMAIN_ERROR_MESSAGES_EN : DOMAIN_ERROR_MESSAGES_ID
  if (message in domainTable) return domainTable[message as DomainErrorCode]

  if (!isDeveloperMessage(message)) return message
  if (language === 'id' && SERVER_MESSAGES_ID[message.trim()]) return SERVER_MESSAGES_ID[message.trim()]

  const key = code ? CODE_TO_KEY[code] : undefined
  if (key) return text(key, language)
  // English readers get the server's own words when no code explains it better.
  if (language === 'en' && message && !/^[[{]/.test(message.trim()) && !/^[A-Z0-9_]+$/.test(message.trim())) return message
  return fallback && !isDeveloperMessage(fallback) ? fallback : text('generic', language)
}

/** For a toast that only has the message string: replaces English developer messages. */
export function friendlyMessage(message: string, language: Language = currentLanguage()): string {
  if (isNetworkFailure(message)) return text('offline', language)
  if (language === 'en' || !isDeveloperMessage(message)) return message
  if (SERVER_MESSAGES_ID[message.trim()]) return SERVER_MESSAGES_ID[message.trim()]
  if (/permission|forbidden|admin role|not allowed|access denied/i.test(message)) return text('noPermission', language)
  if (/logged in|login required|unauthori[sz]ed|session/i.test(message)) return text('sessionExpired', language)
  if (/too many/i.test(message)) return text('tooManyRequests', language)
  if (/not found/i.test(message)) return text('notFound', language)
  if (message.trim().startsWith('[') || /invalid|required|expected/i.test(message)) return text('invalidInput', language)
  return text('generic', language)
}
