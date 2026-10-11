/**
 * Application Logger
 *
 * Centralized logging utility that:
 * - Provides consistent logging interface across the app
 * - Respects environment settings (dev/prod)
 * - Can be easily extended to integrate with external logging services
 * - Supports different log levels (debug, info, warn, error)
 */

import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment: boolean
  private isServer: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isServer = typeof window === 'undefined'
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const prefix = this.isServer ? '[Server]' : '[Client]'
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}${contextStr}`
  }

  /**
   * Send log to external monitoring service
   */
  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext): void {
    // Only send to Sentry in production
    if (!this.isDevelopment) {
      // Map log levels to Sentry severity
      const sentryLevel = level === 'debug' ? 'debug' :
                          level === 'info' ? 'info' :
                          level === 'warn' ? 'warning' : 'error'

      if (level === 'error') {
        // For errors, capture as exception for better tracking
        Sentry.captureException(new Error(message), {
          level: sentryLevel,
          extra: context,
        })
      } else if (level === 'warn') {
        // For warnings, capture as message
        Sentry.captureMessage(message, {
          level: sentryLevel,
          extra: context,
        })
      }
    }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return

    const formatted = this.formatMessage('debug', message, context)
    console.debug(formatted)
  }

  /**
   * Info level logging (development only)
   */
  info(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return

    const formatted = this.formatMessage('info', message, context)
    console.log(formatted)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('warn', message, context)

    if (this.isDevelopment) {
      console.warn(formatted)
    }

    this.sendToMonitoring('warn', message, context)
  }

  /**
   * Error level logging (always logs, sends to monitoring in production)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    }

    const formatted = this.formatMessage('error', message, errorContext)

    // Server errors also go to stdout in production so they show up in Vercel logs.
    if (this.isDevelopment || this.isServer) {
      console.error(formatted)
      if (error instanceof Error) {
        console.error(error)
      }
    }

    this.sendToMonitoring('error', message, errorContext)
  }

  /**
   * Log successful operations (development only)
   */
  success(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return

    const formatted = this.formatMessage('info', `✅ ${message}`, context)
    console.log(formatted)
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger()

/**
 * Default export for convenience
 */
export default logger
