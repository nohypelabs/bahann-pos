import { UserRepository } from '@/domain/repositories/UserRepository'

export interface GetEmailVerifiedOutput {
  verified: boolean
  plan: string
}

export class GetEmailVerifiedUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<GetEmailVerifiedOutput> {
    return this.userRepository.getEmailVerificationStatus(userId)
  }
}
