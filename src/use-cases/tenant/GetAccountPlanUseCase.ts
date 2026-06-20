import { UserRepository } from '@/domain/repositories/UserRepository'

export class GetAccountPlanUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    // Kept temporarily to avoid breaking container wiring while plan lookup
    // is normalized to tenant scope.
    private readonly _unusedOutletRepo?: unknown,
  ) {}

  async execute(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId)
    if (!user) return 'free'

    if (user.tenantId) {
      return this.userRepo.getPlanByTenantId(user.tenantId)
    }

    return 'free'
  }
}
