'use client'

import { forwardRef } from 'react'

export interface ReceiptItem {
  name: string
  sku: string
  quantity: number
  unitPrice: number
  total: number
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

            {data.discount && data.discount > 0 && (
              <div className="receipt-row">
                <span className="receipt-label">Diskon:</span>
                <span className="receipt-value receipt-discount">
                  -{formatCurrency(data.discount)}
                </span>
              </div>
            )}

            {data.tax && data.tax > 0 && (
              <div className="receipt-row">
                <span className="receipt-label">PPN (10%):</span>
                <span className="receipt-value">{formatCurrency(data.tax)}</span>
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
            <div className="receipt-barcode">
              <div className="receipt-barcode-lines">
                {/* Simple barcode representation */}
                <span>||||</span>
                <span>||</span>
                <span>||||</span>
                <span>||</span>
                <span>||||</span>
                <span>||</span>
                <span>||||</span>
              </div>
              <div className="receipt-barcode-text">{data.transactionId}</div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .receipt-container {
            background: white;
            padding: 20px;
            max-width: 80mm;
            margin: 0 auto;
          }

          .receipt {
            font-family: 'Courier New', monospace;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
          }

          .receipt-header {
            text-align: center;
            margin-bottom: 10px;
          }

          .receipt-logo h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            letter-spacing: 2px;
          }

          .receipt-outlet-info {
            margin-top: 8px;
          }

          .receipt-outlet-info h2 {
            font-size: 16px;
            font-weight: bold;
            margin: 4px 0;
          }

          .receipt-outlet-info p {
            margin: 2px 0;
            font-size: 11px;
          }

          .receipt-divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }

          .receipt-divider-bold {
            border-top: 2px solid #000;
            margin: 8px 0;
          }

          .receipt-transaction-info {
            margin: 10px 0;
          }

          .receipt-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }

          .receipt-label {
            font-weight: normal;
          }

          .receipt-value {
            font-weight: bold;
            text-align: right;
          }

          .receipt-items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }

          .receipt-items-table th {
            font-weight: bold;
            padding: 4px 2px;
            border-bottom: 1px solid #000;
            font-size: 11px;
          }

          .receipt-items-table td {
            padding: 6px 2px;
            border-bottom: 1px dotted #ccc;
            font-size: 11px;
          }

          .receipt-item-name {
            max-width: 120px;
          }

          .receipt-item-sku {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
          }

          .receipt-item-total {
            font-weight: bold;
          }

          .text-left {
            text-align: left;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          .receipt-totals {
            margin: 10px 0;
          }

          .receipt-total-row {
            font-size: 14px;
            font-weight: bold;
          }

          .receipt-discount {
            color: #d00;
          }

          .receipt-change {
            font-size: 13px;
            color: #080;
          }

          .receipt-payment {
            margin: 10px 0;
          }

          .receipt-payment-method {
            text-transform: uppercase;
            font-weight: bold;
          }

          .receipt-notes {
            margin: 10px 0;
            padding: 8px;
            background: #f5f5f5;
            border: 1px dashed #999;
            font-size: 10px;
            text-align: center;
          }

          .receipt-footer {
            text-align: center;
            margin-top: 15px;
          }

          .receipt-thank-you {
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
            text-transform: uppercase;
          }

          .receipt-footer-text {
            font-size: 9px;
            margin: 4px 0;
            color: #666;
          }

          .receipt-barcode {
            margin-top: 15px;
          }

          .receipt-barcode-lines {
            display: flex;
            justify-content: center;
            gap: 2px;
            font-size: 20px;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }

          .receipt-barcode-text {
            font-size: 10px;
            color: #666;
          }

          /* Print Styles */
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }

            body {
              margin: 0 !important;
              padding: 0 !important;
            }

            .receipt-container {
              padding: 0 !important;
              max-width: 80mm !important;
              width: 80mm !important;
              margin: 0 !important;
              background: white !important;
              position: absolute;
              left: 0;
              top: 0;
            }

            .receipt {
              font-size: 11px;
              background: white !important;
            }

            .receipt-divider,
            .receipt-divider-bold {
              page-break-inside: avoid;
            }

            .receipt-items-table tr {
              page-break-inside: avoid;
            }

            .receipt-notes {
              background: white !important;
              border-color: #000 !important;
            }
          }
        `}</style>
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
