'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'

export function EmailVerificationBanner() {
  const [sent, setSent] = useState(false)

  const { data, isLoading } = trpc.auth.getEmailVerified.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })

  const resend = trpc.auth.resendVerification.useMutation({
    onSuccess: () => setSent(true),
  })

  if (isLoading || data?.verified) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          ✉️ <strong>Verifikasi emailmu</strong> untuk mengaktifkan trial 14 hari Starter gratis.
        </p>
        {sent ? (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">✅ Email terkirim! Cek inbox kamu.</span>
        ) : (
          <button
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 bg-amber-100 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-700/50 text-amber-800 dark:text-amber-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {resend.isPending ? 'Mengirim...' : 'Kirim Ulang Email'}
          </button>
        )}
      </div>
    </div>
  )
}
