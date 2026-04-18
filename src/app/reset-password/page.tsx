'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { trpc } from '@/lib/trpc/client'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  // Verify token on mount
  const { data: tokenVerification, isLoading: isVerifying } = trpc.auth.verifyResetToken.useQuery(
    { token: token || '' },
    { enabled: !!token }
  )

  useEffect(() => {
    if (tokenVerification) {
      setTokenValid(tokenVerification.valid)
      if (!tokenVerification.valid) {
        setError(tokenVerification.message || 'Token tidak valid')
      }
    }
  }, [tokenVerification])

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate
    if (!token) {
      setError('Token tidak ditemukan')
      return
    }

    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    setIsLoading(true)

    try {
      await resetPasswordMutation.mutateAsync({
        token,
        newPassword,
      })

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal reset password'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // No token
  if (!token) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">AGDS Corp POS</h1>
            <p className="text-gray-600">Reset Password</p>
          </div>

          <Card variant="elevated" padding="lg">
            <CardBody>
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">❌</div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">Link Tidak Valid</h3>
                <p className="text-gray-600 mb-6">
                  Link reset password tidak valid. Silakan request ulang reset password.
                </p>
                <a href="/forgot-password" className="text-blue-600 hover:underline font-semibold">
                  ← Request Reset Password
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  // Verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mb-4"></div>
          <p className="text-gray-600">Memverifikasi token...</p>
        </div>
      </div>
    )
  }

  // Invalid token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">AGDS Corp POS</h1>
            <p className="text-gray-600">Reset Password</p>
          </div>

          <Card variant="elevated" padding="lg">
            <CardBody>
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">⏰</div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">Token Tidak Valid</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <a href="/forgot-password" className="text-blue-600 hover:underline font-semibold">
                  ← Request Reset Password Baru
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AGDS Corp POS</h1>
          <p className="text-gray-600">Reset Password</p>
        </div>

        {/* Reset Password Card */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Buat Password Baru</CardTitle>
          </CardHeader>

          <CardBody>
            {success ? (
              <div className="text-center py-8">
                <div className="mb-4 text-6xl">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Password Berhasil Direset!</h3>
                <p className="text-gray-600 mb-4">
                  Password Anda telah berhasil diubah. Anda akan dialihkan ke halaman login...
                </p>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-900">
                    💡 Masukkan password baru Anda (minimal 8 karakter)
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-sm font-semibold text-red-600">❌ {error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Password Baru *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 8 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Gunakan kombinasi huruf, angka, dan simbol</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Konfirmasi Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ketik ulang password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth disabled={isLoading}>
                  {isLoading ? 'Memproses...' : '🔐 Reset Password'}
                </Button>

                <div className="text-center">
                  <a href="/login" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">
                    ← Kembali ke Login
                  </a>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Info Box */}
        {!success && (
          <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-900 font-semibold mb-2">🔒 Keamanan:</p>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• Password minimal 8 karakter</li>
              <li>• Gunakan kombinasi huruf besar, kecil, angka, dan simbol</li>
              <li>• Jangan gunakan password yang mudah ditebak</li>
              <li>• Setelah reset, Anda akan otomatis logout dari semua device</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
