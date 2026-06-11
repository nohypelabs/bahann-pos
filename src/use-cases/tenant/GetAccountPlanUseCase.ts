import { UserRepository } from '@/domain/repositories/UserRepository'
import { OutletRepository } from '@/domain/repositories/OutletRepository'

export class GetAccountPlanUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly outletRepo: OutletRepository,
  ) {}

  async execute(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId)
    if (!user) return 'free'

    if (user.role === 'admin' || user.role === 'super_admin') {
      return this.userRepo.getPlan(userId)
    }

    if (user.outletId) {
      const outlet = await this.outletRepo.findById(user.outletId)
      if (outlet?.owner_id) {
        return this.userRepo.getPlan(outlet.owner_id)
      }
    }

    return 'free'
  }
}
