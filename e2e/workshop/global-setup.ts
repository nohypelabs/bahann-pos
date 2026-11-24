import { mkdirSync, writeFileSync } from 'node:fs'
import { request, type FullConfig } from '@playwright/test'
import { testAccount, trpcMutation, trpcQuery } from './trpc'

// Logs in once (login is rate-limited), checks the tenant is the workshop test
// tenant with the module on, opens a cashier shift if none is open (paying a note
// needs one), and saves the session for the tests.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  const { email, password } = testAccount()
  const api = await request.newContext({ baseURL })

  const { user } = await trpcMutation<{ user: { name: string; email: string; role: string } }>(api, 'auth.login', { email, password })

  const profile = await trpcQuery<{ enabledModules?: string[] } | null>(api, 'businessProfile.getMyProfile')
  if (!profile?.enabledModules?.includes('workshop')) {
    throw new Error(`The workshop module is off for ${email}; run scripts/workshop-test-tenant.mjs first.`)
  }

  const { outlets } = await trpcQuery<{ outlets: { id: string }[] }>(api, 'outlets.getAll')
  for (const outlet of outlets) {
    const shift = await trpcQuery(api, 'shifts.getActive', { outletId: outlet.id })
    if (!shift) await trpcMutation(api, 'shifts.open', { outletId: outlet.id, openingCash: 0 })
  }

  // The cookies carry the session; the app layout also expects the display copy of
  // the user that the login page keeps in localStorage.
  const state = await api.storageState()
  state.origins = [{
    origin: new URL(baseURL).origin,
    localStorage: [{ name: 'user', value: JSON.stringify({ name: user.name, email: user.email, role: user.role }) }],
  }]
  mkdirSync('e2e/.auth', { recursive: true })
  writeFileSync('e2e/.auth/workshop.json', JSON.stringify(state, null, 2))
  await api.dispose()
}
