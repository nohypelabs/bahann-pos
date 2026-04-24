'use client'

import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/Toast'
import { Mail, Send, CheckCircle, X } from 'lucide-react'
import { useState } from 'react'

export function EmailVerificationBanner() {
  const { showToast } = useToast()
  const [dismissed, setDismissed] = useState(false)

  const { data, isLoading } = trpc.auth.getEmailVerified.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })

  const resend = trpc.auth.resendVerification.useMutation({
    onSuccess: () => showToast('Email verifikasi terkirim! Cek inbox kamu.', 'success'),
    onError: () => showToast('Gagal mengirim email. Coba lagi beberapa saat.', 'error'),
  })

  if (isLoading || dismissed || data?.verified) return null
  if (data?.plan && data.plan !== 'free') return null

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-200 dark:border-blue-800/50 px-4 py-3 mb-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Verifikasi email untuk aktivasi trial Starter
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Cek inbox kamu dan klik link verifikasi — trial 14 hari langsung aktif.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {resend.isPending ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Mengirim...</span>
              </>
            ) : resend.isSuccess ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terkirim!</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kirim Ulang</span>
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
