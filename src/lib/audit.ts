/**
 * Audit Logging System
 *
 * Tracks all critical operations for compliance and security monitoring.
 * Logs: WHO did WHAT, WHEN, and WHERE.
 */

import { supabaseAdmin as supabase } from '@/infra/supabase/server'
import { logger } from './logger'
import { getRequestContext } from './impersonation/requestContext'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'EXPORT'
  | 'SUSPEND'
  | 'ACTIVATE'
  | 'IMPERSONATE_START'
  | 'IMPERSONATE_END'

export type AuditEntity =
  | 'user'
  | 'product'
  | 'outlet'
  | 'sale'
  | 'stock'
  | 'auth'
  | 'transaction'
  | 'cash_session'
  | 'promotion'
  | 'stock_alert'
  | 'tenant'
  | 'payment'
  | 'payment_request'
  | 'business_profile'
  | 'user_role_assignment'
  | 'transaction_approval'
  | 'impersonation'

export interface AuditLogData {
  userId: string
  userEmail: string
  action: AuditAction
  entityType: AuditEntity
  entityId?: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  /** Real actor, when it differs from userId. Defaults to the request context. */
  actorUserId?: string
  /** Links the entry to an impersonation session. Defaults to the request context. */
  impersonationId?: string | null
  /** Tenant the action belongs to. Defaults to the request context. */
  tenantId?: string | null
}

/**
 * Create audit log entry
 *
 * @param data - Audit log data
 * @returns Promise<void>
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  // tenant_id comes from the request context, because this column is NOT NULL and
  // was previously left unset — which made every audit insert fail silently and
  // the audit trail permanently empty. Likewise the real actor comes from the
  // context, since userId is the impersonated tenant user while impersonating.
  // audit_logs is immutable, so these values must be right at insert time.
  const requestContext = getRequestContext()
  const actorUserId = data.actorUserId ?? requestContext?.actorUserId ?? data.userId
  const impersonationId = data.impersonationId ?? requestContext?.impersonationId ?? null
  const tenantId = data.tenantId ?? requestContext?.tenantId ?? null

  try {
    const auditEntry = {
      user_id: data.userId,
      user_email: data.userEmail,
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      impersonation_id: impersonationId,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId || null,
      changes: data.changes || null,
      metadata: data.metadata || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('audit_logs').insert(auditEntry)

    if (error) {
      logger.error('AUDIT WRITE FAILED — the audit trail is incomplete for this action', error, {
        auditData: data,
      })
      // Don't throw - audit logging failure shouldn't break the main operation
    } else {
      logger.debug('Audit log created', {
        action: data.action,
        entityType: data.entityType,
        userId: data.userId,
      })
    }
  } catch (error) {
    logger.error('Unexpected error in audit logging', error)
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Get audit logs with filters
 *
 * @param filters - Filter options
 * @returns Promise<AuditLog[]>
 */
export async function getAuditLogs(filters?: {
  userId?: string
  entityType?: AuditEntity
  action?: AuditAction
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Failed to fetch audit logs', error)
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  return data || []
}

/**
 * Get audit logs count
 *
 * @param filters - Filter options
 * @returns Promise<number>
 */
export async function getAuditLogsCount(filters?: {
  userId?: string
  entityType?: AuditEntity
  action?: AuditAction
  startDate?: string
  endDate?: string
}): Promise<number> {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  const { count, error } = await query

  if (error) {
    logger.error('Failed to count audit logs', error)
    throw new Error(`Failed to count audit logs: ${error.message}`)
  }

  return count || 0
}

/**
 * Helper: Extract IP and User Agent from request headers
 */
export function extractRequestMetadata(headers: Headers): {
  ipAddress?: string
  userAgent?: string
} {
  return {
    ipAddress:
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      undefined,
    userAgent: headers.get('user-agent') || undefined,
  }
}
