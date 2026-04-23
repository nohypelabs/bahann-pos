'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScanBarcode } from 'lucide-react'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'

export function MobileScanFab() {
  const router = useRouter()
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleScan = (barcode: string) => {
    setScannerOpen(false)
    router.push(`/pos/sales?scan=${encodeURIComponent(barcode)}`)
  }

  return (
    <>
      <button
        onClick={() => setScannerOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all"
        aria-label="Scan barcode"
      >
        <ScanBarcode className="w-6 h-6" />
      </button>

      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  )
}
