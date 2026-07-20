import jwt from 'jsonwebtoken'

// Validate JWT_SECRET is set - CRITICAL for security
if (!process.env.JWT_SECRET) {
  throw new Error(
    '❌ CRITICAL: JWT_SECRET environment variable is not set!\n' +
    'Set JWT_SECRET in your .env file before starting the application.\n' +
    'Generate a secure secret with: openssl rand -base64 32'
  )
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '30m' // Short-lived access token — use refresh token for long sessions

export interface JWTPayload {
  userId: string
  email: string
  name: string
  outletId?: string
  role?: string
  tenantId?: string
}

/**
 * Generate JWT token with configurable expiry.
 * Defaults to 30m for security. Use refresh token mechanism for long-lived sessions.
 */
export function signJWT(payload: JWTPayload, expiresIn?: string): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (expiresIn || JWT_EXPIRES_IN) as any,
  })
}

/**
 * Verify and decode JWT token
 */
export function verifyJWT(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Decode JWT without verification (for client-side display)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch (error) {
    return null
  }
}
