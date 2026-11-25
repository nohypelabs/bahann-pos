import { PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'

export interface VerifyResetTokenOutput {
  valid: boolean
  userId?: string
  /** The account the link resets, shown on the page so a wrong account is noticed before saving. */
  email?: string
  message: string
}

export class VerifyResetTokenUseCase {
  constructor(
    private readonly tokenRepository: PasswordResetTokenRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(token: string): Promise<VerifyResetTokenOutput> {
    const tokenData = await this.tokenRepository.findByToken(token)

    if (!tokenData) {
      return { valid: false, message: 'Token tidak valid' }
    }

    if (tokenData.usedAt) {
      return { valid: false, message: 'Token sudah digunakan' }
    }

    if (new Date() > tokenData.expiresAt) {
      return { valid: false, message: 'Token sudah kadaluarsa' }
    }

    const user = await this.userRepository.findById(tokenData.userId)
    return { valid: true, userId: tokenData.userId, email: user?.email, message: 'Token valid' }
  }
}
