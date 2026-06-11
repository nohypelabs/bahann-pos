import { PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'

export interface VerifyResetTokenOutput {
  valid: boolean
  userId?: string
  message: string
}

export class VerifyResetTokenUseCase {
  constructor(
    private readonly tokenRepository: PasswordResetTokenRepository,
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

    return { valid: true, userId: tokenData.userId, message: 'Token valid' }
  }
}
