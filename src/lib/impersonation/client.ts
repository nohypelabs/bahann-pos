/**
 * Browser-side bookkeeping for impersonation.
 *
 * The UI reads the signed-in user from `localStorage.user` (see Sidebar), which is
 * display-only data — never an authorization input. While impersonating we swap
 * that display object to the tenant identity and keep the original so exiting can
 * restore it without another round trip.
 *
 * Everything here is cosmetic. Authorization always comes from the server session
 * projection, so a user editing localStorage can change what they see but not what
 * they are allowed to do.
 */
const USER_KEY = 'user';
const ORIGIN_KEY = 'impersonation_origin';

export interface DisplayUser {
  name: string;
  email: string;
  role: string;
}

function readUser(): DisplayUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DisplayUser;
  } catch {
    return null;
  }
}

function writeUser(user: DisplayUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Remember the real identity, then display the impersonated one. */
export function enterImpersonationDisplay(user: DisplayUser): void {
  if (typeof window === 'undefined') return;

  const current = readUser();
  if (current) {
    localStorage.setItem(ORIGIN_KEY, JSON.stringify(current));
  }
  writeUser(user);
}

/** Restore the real identity and drop the stored snapshot. */
export function exitImpersonationDisplay(): void {
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem(ORIGIN_KEY);
  if (raw) {
    try {
      writeUser(JSON.parse(raw) as DisplayUser);
    } catch {
      // Corrupt snapshot: fall back to dropping it so at least the banner clears.
    }
  }
  localStorage.removeItem(ORIGIN_KEY);
}
