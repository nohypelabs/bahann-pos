'use client'

import { useEffect, useEffectEvent } from 'react'

// A USB scanner acts as a keyboard ("keyboard wedge"): the Metrologic scanner tested on 27 Nov 2026 types
// 13 digits and Enter in about 50 ms, 4 ms per key. People type 80 ms or more per key, so a gap above
// MAX_GAP_MS starts a new code and typing never builds one up.
const MAX_GAP_MS = 50
const MIN_LENGTH = 4

/**
 * Catches a scanned code when no text field has focus, so a scan is never lost. Inside a text field the
 * field itself receives the code and its own Enter handler decides.
 */
export function useBarcodeWedge(onScan: (code: string) => void, enabled = true) {
  const handleScan = useEffectEvent(onScan)

  useEffect(() => {
    if (!enabled) return
    let buffer = ''
    let lastKeyAt = 0

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return

      if (e.timeStamp - lastKeyAt > MAX_GAP_MS) buffer = ''
      lastKeyAt = e.timeStamp

      if (e.key === 'Enter') {
        if (buffer.length >= MIN_LENGTH) {
          e.preventDefault()
          handleScan(buffer)
        }
        buffer = ''
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

/** The hook as a component, for screens that can only render it below an early return. */
export function BarcodeWedge({ onScan, enabled = true }: { onScan: (code: string) => void; enabled?: boolean }) {
  useBarcodeWedge(onScan, enabled)
  return null
}
