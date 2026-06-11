import { UserRepository } from '@/domain/repositories/UserRepository'
import { AppError } from '@/shared/exceptions/AppError'

export interface GetProfileInput {
  userId: string
}

export interface GetProfileOutput {
  id: string
  name: string
  email: string
  whatsappNumber: string
  role: string
  outletId: string | null
}

export class GetProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetProfileInput): Promise<GetProfileOutput> {
    const user = await this.userRepository.findById(input.userId)
    if (!user) {
      throw new AppError('User not found', 404)
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber || '',
      role: user.role || 'user',
      outletId: user.outletId || null,
    }
  }
}
