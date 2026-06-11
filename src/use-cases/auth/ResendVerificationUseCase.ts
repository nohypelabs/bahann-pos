import { UserRepository } from '@/domain/repositories/UserRepository'
import { generateResetToken, sendVerificationEmail } from '@/lib/email'
import { TRPCError } from '@trpc/server'

export class ResendVerificationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findById(userId)

    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User tidak ditemukan.' })

    const status = await this.userRepository.getEmailVerificationStatus(userId)
    if (status.verified) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email sudah terverifikasi.' })

    const newToken = generateResetToken()
    await this.userRepository.updateVerifyToken(userId, newToken)

    await sendVerificationEmail({ to: user.email, name: user.name ?? 'Pengguna', token: newToken })
    return { success: true }
  }
}
