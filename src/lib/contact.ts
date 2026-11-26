/** Laku POS support WhatsApp (the owner's number), international format without "+". */
export const SUPPORT_WHATSAPP_NUMBER = '6281221575053'
/** The same number as people write it. */
export const SUPPORT_WHATSAPP_DISPLAY = '+62 812-2157-5053'

/** wa.me link to support, optionally with a prefilled message. */
export function supportWhatsAppLink(message?: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
