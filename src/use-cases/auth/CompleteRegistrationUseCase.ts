import { OutletRepository } from '@/domain/repositories/OutletRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'

export class CompleteRegistrationUseCase {
  constructor(
    private outletRepository: OutletRepository,
    private userRepository: UserRepository,
  ) {}

  async execute(userId: string, storeName: string, verifyToken: string): Promise<{ outletId: string }> {
    const outlet = await this.outletRepository.create({
      name: storeName,
      ownerId: userId,
      tenantId: userId,
    })
    await this.userRepository.updateRegistrationDetails(userId, outlet.id, verifyToken)
    return { outletId: outlet.id }
  }
}
