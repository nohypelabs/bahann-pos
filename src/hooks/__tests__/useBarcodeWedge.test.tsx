import { renderHook } from '@testing-library/react'
import { useBarcodeWedge } from '../useBarcodeWedge'

/** Types `text` then Enter on `target`, `gapMs` apart, as the scanner or a person would. */
function type(text: string, gapMs: number, target: EventTarget = document.body) {
  let at = 1000
  for (const key of [...text, 'Enter']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    Object.defineProperty(event, 'timeStamp', { value: at })
    target.dispatchEvent(event)
    at += gapMs
  }
}

describe('useBarcodeWedge', () => {
  it('passes on a code typed at scanner speed and ended by Enter', () => {
    const onScan = jest.fn()
    renderHook(() => useBarcodeWedge(onScan))
    type('2000000000039', 4)
    expect(onScan).toHaveBeenCalledWith('2000000000039')
  })

  it('keeps upper-case SKUs (the scanner sends Shift + letter)', () => {
    const onScan = jest.fn()
    renderHook(() => useBarcodeWedge(onScan))
    type('JAS-00001', 4)
    expect(onScan).toHaveBeenCalledWith('JAS-00001')
  })

  it('ignores typing at human speed', () => {
    const onScan = jest.fn()
    renderHook(() => useBarcodeWedge(onScan))
    type('2000000000039', 120)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('leaves a scan into a text field to that field', () => {
    const onScan = jest.fn()
    renderHook(() => useBarcodeWedge(onScan))
    const input = document.createElement('input')
    document.body.appendChild(input)
    type('2000000000039', 4, input)
    expect(onScan).not.toHaveBeenCalled()
    input.remove()
  })

  it('does nothing while disabled', () => {
    const onScan = jest.fn()
    renderHook(() => useBarcodeWedge(onScan, false))
    type('2000000000039', 4)
    expect(onScan).not.toHaveBeenCalled()
  })
})
