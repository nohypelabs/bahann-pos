import type { TokenRotator } from '@/use-cases/auth/RefreshTokenUseCase'
import { rotateRefreshToken } from '@/lib/refreshToken'

export class LibTokenRotator implements TokenRotator {
  async rotate(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return rotateRefreshToken(refreshToken)
  }
}
