import { supabaseAdmin } from '@/infra/supabase/server'
import { PasswordResetToken, PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'
import { hashPasswordResetToken } from '@/lib/security/resetToken'

export class SupabasePasswordResetTokenRepository implements PasswordResetTokenRepository {
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const hashedToken = hashPasswordResetToken(token)
    const { data, error } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, token, expires_at, used_at')
      .in('token', [token, hashedToken])
      .limit(1)

    if (error || !data || data.length === 0) return null

    const matchedToken = data.find((row) => row.token === hashedToken) ?? data[0]

    return {
      id: matchedToken.id,
      userId: matchedToken.user_id,
      token: matchedToken.token,
      expiresAt: new Date(matchedToken.expires_at),
      usedAt: matchedToken.used_at ? new Date(matchedToken.used_at) : null,
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
