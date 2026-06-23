import { supabaseAdmin } from '@/infra/supabase/server'
import { PasswordResetToken, PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'
import { hashPasswordResetToken } from '@/lib/security/resetToken'

export class SupabasePasswordResetTokenRepository implements PasswordResetTokenRepository {
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    // Only accept hashed tokens — plaintext fallback removed for security
    const hashedToken = hashPasswordResetToken(token)
    const { data, error } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, token, expires_at, used_at')
      .eq('token', hashedToken)
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: data.id,
      userId: data.user_id,
      token: data.token,
      expiresAt: new Date(data.expires_at),
      usedAt: data.used_at ? new Date(data.used_at) : null,
    }
  }

  async save(token: { userId: string; token: string; expiresAt: Date }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: token.userId,
        token: token.token,
        expires_at: token.expiresAt.toISOString(),
      })

    if (error) {
      throw new Error(`Failed to save reset token: ${error.message}`)
    }
  }

  async markAsUsed(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to mark token as used: ${error.message}`)
    }
  }
}
