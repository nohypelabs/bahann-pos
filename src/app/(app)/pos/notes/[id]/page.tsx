'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Notes are edited on the cashier station at /pos/notes?note=<id> (one route, so
 * it keeps working offline). This keeps old links working.
 */
export default function ServiceNoteRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  useEffect(() => { router.replace(`/pos/notes?note=${id}`) }, [router, id])
  return null
}
