'use client'

import { useRef, useEffect } from 'react'
import { PrintReceipt, ReceiptData } from './PrintReceipt'
import { Button } from '@/components/ui/Button'
import { printHtmlDocument } from '@/lib/print/printHtmlDocument'

interface PrintPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  receiptData: ReceiptData
}

export function PrintPreviewModal({ isOpen, onClose, receiptData }: PrintPreviewModalProps) {
  const componentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Handle ESC key to close modal
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const handlePrint = async () => {
    if (!componentRef.current) return

    const didPrint = await printHtmlDocument({
      title: 'Struk Pembayaran',
      bodyHtml: componentRef.current.outerHTML,
    })

    if (!didPrint) {
      alert('Gagal menyiapkan print. Coba ulangi beberapa saat lagi.')
    }
  }

  if (!isOpen) return null

  // Tailwind rather than styled-jsx: the styled-jsx scoping was never applied, so
  // the preview used to render inline in the page instead of as a dialog.
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-preview-title"
        className="flex max-h-[90vh] w-full max-w-[500px] flex-col rounded-3xl border-[3px] border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-gray-200 px-6 pb-4 pt-6">
          <h2 id="print-preview-title" className="m-0 text-2xl font-bold text-gray-900">Preview Struk</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-gray-100 text-2xl text-gray-500 transition hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="receipt-preview-wrapper rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 shadow-inner">
            <PrintReceipt ref={componentRef} data={receiptData} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t-2 border-gray-200 px-6 pb-6 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            🖨️ Print Struk
          </Button>
        </div>
      </div>
    </div>
  )
}
