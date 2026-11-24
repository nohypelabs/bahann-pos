import type { APIRequestContext } from '@playwright/test'

// Minimal tRPC-over-HTTP client (superjson envelope) for setting up and checking
// test data through the same API the UI uses.

export async function trpcQuery<T = unknown>(request: APIRequestContext, path: string, input?: unknown): Promise<T> {
  const query = input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
  const res = await request.get(`/api/trpc/${path}${query}`)
  return unwrap<T>(path, await res.json().catch(() => ({})))
}

export async function trpcMutation<T = unknown>(request: APIRequestContext, path: string, input?: unknown): Promise<T> {
  const res = await request.post(`/api/trpc/${path}`, { data: { json: input ?? null } })
  return unwrap<T>(path, await res.json().catch(() => ({})))
}

function unwrap<T>(path: string, body: { error?: { json?: { message?: string } }; result?: { data?: { json?: T } } }): T {
  if (body.error) throw new Error(`${path}: ${body.error.json?.message ?? JSON.stringify(body.error)}`)
  return body.result?.data?.json as T
}

/** The workshop test account: `<local>+bengkel-uji@<domain>` of E2E_EMAIL. */
export function testAccount() {
  const base = process.env.E2E_EMAIL
  const password = process.env.WORKSHOP_TEST_PASSWORD
  if (!base?.includes('@') || !password) {
    throw new Error('Set E2E_EMAIL and WORKSHOP_TEST_PASSWORD (see e2e/workshop/README.md).')
  }
  const [local, domain] = base.split('@')
  const email = `${local}+bengkel-uji@${domain}`
  // These tests create and pay notes; never point them at a real store.
  if (!email.includes('+bengkel-uji@')) throw new Error(`Refusing to run against ${email}`)
  return { email, password }
}
