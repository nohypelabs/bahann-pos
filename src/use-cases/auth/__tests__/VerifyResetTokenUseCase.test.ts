import { VerifyResetTokenUseCase } from '../VerifyResetTokenUseCase'
import type { PasswordResetTokenRepository } from '@/domain/repositories/PasswordResetTokenRepository'
import type { UserRepository } from '@/domain/repositories/UserRepository'

const hour = 3600_000

function setup(token: { usedAt?: Date | null; expiresAt: Date } | null) {
  const tokens = {
    findByToken: jest.fn().mockResolvedValue(token && { id: 't1', userId: 'u1', usedAt: null, ...token }),
  } as unknown as PasswordResetTokenRepository
  const users = {
    findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'kasir@example.com' }),
  } as unknown as UserRepository
  return { useCase: new VerifyResetTokenUseCase(tokens, users), users }
}

describe('VerifyResetTokenUseCase', () => {
  it('names the account a valid link resets', async () => {
    const { useCase } = setup({ expiresAt: new Date(Date.now() + hour) })
    await expect(useCase.execute('raw')).resolves.toMatchObject({ valid: true, userId: 'u1', email: 'kasir@example.com' })
  })

  it('does not reveal the account for a used or expired link', async () => {
    const used = setup({ usedAt: new Date(), expiresAt: new Date(Date.now() + hour) })
    const usedResult = await used.useCase.execute('raw')
    expect(usedResult).toMatchObject({ valid: false })
    expect(usedResult.email).toBeUndefined()
    expect(used.users.findById).not.toHaveBeenCalled()

    const expired = setup({ expiresAt: new Date(Date.now() - hour) })
    expect((await expired.useCase.execute('raw')).email).toBeUndefined()

    const unknown = setup(null)
    expect(await unknown.useCase.execute('raw')).toMatchObject({ valid: false })
  })
})
