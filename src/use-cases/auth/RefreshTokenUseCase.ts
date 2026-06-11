export interface TokenRotator {
  rotate(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>
}

export interface AuthCookieManager {
  getRefreshToken(): Promise<string | null>
  setTokens(accessToken: string, refreshToken: string): Promise<void>
  clearTokens(): Promise<void>
}

export class RefreshTokenUseCase {
  constructor(
    private readonly tokenRotator: TokenRotator,
    private readonly cookieManager: AuthCookieManager,
  ) {}

  async execute(): Promise<{ success: boolean; message: string }> {
    const refreshToken = await this.cookieManager.getRefreshToken()

    if (!refreshToken) {
      throw new Error('No refresh token found')
    }

    try {
      const { accessToken, refreshToken: newRefreshToken } =
        await this.tokenRotator.rotate(refreshToken)

      await this.cookieManager.setTokens(accessToken, newRefreshToken)

      return { success: true, message: 'Tokens refreshed successfully' }
    } catch {
      await this.cookieManager.clearTokens()
      throw new Error('Failed to refresh token - please login again')
    }
  }
}
