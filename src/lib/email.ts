import { Resend } from 'resend'

// Initialize Resend lazily to avoid build-time errors
let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export interface SendPasswordResetEmailParams {
  to: string
  name: string
  resetToken: string
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetToken,
}: SendPasswordResetEmailParams) {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset Password - Laku POS',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">Laku POS</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Point of Sale System</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px;">Reset Password Anda</h2>

              <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Halo <strong>${name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Kami menerima permintaan untuk reset password akun Anda. Klik tombol di bawah untuk membuat password baru:
              </p>

              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                      🔐 Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; color: #718096; font-size: 14px; line-height: 1.6;">
                Atau copy dan paste link berikut ke browser Anda:
              </p>

              <div style="background-color: #f7fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; word-break: break-all;">
                <a href="${resetLink}" style="color: #667eea; text-decoration: none; font-size: 14px;">
                  ${resetLink}
                </a>
              </div>

              <!-- Warning Box -->
              <div style="background-color: #fef5e7; border-left: 4px solid #f39c12; padding: 16px; margin: 30px 0; border-radius: 8px;">
                <p style="margin: 0; color: #d68910; font-size: 14px; font-weight: 600;">⚠️ Penting:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #d68910; font-size: 14px;">
                  <li>Link ini hanya berlaku selama <strong>1 jam</strong></li>
                  <li>Jika Anda tidak merasa meminta reset password, abaikan email ini</li>
                  <li>Jangan bagikan link ini ke siapapun</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                Jika Anda memiliki pertanyaan, hubungi administrator sistem.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 2px solid #e2e8f0;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Laku POS. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #a0aec0; font-size: 12px;">
                Email otomatis - mohon tidak membalas email ini
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })

    if (error) {
      console.error('❌ Failed to send password reset email:', error)
      throw new Error('Failed to send email')
    }

    console.log('✅ Password reset email sent:', { to, id: data?.id })
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
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
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `🆕 Pendaftar Baru: ${newUserName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="color:#2563eb">Ada Pendaftar Baru!</h2>
          <p>Pengguna berikut baru saja mendaftar ke Laku POS:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;font-weight:bold;color:#374151">Nama</td><td style="padding:8px">${newUserName}</td></tr>
            <tr style="background:#f9fafb"><td style="padding:8px;font-weight:bold;color:#374151">Email</td><td style="padding:8px">${newUserEmail}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#374151">WhatsApp</td><td style="padding:8px">${newUserWhatsapp}</td></tr>
          </table>
          <p>Aksi yang perlu dilakukan:</p>
          <ol style="color:#374151">
            <li>Hubungi user via WhatsApp untuk verifikasi</li>
            <li>Ubah role mereka ke <strong>admin</strong> di panel users</li>
          </ol>
          <div style="margin-top:24px;display:flex;gap:12px">
            <a href="${waLink}" style="background:#25d366;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-right:12px">
              💬 Chat via WhatsApp
            </a>
            <a href="${usersUrl}" style="background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
              👥 Buka Panel Users
            </a>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send new user notification:', err)
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
  const loginUrl = `${APP_URL}/login`
  const dashboardUrl = `${APP_URL}/dashboard`

  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Selamat datang di Laku POS, ${name}! 🎉`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:white;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:40px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:36px;font-weight:bold;letter-spacing:-1px;">Laku POS</h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Point of Sale untuk Warung Indonesia</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px 0;color:#1a202c;font-size:26px;">Halo, ${name}! 👋</h2>
              <p style="margin:0 0 24px 0;color:#4a5568;font-size:16px;line-height:1.6;">
                Selamat datang di <strong>Laku POS</strong>! Toko kamu <strong>"${storeName}"</strong> sudah berhasil terdaftar dan siap digunakan.
              </p>

              <!-- Steps -->
              <div style="background-color:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:24px;margin:0 0 28px 0;">
                <p style="margin:0 0 16px 0;color:#15803d;font-size:15px;font-weight:700;">🚀 Mulai dalam 3 langkah mudah:</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;vertical-align:top;">
                      <span style="display:inline-block;background:#16a34a;color:white;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:12px;">1</span>
                      <span style="color:#166534;font-size:14px;">Login ke dashboard kamu</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;vertical-align:top;">
                      <span style="display:inline-block;background:#16a34a;color:white;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:12px;">2</span>
                      <span style="color:#166534;font-size:14px;">Tambahkan produk yang kamu jual</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;vertical-align:top;">
                      <span style="display:inline-block;background:#16a34a;color:white;width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:12px;">3</span>
                      <span style="color:#166534;font-size:14px;">Mulai catat penjualan harian</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:white;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 4px 6px rgba(22,163,74,0.4);">
                      🏪 Buka Dashboard Saya
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Plan info -->
              <div style="background-color:#fefce8;border:2px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 24px 0;">
                <p style="margin:0 0 8px 0;color:#92400e;font-size:14px;font-weight:700;">📋 Kamu mulai dengan plan <strong>Free</strong></p>
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Plan free mendukung 1 outlet, 50 produk, dan 1 kasir. Upgrade kapan saja untuk mendapatkan lebih banyak fitur.
                </p>
                <a href="${APP_URL}/settings/subscriptions" style="display:inline-block;margin-top:12px;color:#d97706;font-size:13px;font-weight:600;text-decoration:underline;">
                  Lihat pilihan upgrade →
                </a>
              </div>

              <p style="margin:0;color:#718096;font-size:14px;line-height:1.6;">
                Butuh bantuan? Hubungi kami via WhatsApp atau balas email ini.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f7fafc;padding:24px;text-align:center;border-top:2px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">© ${new Date().getFullYear()} Laku POS. All rights reserved.</p>
              <p style="margin:8px 0 0 0;color:#a0aec0;font-size:12px;">Email otomatis — mohon tidak membalas email ini</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })
    console.log('✅ Welcome email sent to:', to)
  } catch (err) {
    console.error('❌ Failed to send welcome email:', err)
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
}

const PLAN_LIMITS_DISPLAY: Record<string, { outlets: string; products: string; cashiers: string }> = {
  free:         { outlets: '1', products: '50', cashiers: '1' },
  warung:       { outlets: '2', products: '200', cashiers: '3' },
  starter:      { outlets: '5', products: '1.000', cashiers: '10' },
  professional: { outlets: '15', products: '5.000', cashiers: '30' },
  business:     { outlets: '50', products: 'Tak terbatas', cashiers: '100' },
  enterprise:   { outlets: 'Tak terbatas', products: 'Tak terbatas', cashiers: 'Tak terbatas' },
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
  const isUpgrade = ['free', 'warung', 'starter', 'professional', 'business'].indexOf(oldPlan) <
                    ['free', 'warung', 'starter', 'professional', 'business', 'enterprise'].indexOf(newPlan)
  const limits = PLAN_LIMITS_DISPLAY[newPlan] || PLAN_LIMITS_DISPLAY.free
  const newLabel = PLAN_LABEL[newPlan] || newPlan
  const oldLabel = PLAN_LABEL[oldPlan] || oldPlan
  const action = isUpgrade ? 'diupgrade' : 'diubah'
  const emoji = isUpgrade ? '🎉' : '📋'

  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${emoji} Plan Laku POS kamu ${action} ke ${newLabel}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:white;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:40px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:36px;font-weight:bold;letter-spacing:-1px;">Laku POS</h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Konfirmasi Perubahan Plan</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px 0;color:#1a202c;font-size:24px;">${emoji} Halo, ${name}!</h2>
              <p style="margin:0 0 24px 0;color:#4a5568;font-size:16px;line-height:1.6;">
                Plan Laku POS kamu berhasil ${action} dari <strong>${oldLabel}</strong> ke <strong>${newLabel}</strong>.
                ${isUpgrade ? 'Selamat menikmati fitur-fitur barumu!' : ''}
              </p>

              <!-- Plan change badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px 40px;text-align:center;">
                      <p style="margin:0;color:#6b7280;font-size:14px;">${oldLabel}</p>
                      <p style="margin:8px 0;color:#16a34a;font-size:28px;">→</p>
                      <p style="margin:0;color:#15803d;font-size:22px;font-weight:700;">${newLabel}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Limits -->
              <div style="background-color:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:24px;margin:0 0 28px 0;">
                <p style="margin:0 0 16px 0;color:#15803d;font-size:15px;font-weight:700;">✅ Yang kamu dapatkan dengan plan ${newLabel}:</p>
                <table width="100%" cellpadding="0" cellspacing="8">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #d1fae5;color:#374151;font-size:14px;">🏪 Jumlah Outlet</td>
                    <td style="padding:8px 0;border-bottom:1px solid #d1fae5;color:#166534;font-size:14px;font-weight:700;text-align:right;">${limits.outlets}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #d1fae5;color:#374151;font-size:14px;">🏷️ Jumlah Produk</td>
                    <td style="padding:8px 0;border-bottom:1px solid #d1fae5;color:#166534;font-size:14px;font-weight:700;text-align:right;">${limits.products}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:14px;">👤 Jumlah Kasir</td>
                    <td style="padding:8px 0;color:#166534;font-size:14px;font-weight:700;text-align:right;">${limits.cashiers}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:white;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 4px 6px rgba(22,163,74,0.4);">
                      🏪 Buka Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#718096;font-size:13px;line-height:1.6;">
                Jika ada pertanyaan tentang perubahan plan ini, hubungi kami via WhatsApp atau balas email ini.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f7fafc;padding:24px;text-align:center;border-top:2px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">© ${new Date().getFullYear()} Laku POS. All rights reserved.</p>
              <p style="margin:8px 0 0 0;color:#a0aec0;font-size:12px;">Email otomatis — mohon tidak membalas email ini</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })
    console.log('✅ Plan upgrade email sent to:', to)
  } catch (err) {
    console.error('❌ Failed to send plan upgrade email:', err)
    // Non-fatal
  }
}

export interface SendTrialExpiredEmailParams {
  to: string
  name: string
}

/**
 * Sent when a user's 14-day trial expires and plan is downgraded to Free
 */
export async function sendTrialExpiredEmail({ to, name }: SendTrialExpiredEmailParams) {
  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '⏰ Trial Laku POS kamu sudah berakhir',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:white;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">

          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:40px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:36px;font-weight:bold;letter-spacing:-1px;">Laku POS</h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Trial Period Berakhir</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px 0;color:#1a202c;font-size:24px;">Halo, ${name} 👋</h2>
              <p style="margin:0 0 24px 0;color:#4a5568;font-size:16px;line-height:1.6;">
                Trial 14 hari plan <strong>Starter</strong> kamu sudah berakhir. Akun kamu sekarang kembali ke plan <strong>Free</strong>.
              </p>

              <div style="background-color:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:24px;margin:0 0 28px 0;">
                <p style="margin:0 0 12px 0;color:#991b1b;font-size:15px;font-weight:700;">⚠️ Yang berubah di plan Free:</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:6px 0;color:#7f1d1d;font-size:14px;">🏪 Maks 1 outlet</td></tr>
                  <tr><td style="padding:6px 0;color:#7f1d1d;font-size:14px;">🏷️ Maks 50 produk</td></tr>
                  <tr><td style="padding:6px 0;color:#7f1d1d;font-size:14px;">👤 Maks 1 kasir</td></tr>
                  <tr><td style="padding:6px 0;color:#7f1d1d;font-size:14px;">🔒 Export laporan tidak tersedia</td></tr>
                </table>
              </div>

              <p style="margin:0 0 24px 0;color:#4a5568;font-size:15px;line-height:1.6;">
                Data dan riwayat transaksimu <strong>aman dan tidak terhapus</strong>. Upgrade kapan saja untuk melanjutkan menggunakan semua fitur.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/settings/subscriptions" style="display:inline-block;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:white;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 4px 6px rgba(22,163,74,0.4);">
                      🚀 Upgrade Sekarang
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#718096;font-size:13px;line-height:1.6;">
                Ada pertanyaan? Hubungi kami via WhatsApp atau balas email ini.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f7fafc;padding:24px;text-align:center;border-top:2px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:12px;">© ${new Date().getFullYear()} Laku POS. All rights reserved.</p>
              <p style="margin:8px 0 0 0;color:#a0aec0;font-size:12px;">Email otomatis — mohon tidak membalas email ini</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })
    console.log('✅ Trial expired email sent to:', to)
  } catch (err) {
    console.error('❌ Failed to send trial expired email:', err)
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
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '✉️ Verifikasi email kamu — Laku POS',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:white;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">

        <tr>
          <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:40px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:36px;font-weight:bold;letter-spacing:-1px;">Laku POS</h1>
            <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Verifikasi Email</p>
          </td>
        </tr>

        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px 0;color:#1a202c;font-size:24px;">Halo, ${name}! 👋</h2>
            <p style="margin:0 0 24px 0;color:#4a5568;font-size:16px;line-height:1.6;">
              Satu langkah lagi! Verifikasi emailmu untuk mengaktifkan <strong>trial 14 hari Starter gratis</strong>.
            </p>

            <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 28px 0;text-align:center;">
              <p style="margin:0 0 8px 0;color:#15803d;font-size:14px;font-weight:600;">🎁 Yang kamu dapatkan setelah verifikasi:</p>
              <p style="margin:0;color:#166534;font-size:14px;">14 hari gratis plan Starter (senilai Rp 299.000)</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
              <tr><td align="center">
                <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:white;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 4px 6px rgba(22,163,74,0.4);">
                  ✉️ Verifikasi Email Saya
                </a>
              </td></tr>
            </table>

            <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 24px 0;word-break:break-all;">
              <p style="margin:0 0 4px 0;color:#718096;font-size:12px;">Atau copy link ini ke browser:</p>
              <a href="${verifyUrl}" style="color:#16a34a;font-size:13px;text-decoration:none;">${verifyUrl}</a>
            </div>

            <div style="background:#fef5e7;border-left:4px solid #f39c12;padding:16px;border-radius:8px;">
              <p style="margin:0;color:#d68910;font-size:13px;">⚠️ Link berlaku <strong>24 jam</strong>. Jika tidak merasa mendaftar, abaikan email ini.</p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background-color:#f7fafc;padding:24px;text-align:center;border-top:2px solid #e2e8f0;">
            <p style="margin:0;color:#a0aec0;font-size:12px;">© ${new Date().getFullYear()} Laku POS. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
    console.log('✅ Verification email sent to:', to)
  } catch (err) {
    console.error('❌ Failed to send verification email:', err)
  }
}

/**
 * Generate secure random token for password reset
 */
export function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const length = 64 // 64 character token

  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return token
}
