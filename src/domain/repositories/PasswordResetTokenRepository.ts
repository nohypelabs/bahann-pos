export interface PasswordResetToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  usedAt: Date | null
}

export interface PasswordResetTokenRepository {
  findByToken(token: string): Promise<PasswordResetToken | null>
  save(token: { userId: string; token: string; expiresAt: Date }): Promise<void>
  markAsUsed(id: string): Promise<void>
}
