'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { QRCodeSVG } from 'qrcode.react'
import {
  Save, Wallet, Building2, MessageCircle, QrCode, CheckCircle, Loader2,
} from 'lucide-react'

function SettingField({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      />
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const u = JSON.parse(user)
        if (u.role !== 'super_admin') { router.push('/dashboard'); return }
        setUserRole(u.role)
      } catch { router.push('/dashboard') }
    }
  }, [router])

  const { data: settings, isLoading } = trpc.superAdmin.getSettings.useQuery(undefined, {
    enabled: userRole === 'super_admin',
  })

  const updateMutation = trpc.superAdmin.updateSettings.useMutation()

  const [form, setForm] = useState({
    solana_wallet_address: '',
    solana_rpc_url: '',
    bank_name: '',
    bank_account: '',
    bank_holder: '',
    support_wa: '',
    qris_image_url: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        solana_wallet_address: settings.solana_wallet_address || '',
        solana_rpc_url: settings.solana_rpc_url || '',
        bank_name: settings.bank_name || '',
        bank_account: settings.bank_account || '',
        bank_holder: settings.bank_holder || '',
        support_wa: settings.support_wa || '',
        qris_image_url: settings.qris_image_url || '',
      })
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* shown via mutation state */ }
  }

  if (userRole !== 'super_admin') return null

  if (isLoading) return <p className="text-center py-16 text-gray-400 text-sm">Memuat pengaturan...</p>

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Platform</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Konfigurasi pembayaran dan informasi platform</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Crypto / Solana */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-purple-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Solana (Crypto Payment)</h2>
          </div>

          <SettingField
            label="Wallet Address (SOL)"
            value={form.solana_wallet_address}
            onChange={v => setForm(f => ({ ...f, solana_wallet_address: v }))}
            placeholder="Contoh: 7xKX..."
            hint="Wallet untuk menerima pembayaran USDC/USDT di Solana"
          />

          <SettingField
            label="RPC URL"
            value={form.solana_rpc_url}
            onChange={v => setForm(f => ({ ...f, solana_rpc_url: v }))}
            placeholder="https://mainnet.helius-rpc.com/?api-key=..."
            hint="Kosongkan untuk pakai default atau env var"
          />

          {/* QR Code preview */}
          {form.solana_wallet_address && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">QR Wallet Address</p>
              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-600 inline-block">
                  <QRCodeSVG
                    value={`solana:${form.solana_wallet_address}`}
                    size={140}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Address:</p>
                  <code className="text-xs bg-gray-50 dark:bg-gray-900 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 break-all font-mono block">
                    {form.solana_wallet_address}
                  </code>
                  <p className="text-[11px] text-gray-400 mt-2">
                    QR ini bisa di-scan dari wallet Solana (Phantom, Solflare, dll)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bank Transfer */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Transfer Bank</h2>
          </div>

          <SettingField
            label="Nama Bank"
            value={form.bank_name}
            onChange={v => setForm(f => ({ ...f, bank_name: v }))}
            placeholder="BCA, BNI, Mandiri, Jago..."
          />

          <SettingField
            label="Nomor Rekening"
            value={form.bank_account}
            onChange={v => setForm(f => ({ ...f, bank_account: v }))}
            placeholder="1234567890"
          />

          <SettingField
            label="Atas Nama"
            value={form.bank_holder}
            onChange={v => setForm(f => ({ ...f, bank_holder: v }))}
            placeholder="Nama pemilik rekening"
          />
        </div>

        {/* QRIS */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-5 h-5 text-green-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">QRIS</h2>
          </div>

          <SettingField
            label="URL Gambar QRIS"
            value={form.qris_image_url}
            onChange={v => setForm(f => ({ ...f, qris_image_url: v }))}
            placeholder="https://..."
            hint="Upload gambar QRIS ke storage dan paste URL-nya di sini"
          />

          {form.qris_image_url && (
            <div className="pt-1">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview QRIS</p>
              <img src={form.qris_image_url} alt="QRIS" className="w-40 h-40 object-contain bg-white rounded-xl border border-gray-200 dark:border-gray-600 p-2" />
            </div>
          )}
        </div>

        {/* Support */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Support</h2>
          </div>

          <SettingField
            label="Nomor WhatsApp"
            value={form.support_wa}
            onChange={v => setForm(f => ({ ...f, support_wa: v }))}
            placeholder="628123456789"
            hint="Format internasional tanpa + (contoh: 628123456789)"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm">
          {updateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" /> Tersimpan!</>
          ) : (
            <><Save className="w-4 h-4" /> Simpan Pengaturan</>
          )}
        </button>

        {updateMutation.error && (
          <p className="text-xs text-red-500">{updateMutation.error.message}</p>
        )}
      </div>
    </div>
  )
}
