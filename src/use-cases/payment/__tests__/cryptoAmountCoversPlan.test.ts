/** @jest-environment node */
import { cryptoAmountCoversPlan } from '../ManagePaymentUseCase'

describe('cryptoAmountCoversPlan', () => {
  it('accepts a previewed stablecoin amount: the price plus the unique cents', () => {
    expect(cryptoAmountCoversPlan(19.0042, 19, 'usdc')).toBe(true)
    expect(cryptoAmountCoversPlan(19, 19, 'usdt')).toBe(true)
  })

  it('refuses an amount below the price or far above it', () => {
    expect(cryptoAmountCoversPlan(0.01, 19, 'usdc')).toBe(false)
    expect(cryptoAmountCoversPlan(18.99, 19, 'usdc')).toBe(false)
    expect(cryptoAmountCoversPlan(25, 19, 'usdc')).toBe(false)
    expect(cryptoAmountCoversPlan(Number.NaN, 19, 'usdc')).toBe(false)
  })

  it('allows SOL to have moved a little since the preview', () => {
    expect(cryptoAmountCoversPlan(0.098, 0.1, 'sol')).toBe(true)
    expect(cryptoAmountCoversPlan(0.09, 0.1, 'sol')).toBe(false)
  })
})
