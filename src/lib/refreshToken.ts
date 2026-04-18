/**
 * Refresh Token Management System
 *
 * Implements secure refresh token rotation for improved security.
 * Refresh tokens allow long-lived sessions while keeping access tokens short-lived.
 */

import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { signJWT, type JWTPayload } from './jwt'
import { logger } from './logger'

// Configuration
const REFRESH_TOKEN_EXPIRY_DAYS = 30
const ACCESS_TOKEN_EXPIRY = '30m' // 30 minutes (short-lived)

export interface RefreshTokenData {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  usedAt?: Date
  revokedAt?: Date
  deviceInfo?: Record<string, any>
  ipAddress?: string
}

/**
 * Generate a secure random refresh token
 *
 * @returns Cryptographically secure random token (hex string)
 */
function generateRefreshToken(): string {
  // Generate 32 bytes (256 bits) of random data
  return randomBytes(32).toString('hex')
}

/**
 * Hash a refresh token using SHA-256
 * NEVER store plain refresh tokens in database
 *
 * @param token - Plain refresh token
 * @returns SHA-256 hash of token
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new refresh token for a user
 *
 * @param userId - User ID
 * @param metadata - Optional device info and IP address
 * @returns Object containing refresh token and access token
 */
export async function createRefreshToken(
  userId: string,
  metadata?: {
    deviceInfo?: Record<string, any>
    ipAddress?: string
  }
): Promise<{ refreshToken: string; accessToken: string }> {
  try {
    // Get user data for JWT payload
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, outlet_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    // Generate refresh token
    const refreshToken = generateRefreshToken()
    const tokenHash = hashToken(refreshToken)

    // Calculate expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

    // Store refresh token in database
    const { error: insertError } = await supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        device_info: metadata?.deviceInfo || null,
        ip_address: metadata?.ipAddress || null,
      })

    if (insertError) {
      logger.error('Failed to store refresh token', insertError)

      // Provide helpful error message
      if (insertError.message?.includes('relation "refresh_tokens" does not exist')) {
        throw new Error(
          'Refresh tokens table not found. Please run migration 006_refresh_tokens.sql in Supabase Dashboard.\n' +
          'Location: supabase/migrations/006_refresh_tokens.sql'
        )
      }

      throw new Error(`Failed to create refresh token: ${insertError.message}`)
    }

    // Generate short-lived access token
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      outletId: user.outlet_id || undefined,
      role: user.role || undefined,
    }

    const accessToken = signJWT(jwtPayload)

    logger.info('Refresh token created', { userId })

    return {
      refreshToken,
      accessToken,
    }
  } catch (error) {
    logger.error('Error creating refresh token', error)
    throw error
  }
}

/**
 * Rotate refresh token (generate new tokens and invalidate old one)
 * This implements refresh token rotation for security
 *
 * @param refreshToken - Current refresh token
 * @returns New refresh token and access token
 */
export async function rotateRefreshToken(
  refreshToken: string
): Promise<{ refreshToken: string; accessToken: string }> {
  try {
    const tokenHash = hashToken(refreshToken)

    // Find refresh token in database
    const { data: storedToken, error: fetchError } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single()

    if (fetchError || !storedToken) {
      throw new Error('Invalid refresh token')
    }

    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      throw new Error('Refresh token expired')
    }

    // Check if token was already used (prevents reuse attacks)
    if (storedToken.used_at) {
      logger.warn('Refresh token reuse detected', {
        userId: storedToken.user_id,
        tokenId: storedToken.id,
      })
      // Revoke all tokens for this user (possible security breach)
      await revokeAllUserTokens(storedToken.user_id)
      throw new Error('Refresh token already used - security breach detected')
    }

    // Check if token was revoked
    if (storedToken.revoked_at) {
      throw new Error('Refresh token was revoked')
    }

    // Mark old token as used
    await supabase
      .from('refresh_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', storedToken.id)

    // Create new refresh token
    const newTokens = await createRefreshToken(storedToken.user_id, {
      deviceInfo: storedToken.device_info || undefined,
      ipAddress: storedToken.ip_address || undefined,
    })

    logger.info('Refresh token rotated', { userId: storedToken.user_id })

    return newTokens
  } catch (error) {
    logger.error('Error rotating refresh token', error)
    throw error
  }
}

/**
 * Revoke a specific refresh token
 *
 * @param refreshToken - Refresh token to revoke
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const tokenHash = hashToken(refreshToken)

    const { error } = await supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)

    if (error) {
      logger.error('Failed to revoke refresh token', error)
      throw new Error('Failed to revoke refresh token')
    }

    logger.info('Refresh token revoked')
  } catch (error) {
    logger.error('Error revoking refresh token', error)
    throw error
  }
}

/**
 * Revoke all refresh tokens for a user
 * Use when: password change, security breach detected, user logout from all devices
 *
 * @param userId - User ID
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)

    if (error) {
      logger.error('Failed to revoke all user tokens', error)
      throw new Error('Failed to revoke all user tokens')
    }

    logger.info('All refresh tokens revoked for user', { userId })
  } catch (error) {
    logger.error('Error revoking all user tokens', error)
    throw error
  }
}

/**
 * Get all active refresh tokens for a user
 * Useful for showing "active sessions" to users
 *
 * @param userId - User ID
 * @returns Array of active refresh tokens (without actual token values)
 */
export async function getUserActiveTokens(userId: string): Promise<RefreshTokenData[]> {
  try {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch user tokens', error)
      throw new Error('Failed to fetch user tokens')
    }

    return (data || []).map((token) => ({
      id: token.id,
      userId: token.user_id,
      tokenHash: token.token_hash,
      expiresAt: new Date(token.expires_at),
      createdAt: new Date(token.created_at),
      usedAt: token.used_at ? new Date(token.used_at) : undefined,
      revokedAt: token.revoked_at ? new Date(token.revoked_at) : undefined,
      deviceInfo: token.device_info || undefined,
      ipAddress: token.ip_address || undefined,
    }))
  } catch (error) {
    logger.error('Error fetching user tokens', error)
    throw error
  }
}

/**
 * Cleanup expired and used refresh tokens
 * Should be run periodically (e.g., daily via cron job)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const { error } = await supabase.rpc('cleanup_expired_refresh_tokens')

    if (error) {
      logger.error('Failed to cleanup expired tokens', error)
    } else {
      logger.info('Expired tokens cleaned up successfully')
    }
  } catch (error) {
    logger.error('Error cleaning up expired tokens', error)
  }
}
