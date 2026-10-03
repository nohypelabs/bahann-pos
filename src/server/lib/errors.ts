import { TRPCError } from '@trpc/server'
import { AppError } from '@/shared/exceptions/AppError'

/**
 * Maps a domain AppError's HTTP status onto the matching tRPC error code.
 *
 * Without this, a non-TRPCError thrown from a use case is reported by tRPC as
 * INTERNAL_SERVER_ERROR (HTTP 500). That made ordinary outcomes such as "wrong
 * password" show up as server errors — wrong for clients, and noisy in Sentry.
 */
export function appErrorToTrpcCode(statusCode: number): TRPCError['code'] {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 422:
      return 'UNPROCESSABLE_CONTENT'
    case 429:
      return 'TOO_MANY_REQUESTS'
    default:
      return 'INTERNAL_SERVER_ERROR'
  }
}

/**
 * Re-throws a domain AppError as the equivalent TRPCError, and passes anything
 * else through untouched so genuine bugs keep surfacing as internal errors.
 *
 * Returns `never`, so it can be used directly as a rejection handler:
 *   `await useCase.execute(input).catch(toTRPCError)`
 */
export function toTRPCError(error: unknown): never {
  if (error instanceof AppError) {
    throw new TRPCError({
      code: appErrorToTrpcCode(error.statusCode),
      message: error.message,
      cause: error,
    })
  }

  throw error
}
