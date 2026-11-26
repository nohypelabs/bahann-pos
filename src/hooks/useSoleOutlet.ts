'use client'

import { useEffect } from 'react'

/**
 * Picks the only outlet when a tenant has exactly one, so nobody has to choose it by hand.
 * Runs again after a form resets the value to '', so the outlet stays picked.
 */
export function useSoleOutlet(outlets: { id: string }[] | undefined, value: string, setValue: (id: string) => void) {
  const soleId = outlets?.length === 1 ? outlets[0].id : null
  useEffect(() => {
    if (soleId && !value) setValue(soleId)
  }, [soleId, value, setValue])
}
