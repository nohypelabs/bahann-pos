import type { AuthCookieManager } from '@/use-cases/auth/RefreshTokenUseCase'
import { getRefreshCookie, setAuthCookie, setRefreshCookie, deleteAuthCookie, deleteRefreshCookie } from '@/lib/cookies'

export class LibAuthCookieManager implements AuthCookieManager {
  async getRefreshToken(): Promise<string | null> {
    return getRefreshCookie()
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await setAuthCookie(accessToken)
    await setRefreshCookie(refreshToken)
  }

  async clearTokens(): Promise<void> {
    await deleteAuthCookie()
    await deleteRefreshCookie()
  }
}
