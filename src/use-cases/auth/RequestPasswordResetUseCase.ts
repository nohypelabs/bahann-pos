import { UserRepository } from '@/domain/repositories/UserRepository'
import { PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'
import { sendPasswordResetEmail, generateResetToken } from '@/lib/email'
import { createAuditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { hashPasswordResetToken } from '@/lib/security/resetToken'

export interface RequestPasswordResetInput {
  email: string
}

export interface RequestPasswordResetOutput {
  success: boolean
  message: string
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput> {
    const user = await this.userRepository.findByEmail(input.email)

    // Security: Always return success even if user doesn't exist
    // to prevent email enumeration attacks
    if (!user) {
      logger.warn('Password reset requested for non-existent email: ' + input.email)
      return { success: true, message: 'If the email exists, a reset link has been sent' }
    }

    const resetToken = generateResetToken()
    const hashedResetToken = hashPasswordResetToken(resetToken)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await this.tokenRepository.save({
      userId: user.id,
      token: hashedResetToken,
      expiresAt,
    })

    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetToken })

      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PASSWORD_RESET_REQUEST',
        entityType: 'auth',
        metadata: { name: user.name },
      })

      logger.success('Password reset email sent to: ' + user.email)
    } catch (emailError) {
      logger.error('Failed to send reset email:', emailError)
    }

    return { success: true, message: 'If the email exists, a reset link has been sent' }
  }
}
