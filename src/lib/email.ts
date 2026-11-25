import { randomBytes } from 'crypto'
import nodemailer, { type Transporter } from 'nodemailer'
import { PLAN_LIMITS, isUnlimited } from '@/lib/plans'
import { logger } from '@/lib/logger'

// Any SMTP provider works (Gmail with an App Password, Brevo, ...).
// Created lazily to avoid build-time errors when SMTP env vars are absent.
let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS environment variables must be set')
    }
    const port = Number(process.env.SMTP_PORT || 465)
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || ''

function normalizeAppUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const APP_URL = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')

interface SendMailParams {
  to: string
  subject: string
  html: string
}

/**
 * Send an email via SMTP. Throws when the server rejects the message,
 * so callers' catch blocks see real delivery failures.
 */
async function sendMail({ to, subject, html }: SendMailParams): Promise<{ id: string }> {
  const info = await getTransporter().sendMail({ from: FROM_EMAIL, to, subject, html })
  const rejected = info.rejected ?? []
  if (rejected.length > 0) {
    throw new Error('SMTP server rejected recipient: ' + rejected.join(', '))
  }
  return { id: info.messageId }
}

// ── Layout ───────────────────────────────────────────────────────────────────
// Every email shares one frame in the app's colours. Email clients ignore
// stylesheets, gradients and SVG, so everything is inline styles on tables, and
// the logo is the PNG app icon.

const C = {
  green: '#0f5f56',
  greenDark: '#0b4e48',
  greenTint: '#e5f3ef',
  greenLine: '#b9cbbf',
  page: '#f6f5f0',
  line: '#ddd8cc',
  ink: '#17201d',
  text: '#3d4641',
  muted: '#6f776f',
  amber: '#a66f10',
  amberTint: '#fff8ec',
  amberLine: '#f0d9a8',
  red: '#b42318',
  redTint: '#fef3f2',
  redLine: '#f5c2bd',
}
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"

/** Escapes text that came from a person (names, store names) before it goes into HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface LayoutParams {
  /** Small line under the brand in the header, e.g. "Reset Password". */
  label: string
  /** Inbox preview text, hidden in the body. */
  preheader: string
  heading: string
  /** Body HTML below the heading. */
  content: string
  /** Set false for emails people may reply to. */
  noReply?: boolean
}

function layout({ label, preheader, heading, content, noReply = true }: LayoutParams): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>${label} · Laku POS</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${C.line};border-radius:28px;overflow:hidden;">
          <tr>
            <td style="background-color:${C.green};padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${APP_URL}/icon-96x96.png" width="44" height="44" alt="Laku POS" style="display:block;width:44px;height:44px;border-radius:14px;background-color:#ffffff;">
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Laku POS</p>
                    <p style="margin:2px 0 0 0;color:#cfe5df;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${label}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;color:${C.ink};font-size:22px;line-height:1.3;font-weight:700;">${heading}</h1>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:${C.page};border-top:1px solid ${C.line};padding:20px 32px;text-align:center;">
              <p style="margin:0;color:${C.muted};font-size:12px;line-height:1.6;">
                ${noReply ? 'Email otomatis dari Laku POS, mohon tidak dibalas.<br>' : ''}© ${new Date().getFullYear()} Laku POS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const p = (html: string, extra = '') =>
  `<p style="margin:0 0 16px 0;color:${C.text};font-size:15px;line-height:1.65;${extra}">${html}</p>`

/** A button that survives Outlook: the colour sits on the cell, not only the link. */
function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${C.green};border-radius:999px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function linkFallback(url: string): string {
  return `<div style="margin:0 0 20px 0;padding:14px 16px;background-color:${C.page};border:1px solid ${C.line};border-radius:16px;word-break:break-all;">
    <p style="margin:0 0 4px 0;color:${C.muted};font-size:12px;">Tombol tidak bisa diklik? Salin link ini ke browser:</p>
    <a href="${url}" style="color:${C.green};font-size:13px;text-decoration:none;">${url}</a>
  </div>`
}

type Tone = 'green' | 'amber' | 'red'
const TONES: Record<Tone, { bg: string; line: string; ink: string }> = {
  green: { bg: C.greenTint, line: C.greenLine, ink: C.greenDark },
  amber: { bg: C.amberTint, line: C.amberLine, ink: C.amber },
  red: { bg: C.redTint, line: C.redLine, ink: C.red },
}

/** A tinted box with an optional title and either text or a list. */
function box(tone: Tone, title: string | null, body: string | string[]): string {
  const t = TONES[tone]
  const inner = Array.isArray(body)
    ? `<ul style="margin:0;padding-left:18px;color:${t.ink};font-size:14px;line-height:1.7;">${body.map((li) => `<li>${li}</li>`).join('')}</ul>`
    : `<p style="margin:0;color:${t.ink};font-size:14px;line-height:1.6;">${body}</p>`
  return `<div style="margin:0 0 20px 0;padding:16px 18px;background-color:${t.bg};border:1px solid ${t.line};border-radius:18px;">
    ${title ? `<p style="margin:0 0 8px 0;color:${t.ink};font-size:14px;font-weight:700;">${title}</p>` : ''}
    ${inner}
  </div>`
}

/** Label/value rows, e.g. plan limits or a sign-up's details. */
function rows(items: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border:1px solid ${C.line};border-radius:18px;border-collapse:separate;overflow:hidden;">
    ${items.map(([k, v], i) => `<tr>
      <td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.muted};font-size:14px;">${k}</td>
      <td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.ink};font-size:14px;font-weight:700;text-align:right;">${v}</td>
    </tr>`).join('')}
  </table>`
}

// ── Emails ───────────────────────────────────────────────────────────────────

export interface SendPasswordResetEmailParams {
  to: string
  name: string
  resetToken: string
}

/**
 * Password reset link; also the invite a new staff member gets to set a password.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetToken,
}: SendPasswordResetEmailParams) {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`

  try {
    const { id } = await sendMail({
      to,
      subject: 'Atur password akun Laku POS kamu',
      html: layout({
        label: 'Reset Password',
        preheader: `Link untuk membuat password baru akun ${esc(to)}, berlaku 1 jam.`,
        heading: 'Buat password baru',
        content: [
          p(`Halo <strong>${esc(name)}</strong>,`),
          p(`Ada permintaan untuk membuat password baru bagi akun Laku POS ini:`),
          box('green', null, `<strong style="font-size:15px;color:${C.ink};">${esc(to)}</strong>`),
          p('Klik tombol di bawah untuk membuat password baru.', 'margin-bottom:0;'),
          button(resetLink, 'Buat password baru'),
          linkFallback(resetLink),
          box('amber', 'Penting', [
            'Link hanya berlaku <strong>1 jam</strong> dan hanya bisa dipakai sekali.',
            'Tidak merasa meminta? Abaikan email ini, password lama tetap berlaku.',
            'Jangan bagikan link ini ke siapa pun.',
          ]),
        ].join(''),
      }),
    })

    logger.success('Password reset email sent: to=' + to + ', id=' + id)
    return { success: true, id }
  } catch (error) {
    logger.error('Error sending password reset email:', error)
    throw error
  }
}

export interface SendNewUserNotificationParams {
  adminEmail: string
  newUserName: string
  newUserEmail: string
  newUserWhatsapp: string
}

export async function sendNewUserNotification({
  adminEmail,
  newUserName,
  newUserEmail,
  newUserWhatsapp,
}: SendNewUserNotificationParams) {
  const waLink = `https://wa.me/${newUserWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${newUserName}, akun Laku POS Anda sudah aktif! Silakan login dan mulai gunakan aplikasinya.`)}`
  const usersUrl = `${APP_URL}/settings/users`

  try {
    await sendMail({
      to: adminEmail,
      subject: `Pendaftar baru: ${newUserName}`,
      html: layout({
        label: 'Pendaftar Baru',
        preheader: `${esc(newUserName)} baru mendaftar ke Laku POS.`,
        heading: 'Ada pendaftar baru',
        content: [
          p('Pengguna berikut baru saja mendaftar ke Laku POS:'),
          rows([
            ['Nama', esc(newUserName)],
            ['Email', esc(newUserEmail)],
            ['WhatsApp', esc(newUserWhatsapp)],
          ]),
          box('green', 'Yang perlu dilakukan', [
            'Hubungi lewat WhatsApp untuk verifikasi.',
            'Ubah perannya ke <strong>admin</strong> di panel pengguna.',
          ]),
          button(waLink, 'Chat lewat WhatsApp'),
          p(`Atau <a href="${usersUrl}" style="color:${C.green};font-weight:700;">buka panel pengguna</a>.`, 'margin-bottom:0;'),
        ].join(''),
      }),
    })
  } catch (err) {
    logger.error('Failed to send new user notification:', err)
    // Non-fatal — registration still succeeds
  }
}

export interface SendWelcomeEmailParams {
  to: string
  name: string
  storeName: string
}

/**
 * Welcome email sent to new user after registration
 */
export async function sendWelcomeEmail({ to, name, storeName }: SendWelcomeEmailParams) {
  const dashboardUrl = `${APP_URL}/dashboard`
  const step = (n: number, text: string) => `<tr>
    <td style="padding:6px 0;vertical-align:middle;width:36px;">
      <div style="width:26px;height:26px;border-radius:999px;background-color:${C.green};color:#ffffff;font-size:13px;font-weight:700;line-height:26px;text-align:center;">${n}</div>
    </td>
    <td style="padding:6px 0;vertical-align:middle;color:${C.greenDark};font-size:14px;">${text}</td>
  </tr>`

  try {
    await sendMail({
      to,
      subject: `Selamat datang di Laku POS, ${name}!`,
      html: layout({
        label: 'Selamat Datang',
        preheader: `Toko ${esc(storeName)} sudah terdaftar dan siap dipakai.`,
        heading: `Halo, ${esc(name)}!`,
        noReply: false,
        content: [
          p(`Selamat datang di <strong>Laku POS</strong>. Toko <strong>${esc(storeName)}</strong> sudah terdaftar dan siap dipakai.`),
          `<div style="margin:0 0 4px 0;padding:16px 18px;background-color:${C.greenTint};border:1px solid ${C.greenLine};border-radius:18px;">
            <p style="margin:0 0 8px 0;color:${C.greenDark};font-size:14px;font-weight:700;">Mulai dalam 3 langkah</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              ${step(1, 'Masuk ke dashboard')}
              ${step(2, 'Tambahkan produk yang dijual')}
              ${step(3, 'Mulai catat penjualan harian')}
            </table>
          </div>`,
          button(dashboardUrl, 'Buka dashboard'),
          box('amber', 'Kamu mulai dengan plan Free',
            `1 outlet, 50 produk, dan 1 kasir. Upgrade kapan saja untuk fitur lebih lengkap. <a href="${APP_URL}/settings/subscriptions" style="color:${C.amber};font-weight:700;">Lihat pilihan plan</a>`),
          p('Butuh bantuan? Hubungi kami lewat WhatsApp atau balas email ini.', `color:${C.muted};font-size:14px;margin-bottom:0;`),
        ].join(''),
      }),
    })
    logger.success('Welcome email sent to: ' + to)
  } catch (err) {
    logger.error('Failed to send welcome email:', err)
    // Non-fatal — registration still succeeds
  }
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  warung: 'Warung',
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
  enterprise: 'Enterprise',
  custom: 'Kontrak',
}

function formatLimit(n: number): string {
  return isUnlimited(n) ? 'Tak terbatas' : n.toString()
}

function getPlanDisplay(planId: string) {
  const limits = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
  return {
    outlets: formatLimit(limits.maxOutlets),
    cashiers: formatLimit(limits.maxCashiers),
    canExport: limits.canExport,
  }
}

export interface SendPlanUpgradeEmailParams {
  to: string
  name: string
  oldPlan: string
  newPlan: string
}

/**
 * Confirmation email sent to user when their subscription plan is changed
 */
export async function sendPlanUpgradeEmail({ to, name, oldPlan, newPlan }: SendPlanUpgradeEmailParams) {
  const planOrder = ['free', 'warung', 'starter', 'professional', 'business', 'enterprise']
  const isUpgrade = planOrder.indexOf(oldPlan) < planOrder.indexOf(newPlan)
  const limits = getPlanDisplay(newPlan)
  const newLabel = PLAN_LABEL[newPlan] || newPlan
  const oldLabel = PLAN_LABEL[oldPlan] || oldPlan
  const action = isUpgrade ? 'diupgrade' : 'diubah'

  try {
    await sendMail({
      to,
      subject: `Plan Laku POS kamu ${action} ke ${newLabel}`,
      html: layout({
        label: 'Perubahan Plan',
        preheader: `Plan kamu ${action} dari ${oldLabel} ke ${newLabel}.`,
        heading: `Halo, ${esc(name)}!`,
        noReply: false,
        content: [
          p(`Plan Laku POS kamu berhasil ${action} dari <strong>${oldLabel}</strong> ke <strong>${newLabel}</strong>.${isUpgrade ? ' Selamat menikmati fitur barunya!' : ''}`),
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
            <tr>
              <td align="center" style="padding:18px;background-color:${C.greenTint};border:1px solid ${C.greenLine};border-radius:18px;">
                <span style="color:${C.muted};font-size:15px;">${oldLabel}</span>
                <span style="color:${C.green};font-size:18px;padding:0 12px;">&rarr;</span>
                <span style="color:${C.greenDark};font-size:20px;font-weight:700;">${newLabel}</span>
              </td>
            </tr>
          </table>`,
          `<p style="margin:0 0 8px 0;color:${C.ink};font-size:14px;font-weight:700;">Yang kamu dapat di plan ${newLabel}</p>`,
          rows([
            ['Jumlah outlet', limits.outlets],
            ['Jumlah kasir', limits.cashiers],
            ['Export laporan', limits.canExport ? 'Tersedia' : 'Tidak tersedia'],
          ]),
          button(`${APP_URL}/dashboard`, 'Buka dashboard'),
          p('Ada pertanyaan tentang perubahan ini? Hubungi kami lewat WhatsApp atau balas email ini.', `color:${C.muted};font-size:14px;margin-bottom:0;`),
        ].join(''),
      }),
    })
    logger.success('Plan upgrade email sent to: ' + to)
  } catch (err) {
    logger.error('Failed to send plan upgrade email:', err)
    // Non-fatal
  }
}

export interface SendTrialExpiredEmailParams {
  /** The plan that lapsed; defaults to the Starter trial. */
  plan?: string
  /** false for a lapsed paid subscription. */
  isTrial?: boolean
  to: string
  name: string
}

/**
 * Sent when a user's 14-day trial expires and plan is downgraded to Free
 */
export async function sendTrialExpiredEmail({ to, name, plan = 'starter', isTrial = true }: SendTrialExpiredEmailParams) {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1)
  const what = isTrial ? `Trial 14 hari plan <strong>${planName}</strong>` : `Langganan plan <strong>${planName}</strong>`
  try {
    await sendMail({
      to,
      subject: isTrial ? 'Trial Laku POS kamu sudah berakhir' : 'Langganan Laku POS kamu sudah berakhir',
      html: layout({
        label: isTrial ? 'Trial Berakhir' : 'Langganan Berakhir',
        preheader: 'Akunmu kembali ke plan Free. Data tetap aman.',
        heading: `Halo, ${esc(name)}`,
        noReply: false,
        content: [
          p(`${what} kamu sudah berakhir. Akunmu sekarang kembali ke plan <strong>Free</strong>.`),
          box('red', 'Batas di plan Free', [
            'Maksimal 1 outlet',
            'Maksimal 50 produk',
            'Maksimal 1 kasir',
            'Export laporan tidak tersedia',
          ]),
          box('green', null, 'Data dan riwayat transaksimu <strong>aman dan tidak terhapus</strong>. Upgrade kapan saja untuk memakai semua fitur lagi.'),
          button(`${APP_URL}/settings/subscriptions`, 'Upgrade sekarang'),
          p('Ada pertanyaan? Hubungi kami lewat WhatsApp atau balas email ini.', `color:${C.muted};font-size:14px;margin-bottom:0;`),
        ].join(''),
      }),
    })
    logger.success('Trial expired email sent to: ' + to)
  } catch (err) {
    logger.error('Failed to send trial expired email:', err)
  }
}

export interface SendVerificationEmailParams {
  to: string
  name: string
  token: string
}

export async function sendVerificationEmail({ to, name, token }: SendVerificationEmailParams) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`

  try {
    await sendMail({
      to,
      subject: 'Verifikasi email kamu - Laku POS',
      html: layout({
        label: 'Verifikasi Email',
        preheader: 'Satu langkah lagi untuk mengaktifkan akun Laku POS kamu.',
        heading: `Halo, ${esc(name)}!`,
        content: [
          p('Satu langkah lagi. Verifikasi emailmu untuk mengaktifkan <strong>trial 14 hari plan Starter gratis</strong>.'),
          box('green', 'Setelah verifikasi', '14 hari gratis plan Starter (senilai Rp 299.000).'),
          button(verifyUrl, 'Verifikasi email saya'),
          linkFallback(verifyUrl),
          box('amber', null, 'Link berlaku <strong>24 jam</strong>. Tidak merasa mendaftar? Abaikan email ini.'),
        ].join(''),
      }),
    })
    logger.success('Verification email sent to: ' + to)
  } catch (err) {
    logger.error('Failed to send verification email:', err)
    // Rethrow so "resend" can tell the user; registration runs it in allSettled.
    throw err
  }
}

/**
 * Generate secure random token for password reset
 */
export function generateResetToken(): string {
  // Use CSPRNG — Math.random() is predictable
  return randomBytes(32).toString('hex')
}
