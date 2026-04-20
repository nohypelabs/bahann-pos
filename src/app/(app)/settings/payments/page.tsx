'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'

type Section = 'bank' | 'ewallet' | 'qris' | null

export default function PaymentSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const qrisInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { data: settings, isLoading, refetch } = trpc.payments.getSettings.useQuery()

  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolder: '', isActive: true })
  const [ewalletForm, setEwalletForm] = useState({ phone: '', isActive: true })
  const [qrisForm, setQrisForm] = useState({ imageBase64: '', merchantName: '', isActive: true })

  useEffect(() => {
    if (!settings) return
    setBankForm({
      bankName: settings.bankTransfer.bankName,
      accountNumber: settings.bankTransfer.accountNumber,
      accountHolder: settings.bankTransfer.accountHolder,
      isActive: settings.bankTransfer.isActive,
    })
    setEwalletForm({ phone: settings.ewallet.phone, isActive: settings.ewallet.isActive })
    setQrisForm({
      imageBase64: settings.qris.imageBase64,
      merchantName: settings.qris.merchantName,
      isActive: settings.qris.isActive,
    })
  }, [settings])

  const flash = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const updateBank = trpc.payments.updateBankTransfer.useMutation({
    onSuccess: () => { refetch(); setActiveSection(null); flash('success', 'Rekening bank disimpan') },
    onError: (e) => flash('error', e.message),
  })
  const updateEwallet = trpc.payments.updateEWallet.useMutation({
    onSuccess: () => { refetch(); setActiveSection(null); flash('success', 'Nomor e-wallet disimpan') },
    onError: (e) => flash('error', e.message),
  })
  const updateQRIS = trpc.payments.updateQRIS.useMutation({
    onSuccess: () => { refetch(); setActiveSection(null); flash('success', 'QRIS disimpan') },
    onError: (e) => flash('error', e.message),
  })

  function handleQRISFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { flash('error', 'Ukuran file maksimal 2MB'); return }
    const reader = new FileReader()
    reader.onload = () => setQrisForm(f => ({ ...f, imageBase64: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleQRISFile(file)
  }

  const bankConfigured = !!(settings?.bankTransfer.accountNumber)
  const ewalletConfigured = !!(settings?.ewallet.phone)
  const qrisConfigured = !!(settings?.qris.imageBase64)

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 max-w-2xl mx-auto space-y-2 md:space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto space-y-3 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-base md:text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Pembayaran</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Atur metode pembayaran yang diterima toko kamu</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border font-medium text-sm transition-all ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400'
        }`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Bank Transfer ── */}
      <PaymentCard
        icon="🏦"
        title="Bank Transfer"
        subtitle={bankConfigured ? `${settings!.bankTransfer.bankName} · ${maskAccount(settings!.bankTransfer.accountNumber)}` : 'Belum dikonfigurasi'}
        configured={bankConfigured}
        isOpen={activeSection === 'bank'}
        onToggle={() => setActiveSection(s => s === 'bank' ? null : 'bank')}
      >
        <div className="space-y-2 md:space-y-4 pt-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pelanggan transfer manual ke rekening ini — kasir konfirmasi.</p>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Nama Bank">
              <Input value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} placeholder="BNI, BCA, Mandiri, dll" />
            </Field>
            <Field label="Nomor Rekening">
              <Input value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="1234567890" />
            </Field>
            <Field label="Atas Nama">
              <Input value={bankForm.accountHolder} onChange={e => setBankForm(f => ({ ...f, accountHolder: e.target.value }))} placeholder="Nama pemilik rekening" />
            </Field>
          </div>

          {/* Live preview */}
          {(bankForm.bankName || bankForm.accountNumber || bankForm.accountHolder) && (
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <p className="text-xs opacity-70 mb-3">Preview tampilan pelanggan</p>
              <div className="space-y-2">
                <div><p className="text-xs opacity-70">Nama Bank</p><p className="font-bold">{bankForm.bankName || '—'}</p></div>
                <div><p className="text-xs opacity-70">Nomor Rekening</p><p className="font-mono font-bold tracking-wider">{bankForm.accountNumber || '—'}</p></div>
                <div><p className="text-xs opacity-70">Atas Nama</p><p className="font-semibold">{bankForm.accountHolder || '—'}</p></div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="primary" onClick={() => updateBank.mutate(bankForm)} disabled={updateBank.isPending || !bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder}>
              {updateBank.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="secondary" onClick={() => setActiveSection(null)}>Batal</Button>
          </div>
        </div>
      </PaymentCard>

      {/* ── E-Wallet ── */}
      <PaymentCard
        icon="📲"
        title="E-Wallet (GoPay / DANA)"
        subtitle={ewalletConfigured ? `Nomor: ${settings!.ewallet.phone}` : 'Belum dikonfigurasi'}
        configured={ewalletConfigured}
        isOpen={activeSection === 'ewallet'}
        onToggle={() => setActiveSection(s => s === 'ewallet' ? null : 'ewallet')}
      >
        <div className="space-y-2 md:space-y-4 pt-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pelanggan kirim via GoPay atau DANA ke nomor ini.</p>

          <Field label="Nomor HP / E-Wallet">
            <Input value={ewalletForm.phone} onChange={e => setEwalletForm(f => ({ ...f, phone: e.target.value }))} placeholder="08123456789" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Gunakan nomor yang terdaftar di GoPay dan DANA</p>
          </Field>

          {/* Live preview */}
          {ewalletForm.phone && (
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <p className="text-xs opacity-70 mb-3">Preview tampilan pelanggan</p>
              <div className="flex gap-2 md:gap-4">
                <div className="flex-1"><p className="text-xs opacity-70">GoPay</p><p className="font-mono font-bold">{ewalletForm.phone}</p></div>
                <div className="flex-1"><p className="text-xs opacity-70">DANA</p><p className="font-mono font-bold">{ewalletForm.phone}</p></div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="primary" onClick={() => updateEwallet.mutate(ewalletForm)} disabled={updateEwallet.isPending || !ewalletForm.phone}>
              {updateEwallet.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="secondary" onClick={() => setActiveSection(null)}>Batal</Button>
          </div>
        </div>
      </PaymentCard>

      {/* ── QRIS ── */}
      <PaymentCard
        icon="📱"
        title="QRIS Statis"
        subtitle={qrisConfigured ? `Merchant: ${settings!.qris.merchantName || 'Toko'}` : 'Belum dikonfigurasi'}
        configured={qrisConfigured}
        isOpen={activeSection === 'qris'}
        onToggle={() => setActiveSection(s => s === 'qris' ? null : 'qris')}
      >
        <div className="space-y-2 md:space-y-4 pt-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">Cara dapat QRIS gratis:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
              <li>GoPay Bisnis → "Terima Pembayaran" → Download QR</li>
              <li>DANA Bisnis → Profil → "Kode QR Saya" → Simpan</li>
              <li>Mobile banking BCA/BNI/Mandiri → Menu "Terima"</li>
            </ul>
          </div>

          <Field label="Nama Merchant (opsional)">
            <Input value={qrisForm.merchantName} onChange={e => setQrisForm(f => ({ ...f, merchantName: e.target.value }))} placeholder="Nama toko (tampil di struk)" />
          </Field>

          {/* Drag & drop upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gambar QRIS</label>
            <input ref={qrisInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={e => { const f = e.target.files?.[0]; if (f) handleQRISFile(f) }} className="hidden" />
            <div
              ref={dragRef}
              onClick={() => qrisInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-2 p-3 md:p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <span className="text-xs md:text-lg md:text-3xl">📁</span>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Klik atau drag gambar ke sini</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">PNG / JPG · Maks 2MB</p>
            </div>
          </div>

          {/* Preview */}
          {(qrisForm.imageBase64 || (!qrisForm.imageBase64 && settings?.qris.imageBase64)) && (
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisForm.imageBase64 || settings?.qris.imageBase64}
                  alt="Preview QRIS"
                  className="w-56 h-56 object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">{qrisForm.imageBase64 ? 'Gambar baru (belum disimpan)' : 'QRIS tersimpan'}</span>
                {qrisForm.imageBase64 && (
                  <button onClick={() => setQrisForm(f => ({ ...f, imageBase64: '' }))} className="text-xs text-red-500 hover:text-red-700">
                    Hapus
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="primary" onClick={() => updateQRIS.mutate(qrisForm)} disabled={updateQRIS.isPending || !qrisForm.imageBase64}>
              {updateQRIS.isPending ? 'Menyimpan...' : 'Simpan QRIS'}
            </Button>
            <Button variant="secondary" onClick={() => setActiveSection(null)}>Batal</Button>
          </div>
        </div>
      </PaymentCard>
    </div>
  )
}

function PaymentCard({
  icon, title, subtitle, configured, isOpen, onToggle, children
}: {
  icon: string
  title: string
  subtitle: string
  configured: boolean
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`border-2 rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-blue-200 dark:border-blue-700 shadow-md' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 md:gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base md:text-2xl shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            configured
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }`}>
            {configured ? '✓ Aktif' : 'Belum diisi'}
          </span>
          <span className={`text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  )
}

function maskAccount(num: string) {
  if (!num || num.length < 5) return num
  return num.slice(0, 3) + '·'.repeat(num.length - 5) + num.slice(-2)
}
