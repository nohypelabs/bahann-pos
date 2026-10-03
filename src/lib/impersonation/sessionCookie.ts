import { cookies } from 'next/headers';
import { parse } from 'cookie';

/**
 * Overlay cookie that marks an active superadmin impersonation session.
 *
 * It carries only the session row id. Tenant, target user and role are resolved
 * from the database on every request, so a tampered or stale value cannot widen
 * access — the worst a forged cookie can do is point at a session the caller is
 * not allowed to use, which the request projection rejects.
 *
 * Unlike the auth cookies, this one is short-lived (it mirrors the session's
 * `expires_at`) so a forgotten session cannot linger.
 */
const IMPERSONATION_COOKIE_NAME = 'impersonation_session';

/** Cookie lifetime ceiling; the authoritative expiry lives in the database. */
const MAX_COOKIE_AGE_SECONDS = 60 * 60; // 60 minutes

/** Set the impersonation overlay cookie (server-side only). */
export async function setImpersonationCookie(sessionId: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  const secondsLeft = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  cookieStore.set(IMPERSONATION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.max(0, Math.min(secondsLeft, MAX_COOKIE_AGE_SECONDS)),
    path: '/',
  });
}

/** Read the impersonation overlay cookie (server-side only). */
export async function getImpersonationCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value ?? null;
}

/** Clear the impersonation overlay cookie (server-side only). */
export async function deleteImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

/** Parse the impersonation session id out of a raw Cookie header. */
export function parseImpersonationCookieFromHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  return parse(cookieHeader)[IMPERSONATION_COOKIE_NAME] || null;
}

export { IMPERSONATION_COOKIE_NAME };
