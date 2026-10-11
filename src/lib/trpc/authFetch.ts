/**
 * fetch for the tRPC links that keeps the session alive.
 *
 * Access tokens live 15 minutes and nothing else renews them, so without this
 * every request after 15 minutes failed with UNAUTHORIZED until the user logged
 * in again. On an UNAUTHORIZED response this refreshes the session once (using
 * the httpOnly refresh cookie) and replays the request; if the refresh fails,
 * the session is really over and the user is sent to the login page.
 *
 * Refresh tokens rotate on use, so concurrent refreshes would race and the loser
 * would revoke the session. All callers in the tab share one in-flight refresh.
 */

const REFRESH_PATH = '/api/trpc/auth.refresh'
const AUTH_PATHS = ['auth.refresh', 'auth.login', 'auth.register', 'auth.logout']

let refreshInFlight: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(REFRESH_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: null }),
    })
      .then(async (res) => {
        if (!res.ok) return false
        const body = await res.json().catch(() => null)
        return !body?.error
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

async function isUnauthorized(res: Response): Promise<boolean> {
  if (res.status === 401) return true
  // A batch mixing calls answers 207; look inside for an UNAUTHORIZED result.
  if (res.status !== 207) return false
  const text = await res.clone().text().catch(() => '')
  return text.includes('"UNAUTHORIZED"')
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const { pathname, search } = window.location
  if (pathname.startsWith('/login')) return
  try {
    localStorage.removeItem('user')
  } catch {
    // storage may be unavailable; the redirect still ends the session
  }
  window.location.href = `/login?redirect=${encodeURIComponent(pathname + search)}`
}

export async function authFetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const init: RequestInit = { ...options, credentials: 'include' }
  const res = await fetch(url, init)

  const target = String(url)
  if (AUTH_PATHS.some((p) => target.includes(p)) || !(await isUnauthorized(res))) {
    return res
  }

  if (!(await refreshSession())) {
    redirectToLogin()
    return res
  }

  return fetch(url, init)
}
