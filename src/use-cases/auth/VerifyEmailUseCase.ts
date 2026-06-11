import { UserRepository } from '@/domain/repositories/UserRepository'
import { TRPCError } from '@trpc/server'

export interface VerifyEmailOutput {
  alreadyVerified: boolean
}

export class VerifyEmailUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(token: string): Promise<VerifyEmailOutput> {
    const user = await this.userRepository.findByVerifyToken(token)

    if (!user) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Link verifikasi tidak valid atau sudah kadaluarsa.' })
    }

    if (user.emailVerifiedAt) {
      return { alreadyVerified: true }
    }

    await this.userRepository.activateTrial(user.id)

    await this.userRepository.insertBillingHistory({
      userId: user.id,
      plan: 'starter',
      previousPlan: 'free',
      amount: 0,
      note: 'Trial 14 hari gratis — email terverifikasi',
      isTrial: true,
    })

    return { alreadyVerified: false }
  }
}
