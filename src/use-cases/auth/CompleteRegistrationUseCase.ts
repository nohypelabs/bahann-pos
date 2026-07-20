import { OutletRepository } from '@/domain/repositories/OutletRepository'
import { UserRepository } from '@/domain/repositories/UserRepository'

export class CompleteRegistrationUseCase {
  constructor(
    private outletRepository: OutletRepository,
    private userRepository: UserRepository,
  ) {}

  async execute(
    userId: string,
    storeName: string,
    verifyToken: string,
    initialOutletNames: string[] = [],
  ): Promise<{ outletId: string; outletIds: string[] }> {
    const outletNames = Array.from(
      new Set(
        [storeName, ...initialOutletNames]
          .map(name => name.trim())
          .filter(Boolean),
      ),
    )

    const createdOutlets = []
    for (const outletName of outletNames) {
      createdOutlets.push(
        await this.outletRepository.create({
          name: outletName,
          ownerId: userId,
          tenantId: userId,
        }),
      )
    }

    const firstOutlet = createdOutlets[0]
    await this.userRepository.updateRegistrationDetails(userId, firstOutlet.id, verifyToken)

    return {
      outletId: firstOutlet.id,
      outletIds: createdOutlets.map(outlet => outlet.id),
    }
  }
}
