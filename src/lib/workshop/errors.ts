import { DOMAIN_ERROR_MESSAGES_EN, DOMAIN_ERROR_MESSAGES_ID, type DomainErrorCode } from '@/domain/errors/DomainException'

const MODULE_DISABLED = {
  id: 'Modul bengkel belum diaktifkan. Aktifkan di Pengaturan → Usaha.',
  en: 'The workshop module is off. Switch it on in Settings → Business.',
}

/**
 * The workshop API returns a domain error code as the message (see
 * src/server/routers/workshop.ts); this turns it into text for the user.
 */
export function workshopErrorMessage(err: unknown, language: string): string {
  const message = err instanceof Error ? err.message : String(err ?? '')
  const lang = language === 'en' ? 'en' : 'id'
  if (message === 'WORKSHOP_MODULE_DISABLED') return MODULE_DISABLED[lang]
  const table = lang === 'en' ? DOMAIN_ERROR_MESSAGES_EN : DOMAIN_ERROR_MESSAGES_ID
  return table[message as DomainErrorCode] ?? message
}
