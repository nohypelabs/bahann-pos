import bcrypt from 'bcryptjs'
import { UserRepository } from '@/domain/repositories/UserRepository'
import { PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'
import { AppError } from '@/shared/exceptions/AppError'
import { createAuditLog } from '@/lib/audit'
import { revokeAllUserTokens } from '@/lib/refreshToken'
import { logger } from '@/lib/logger'

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export interface ResetPasswordOutput {
  success: boolean
  message: string
}

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const tokenData = await this.tokenRepository.findByToken(input.token)

    if (!tokenData) {
      throw new AppError('Token tidak valid', 400)
    }

    if (tokenData.usedAt) {
      throw new AppError('Token sudah digunakan', 400)
    }

    if (new Date() > tokenData.expiresAt) {
      throw new AppError('Token sudah kadaluarsa. Silakan request reset password lagi.', 400)
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 8)

    await this.userRepository.updatePassword(tokenData.userId, hashedPassword)
    await this.tokenRepository.markAsUsed(tokenData.id)

    // Get user info for audit log
    const user = await this.userRepository.findById(tokenData.userId)

    await createAuditLog({
      userId: tokenData.userId,
      userEmail: user?.email || 'unknown',
      action: 'PASSWORD_RESET_COMPLETE',
      entityType: 'auth',
      metadata: { name: user?.name },
    })

    // Revoke all refresh tokens for security (logout from all devices)
    await revokeAllUserTokens(tokenData.userId)

    logger.success('Password reset successful for user: ' + tokenData.userId)

    return { success: true, message: 'Password berhasil direset. Silakan login dengan password baru.' }
  }
}
