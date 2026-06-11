import { UserRepository } from '@/domain/repositories/UserRepository'

export interface UpdateProfileInput {
  userId: string
  name: string
  whatsappNumber?: string
}

export class UpdateProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateProfileInput): Promise<void> {
    await this.userRepository.updateProfileFields(input.userId, {
      name: input.name,
      whatsappNumber: input.whatsappNumber,
    })
  }
}
