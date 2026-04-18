'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading')

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setStatus(data.alreadyVerified ? 'already' : 'success')
      if (!data.alreadyVerified) {
        setTimeout(() => router.push('/dashboard'), 3000)
      }
    },
    onError: () => setStatus('error'),
  })

  useEffect(() => {
    if (token) verify.mutate({ token })
    else setStatus('error')
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">
          {status === 'loading' && '⏳'}
          {status === 'success' && '🎉'}
          {status === 'already' && '✅'}
          {status === 'error' && '❌'}
        </div>

        {status === 'loading' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Memverifikasi email...</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Mohon tunggu sebentar.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Email Terverifikasi!</h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Trial <strong>14 hari Starter</strong> kamu sudah aktif. Kamu akan diarahkan ke dashboard...
            </p>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
              🎁 Nikmati semua fitur Starter gratis selama 14 hari!
            </div>
          </>
        )}

        {status === 'already' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Sudah Terverifikasi</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Email kamu sudah pernah diverifikasi sebelumnya.</p>
            <a href="/dashboard" className="inline-block px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Buka Dashboard →
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Link Tidak Valid</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Link verifikasi tidak valid atau sudah kadaluarsa. Minta link baru dari dalam aplikasi.
            </p>
            <a href="/login" className="inline-block px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Login →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
