'use client'

import { forwardRef } from 'react'
import './receipt.css'

export interface ReceiptItem {
  name: string
  sku: string
  quantity: number
  unitPrice: number
  total: number
  /** The normal price, printed when the line was sold below it. */
  listPrice?: number
}

export interface ReceiptData {
  transactionId: string
  date: string
  time: string
  cashier: string
  outlet: {
    name: string
    address: string
    phone: string
    email?: string
  }
  items: ReceiptItem[]
  subtotal: number
  tax?: number
  discount?: number
  total: number
  payment: {
    method: string // 'cash', 'card', 'transfer', etc.
    amount: number
    change: number
  }
  notes?: string
  /** Workshop service note details, printed when the sale paid a note. */
  workshop?: ReceiptWorkshop
}

export interface ReceiptWorkshop {
  plate: string
  vehicle?: string
  mechanic?: string
  odometerKm?: number | null
  member?: { name: string; code: string | null }
  voucherUsed?: { code: string; discount: number }
  stamps?: { balance: number; required: number }
  newVouchers?: string[]
}

interface PrintReceiptProps {
  data: ReceiptData
}

export const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ data }, ref) => {
    return (
      <div ref={ref} className="receipt-container">
        <div className="receipt">
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-logo">
              <h1>Laku POS</h1>
            </div>
            <div className="receipt-outlet-info">
              <h2>{data.outlet.name}</h2>
              {data.outlet.address && <p>{data.outlet.address}</p>}
              {data.outlet.phone && <p>Tel: {data.outlet.phone}</p>}
              {data.outlet.email && <p>Email: {data.outlet.email}</p>}
            </div>
          </div>

          <div className="receipt-divider"></div>

          {/* Transaction Info */}
          <div className="receipt-transaction-info">
            <div className="receipt-row">
              <span className="receipt-label">No. Transaksi:</span>
              <span className="receipt-value">{data.transactionId}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Tanggal:</span>
              <span className="receipt-value">{data.date}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Waktu:</span>
              <span className="receipt-value">{data.time}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Kasir:</span>
              <span className="receipt-value">{data.cashier}</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          {data.workshop && (
            <>
              <div className="receipt-row">
                <span className="receipt-label">Nopol:</span>
                <span className="receipt-value">{data.workshop.plate}{data.workshop.vehicle ? ` · ${data.workshop.vehicle}` : ''}</span>
              </div>
              {data.workshop.mechanic && (
                <div className="receipt-row">
                  <span className="receipt-label">Mekanik:</span>
                  <span className="receipt-value">{data.workshop.mechanic}</span>
                </div>
              )}
              {data.workshop.odometerKm != null && (
                <div className="receipt-row">
                  <span className="receipt-label">Kilometer:</span>
                  <span className="receipt-value">{data.workshop.odometerKm.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="receipt-divider"></div>
            </>
          )}

          {/* Items */}
          <div className="receipt-items">
            <table className="receipt-items-table">
              <thead>
                <tr>
                  <th className="text-left">Item</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Harga</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td className="receipt-item-name">
                      <div>{item.name}</div>
                      <div className="receipt-item-sku">SKU: {item.sku}</div>
                      {item.listPrice !== undefined && item.listPrice > item.unitPrice && (
                        <div className="receipt-item-sku">
                          Normal {formatCurrency(item.listPrice)}, hemat {formatCurrency((item.listPrice - item.unitPrice) * item.quantity)}
                        </div>
                      )}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-right receipt-item-total">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="receipt-divider"></div>

          {/* Totals */}
          <div className="receipt-totals">
            <div className="receipt-row">
              <span className="receipt-label">Subtotal:</span>
              <span className="receipt-value">{formatCurrency(data.subtotal)}</span>
            </div>

            {(data.discount ?? 0) > 0 && (
              <div className="receipt-row">
                <span className="receipt-label">Diskon:</span>
                <span className="receipt-value receipt-discount">
                  -{formatCurrency(data.discount ?? 0)}
                </span>
              </div>
            )}

            {(data.tax ?? 0) > 0 && (
              <div className="receipt-row">
                <span className="receipt-label">PPN (10%):</span>
                <span className="receipt-value">{formatCurrency(data.tax ?? 0)}</span>
              </div>
            )}

            <div className="receipt-divider-bold"></div>

            <div className="receipt-row receipt-total-row">
              <span className="receipt-label">TOTAL:</span>
              <span className="receipt-value">{formatCurrency(data.total)}</span>
            </div>
          </div>

          <div className="receipt-divider"></div>

          {/* Payment */}
          <div className="receipt-payment">
            <div className="receipt-row">
              <span className="receipt-label">Metode Bayar:</span>
              <span className="receipt-value receipt-payment-method">
                {data.payment.method.toUpperCase()}
              </span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Bayar:</span>
              <span className="receipt-value">{formatCurrency(data.payment.amount)}</span>
            </div>
            {data.payment.change > 0 && (
              <div className="receipt-row">
                <span className="receipt-label">Kembalian:</span>
                <span className="receipt-value receipt-change">
                  {formatCurrency(data.payment.change)}
                </span>
              </div>
            )}
          </div>

          {data.workshop?.member && (
            <>
              <div className="receipt-divider"></div>
              <div className="receipt-notes">
                <p>Member {data.workshop.member.code ?? ''} · {data.workshop.member.name}</p>
                {data.workshop.voucherUsed && (
                  <p>Voucher {data.workshop.voucherUsed.code}: -{formatCurrency(data.workshop.voucherUsed.discount)}</p>
                )}
                {data.workshop.stamps && (
                  <p>Kartu servis: {data.workshop.stamps.balance} dari {data.workshop.stamps.required}</p>
                )}
                {data.workshop.newVouchers?.map((code) => (
                  <p key={code}><strong>Selamat! Voucher servis gratis: {code}</strong></p>
                ))}
              </div>
            </>
          )}

          {/* Notes */}
          {data.notes && (
            <>
              <div className="receipt-divider"></div>
              <div className="receipt-notes">
                <p>{data.notes}</p>
              </div>
            </>
          )}

          <div className="receipt-divider"></div>

          {/* Footer */}
          <div className="receipt-footer">
            <p className="receipt-thank-you">Terima Kasih Atas Kunjungan Anda</p>
            <p className="receipt-footer-text">Barang yang sudah dibeli tidak dapat dikembalikan</p>
            <p className="receipt-footer-text">Simpan struk ini sebagai bukti pembayaran</p>
          </div>
        </div>
      </div>
    )
  }
)

PrintReceipt.displayName = 'PrintReceipt'

/**
 * Format number to Indonesian currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}
