'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'

const ROLE_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  admin:   { label: 'Administrator', icon: '👑', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' },
  manager: { label: 'Manager',       icon: '⭐', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' },
  default: { label: 'Kasir',         icon: '👤', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' },
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 md:p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
      <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', whatsappNumber: '' })

  const { data: profile, isLoading, refetch } = trpc.auth.getProfile.useQuery()
  const updateProfile = trpc.auth.updateProfile.useMutation()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) setFormData({ name: profile.name, whatsappNumber: profile.whatsappNumber })
  }, [profile])

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData)
      await refetch()
      setIsEditing(false)
      showToast('Profil berhasil diperbarui!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan profil', 'error')
    }
  }

  const handleCancel = () => {
    if (profile) setFormData({ name: profile.name, whatsappNumber: profile.whatsappNumber })
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat profil…</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const badge = ROLE_BADGE[profile.role] ?? ROLE_BADGE.default

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl">
      <PageHeader title="Profil Saya" subtitle="Kelola informasi akun dan pengaturan" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* ── Avatar Card ── */}
        <SectionCard>
          <div className="flex flex-col items-center text-center gap-3 md:gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl md:text-4xl font-bold shadow-lg">
              {profile.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="text-base md:text-lg font-bold text-gray-900 dark:text-white">{profile.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</p>
              {profile.whatsappNumber && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{profile.whatsappNumber}</p>
              )}
            </div>

            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${badge.color}`}>
              {badge.icon} {badge.label}
            </span>

            <div className="w-full pt-3 border-t border-gray-200 dark:border-gray-700 text-left">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">User ID</p>
              <p className="text-[10px] font-mono text-gray-600 dark:text-gray-400 break-all">{profile.id}</p>
            </div>
          </div>
        </SectionCard>

        {/* ── Info + Settings ── */}
        <div className="lg:col-span-2 space-y-4">

          <SectionCard
            title="Informasi Pribadi"
            action={!isEditing ? (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                ✏️ Edit
              </Button>
            ) : undefined}
          >
            {isEditing ? (
              <div className="space-y-3">
                <Input type="text" label="Nama Lengkap" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} fullWidth required />
                <Input type="email" label="Email" value={profile.email} fullWidth disabled />
                <Input type="tel" label="Nomor HP / WhatsApp" value={formData.whatsappNumber}
                  onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="08123456789" fullWidth />
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" onClick={handleSave} fullWidth disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? 'Menyimpan…' : '✅ Simpan'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} fullWidth>Batal</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <InfoRow label="Nama Lengkap" value={profile.name} />
                <InfoRow label="Email" value={profile.email} />
                <InfoRow label="Nomor HP / WhatsApp" value={profile.whatsappNumber || <span className="italic text-gray-400 font-normal text-xs">Belum diisi</span>} />
                <InfoRow label="Role" value={`${badge.icon} ${badge.label}`} />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Pengaturan Akun">
            <div className="space-y-3">
              <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">🔐 Informasi Sesi</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Sesi berlaku selama 7 hari dan akan logout otomatis setelah itu.
                </p>
              </div>

              <div className="p-3 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">🚨 Danger Zone</p>
                <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                  Setelah logout, kamu harus login ulang dengan kredensial kamu.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Yakin ingin logout?')) {
                      localStorage.removeItem('auth_token')
                      localStorage.removeItem('user')
                      router.push('/login')
                    }
                  }}
                >
                  🚪 Logout
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
