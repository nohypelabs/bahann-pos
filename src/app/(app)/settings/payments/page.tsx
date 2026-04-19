'use client'

import { useState, useRef } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'

type Tab = 'bank' | 'ewallet' | 'qris'

export default function PaymentSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('bank')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const qrisInputRef = useRef<HTMLInputElement>(null)

  const { data: settings, isLoading, refetch } = trpc.payments.getSettings.useQuery()

  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolder: '' })
  const [ewalletForm, setEwalletForm] = useState({ phone: '' })
  const [qrisForm, setQrisForm] = useState({ imageBase64: '', merchantName: '' })

  // Sync form when settings loaded
  const [synced, setSynced] = useState(false)
  if (settings && !synced) {
    setBankForm({
      bankName: settings.bankTransfer.bankName,
      accountNumber: settings.bankTransfer.accountNumber,
      accountHolder: settings.bankTransfer.accountHolder,
    })
    setEwalletForm({ phone: settings.ewallet.phone })
    setQrisForm({
      imageBase64: settings.qris.imageBase64,
      merchantName: settings.qris.merchantName,
    })
    setSynced(true)
  }

  const updateBank = trpc.payments.updateBankTransfer.useMutation({
    onSuccess: () => { refetch(); flash('success', 'Rekening bank berhasil disimpan') },
    onError: (e) => flash('error', e.message),
  })
  const updateEwallet = trpc.payments.updateEWallet.useMutation({
    onSuccess: () => { refetch(); flash('success', 'Nomor e-wallet berhasil disimpan') },
    onError: (e) => flash('error', e.message),
  })
  const updateQRIS = trpc.payments.updateQRIS.useMutation({
    onSuccess: () => { refetch(); flash('success', 'QRIS berhasil disimpan') },
    onError: (e) => flash('error', e.message),
  })

  function flash(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccessMsg(msg); setErrorMsg('') }
    else { setErrorMsg(msg); setSuccessMsg('') }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg('') }, 3000)
  }

  function handleQRISUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      flash('error', 'Ukuran file maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setQrisForm(f => ({ ...f, imageBase64: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'bank', label: 'Bank Transfer', icon: '🏦' },
    { key: 'ewallet', label: 'E-Wallet', icon: '📲' },
    { key: 'qris', label: 'QRIS', icon: '📱' },
  ]

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Pembayaran</h1>
        <p className="text-gray-500 text-sm mt-1">Atur metode pembayaran yang diterima toko kamu</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
          ❌ {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bank Transfer */}
      {activeTab === 'bank' && (
        <Card>
          <CardHeader>
            <CardTitle>Rekening Bank Transfer</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-500">
              Pelanggan akan diminta transfer ke rekening ini. Kasir konfirmasi secara manual.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
              <Input
                value={bankForm.bankName}
                onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))}
                placeholder="Contoh: BNI, BCA, Mandiri"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
              <Input
                value={bankForm.accountNumber}
                onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                placeholder="Contoh: 1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Atas Nama</label>
              <Input
                value={bankForm.accountHolder}
                onChange={e => setBankForm(f => ({ ...f, accountHolder: e.target.value }))}
                placeholder="Nama pemilik rekening"
              />
            </div>
            <Button
              variant="primary"
              onClick={() => updateBank.mutate(bankForm)}
              disabled={updateBank.isPending || !bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolder}
            >
              {updateBank.isPending ? 'Menyimpan...' : 'Simpan Rekening'}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* E-Wallet */}
      {activeTab === 'ewallet' && (
        <Card>
          <CardHeader>
            <CardTitle>Nomor E-Wallet (GoPay / DANA)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-500">
              Pelanggan akan diminta kirim ke nomor ini via GoPay atau DANA.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP / E-Wallet</label>
              <Input
                value={ewalletForm.phone}
                onChange={e => setEwalletForm({ phone: e.target.value })}
                placeholder="Contoh: 08123456789"
              />
              <p className="text-xs text-gray-400 mt-1">Gunakan nomor yang terdaftar di GoPay dan DANA</p>
            </div>
            <Button
              variant="primary"
              onClick={() => updateEwallet.mutate(ewalletForm)}
              disabled={updateEwallet.isPending || !ewalletForm.phone}
            >
              {updateEwallet.isPending ? 'Menyimpan...' : 'Simpan Nomor'}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* QRIS */}
      {activeTab === 'qris' && (
        <Card>
          <CardHeader>
            <CardTitle>QRIS Statis</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload gambar QRIS dari bank atau e-wallet kamu. Pelanggan scan QR ini untuk bayar.
            </p>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Cara dapat QRIS gratis (perorangan):</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>GoPay Bisnis → Menu "Terima Pembayaran" → Download QR</li>
                <li>DANA Bisnis → Profil → "Kode QR Saya" → Simpan gambar</li>
                <li>BCA / BNI / Mandiri → Menu "Terima" di mobile banking</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Merchant (opsional)</label>
              <Input
                value={qrisForm.merchantName}
                onChange={e => setQrisForm(f => ({ ...f, merchantName: e.target.value }))}
                placeholder="Nama toko (tampil di struk)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Gambar QRIS</label>
              <input
                ref={qrisInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleQRISUpload}
                className="hidden"
              />
              <div className="flex gap-3 items-start">
                <button
                  onClick={() => qrisInputRef.current?.click()}
                  className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  📁 Pilih Gambar (PNG/JPG, maks 2MB)
                </button>
                {qrisForm.imageBase64 && (
                  <button
                    onClick={() => setQrisForm(f => ({ ...f, imageBase64: '' }))}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Preview */}
            {qrisForm.imageBase64 && (
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisForm.imageBase64}
                    alt="Preview QRIS"
                    className="w-64 h-64 object-contain"
                  />
                  <p className="text-center text-xs text-gray-400 mt-2">Preview QRIS</p>
                </div>
              </div>
            )}

            {!qrisForm.imageBase64 && settings?.qris.imageBase64 && (
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.qris.imageBase64}
                    alt="QRIS Tersimpan"
                    className="w-64 h-64 object-contain"
                  />
                  <p className="text-center text-xs text-gray-400 mt-2">QRIS tersimpan saat ini</p>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              onClick={() => updateQRIS.mutate(qrisForm)}
              disabled={updateQRIS.isPending || !qrisForm.imageBase64}
            >
              {updateQRIS.isPending ? 'Menyimpan...' : 'Simpan QRIS'}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
