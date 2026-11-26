/** @jest-environment node */
import { AccountSuspendedError, createRefreshToken } from '../refreshToken'

type Row = { id: string; email: string; name: string; outlet_id: string | null; role: string; tenant_id: string | null; is_suspended: boolean }
const users = new Map<string, Row>()
const inserted: unknown[] = []

jest.mock('@/infra/supabase/server', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'refresh_tokens') {
        return { insert: async (row: unknown) => { inserted.push(row); return { error: null } } }
      }
      return {
        select: () => ({
          eq: (_column: string, id: string) => ({
            single: async () => (users.has(id) ? { data: users.get(id), error: null } : { data: null, error: { message: 'not found' } }),
          }),
        }),
      }
    },
  },
}))
jest.mock('../jwt', () => ({ signJWT: () => 'signed-access-token' }))

const add = (row: Partial<Row> & { id: string }) =>
  users.set(row.id, { email: `${row.id}@example.com`, name: row.id, outlet_id: null, role: 'admin', tenant_id: row.id, is_suspended: false, ...row })

beforeEach(() => {
  users.clear()
  inserted.length = 0
  add({ id: 'owner' })
  add({ id: 'cashier', role: 'user', tenant_id: 'owner', outlet_id: 'o1' })
  add({ id: 'staff-admin', role: 'admin', tenant_id: 'owner' })
})

describe('createRefreshToken and suspension', () => {
  it('issues a session for an active owner and staff', async () => {
    await expect(createRefreshToken('owner')).resolves.toMatchObject({ accessToken: 'signed-access-token' })
    await expect(createRefreshToken('staff-admin')).resolves.toMatchObject({ accessToken: 'signed-access-token' })
    expect(inserted).toHaveLength(2)
  })

  it('refuses a suspended account', async () => {
    add({ id: 'cashier', role: 'user', tenant_id: 'owner', is_suspended: true })
    await expect(createRefreshToken('cashier')).rejects.toEqual(new AccountSuspendedError('USER'))
    expect(inserted).toHaveLength(0)
  })

  it('refuses every staff role of a suspended tenant, not only cashiers', async () => {
    add({ id: 'owner', is_suspended: true })
    await expect(createRefreshToken('owner')).rejects.toMatchObject({ reason: 'USER' })
    await expect(createRefreshToken('cashier')).rejects.toMatchObject({ reason: 'TENANT' })
    await expect(createRefreshToken('staff-admin')).rejects.toMatchObject({ reason: 'TENANT' })
    expect(inserted).toHaveLength(0)
  })
})
