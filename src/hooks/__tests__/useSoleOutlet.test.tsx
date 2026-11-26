import { renderHook } from '@testing-library/react'
import { useSoleOutlet } from '../useSoleOutlet'

describe('useSoleOutlet', () => {
  it('picks the only outlet', () => {
    const set = jest.fn()
    renderHook(() => useSoleOutlet([{ id: 'o1' }], '', set))
    expect(set).toHaveBeenCalledWith('o1')
  })

  it('leaves the choice to the user when there are several outlets', () => {
    const set = jest.fn()
    renderHook(() => useSoleOutlet([{ id: 'o1' }, { id: 'o2' }], '', set))
    expect(set).not.toHaveBeenCalled()
  })

  it('keeps a value already chosen and waits for the outlets to load', () => {
    const set = jest.fn()
    renderHook(() => useSoleOutlet([{ id: 'o1' }], 'o1', set))
    renderHook(() => useSoleOutlet(undefined, '', set))
    expect(set).not.toHaveBeenCalled()
  })
})
