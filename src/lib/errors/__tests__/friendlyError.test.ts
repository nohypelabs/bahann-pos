/** @jest-environment node */
import { friendlyError, friendlyMessage, isDeveloperMessage } from '../friendlyError'
import idText from '@/locales/id.json'

/** What a TRPCClientError looks like to the screens: an Error with data.code. */
function trpcError(code: string, message: string) {
  return Object.assign(new Error(message), { data: { code } })
}

describe('friendlyError', () => {
  it('replaces the English admin-only message with plain Indonesian', () => {
    const err = trpcError('FORBIDDEN', 'You do not have permission to access this resource. Admin role required.')
    expect(friendlyError(err, 'Gagal menghapus produk.', 'id')).toBe(idText['errors.noPermission'])
  })

  it('keeps a message the server already wrote for the user', () => {
    const err = trpcError('FORBIDDEN', 'Akun bisnis Anda telah dinonaktifkan. Hubungi pemilik.')
    expect(friendlyError(err, undefined, 'id')).toBe('Akun bisnis Anda telah dinonaktifkan. Hubungi pemilik.')
  })

  it('explains an expired session and a lost connection', () => {
    expect(friendlyError(trpcError('UNAUTHORIZED', 'You must be logged in to access this resource'), undefined, 'id'))
      .toBe(idText['errors.sessionExpired'])
    expect(friendlyError(new TypeError('Failed to fetch'), 'Gagal menyimpan.', 'id')).toBe(idText['errors.offline'])
  })

  it('translates specific server messages', () => {
    expect(friendlyError(trpcError('BAD_REQUEST', 'Shift is not open'), undefined, 'id'))
      .toBe('Shift kasir sudah tidak aktif. Buka shift baru lalu ulangi.')
  })

  it('turns validation issues into one sentence', () => {
    const zod = trpcError('BAD_REQUEST', '[{"code":"too_small","path":["name"],"message":"Too small"}]')
    expect(friendlyError(zod, undefined, 'id')).toBe(idText['errors.invalidInput'])
  })

  it('uses the screen fallback for an unexplained server failure', () => {
    const err = trpcError('INTERNAL_SERVER_ERROR', 'duplicate key value violates unique constraint "products_sku_key"')
    expect(friendlyError(err, 'Gagal menyimpan produk. Periksa data dan coba lagi.', 'id'))
      .toBe('Gagal menyimpan produk. Periksa data dan coba lagi.')
    expect(friendlyError(err, undefined, 'id')).toBe(idText['errors.generic'])
  })

  it('leaves English messages readable for English users', () => {
    expect(friendlyError(trpcError('CONFLICT', 'Outlet is already a member of this group'), undefined, 'en'))
      .toBe('Outlet is already a member of this group')
  })
})

describe('friendlyMessage (toast safety net)', () => {
  it('rewrites raw English permission text and keeps Indonesian text', () => {
    expect(friendlyMessage('Permission denied: pos.refund.approve', 'id')).toBe(idText['errors.noPermission'])
    expect(friendlyMessage('Produk dihapus', 'id')).toBe('Produk dihapus')
  })

  it('treats machine codes as developer text', () => {
    expect(isDeveloperMessage('PLAN_LIMIT_REACHED')).toBe(true)
    expect(isDeveloperMessage('Gagal menyimpan stok')).toBe(false)
  })
})
