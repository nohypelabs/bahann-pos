/**
 * Transactions Exporter (Lazy Loaded)
 * CSV and PDF export for the transactions page - only loaded when needed
 */

import { formatCurrency } from '@/lib/utils'
import { businessDate } from '@/lib/business/timezone'

export interface ExportTransaction {
  transactionId: string
  createdAt: string | Date
  status: string
  paymentMethod: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  outlet?: { name: string }
  cashier?: { name: string }
  items: { productName: string; quantity: number }[]
}

export interface ExportLabels {
  title: string
  columns: {
    id: string
    date: string
    outlet: string
    cashier: string
    items: string
    subtotal: string
    discount: string
    tax: string
    total: string
    payment: string
    status: string
  }
  /** Human-readable description of the active filters, e.g. "Status: Completed" */
  filterSummary: string
  generatedAt: string
  totalRevenue: string
  count: string
}

function formatFullDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function itemsSummary(tx: ExportTransaction): string {
  return tx.items.map(i => `${i.productName} x${i.quantity}`).join(', ')
}

function fileStamp(): string {
  return businessDate()
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportTransactionsCSV(transactions: ExportTransaction[], labels: ExportLabels) {
  const c = labels.columns
  const header = [c.id, c.date, c.outlet, c.cashier, c.items, c.subtotal, c.discount, c.tax, c.total, c.payment, c.status]
  const rows = transactions.map(tx => [
    tx.transactionId,
    formatFullDateTime(tx.createdAt),
    tx.outlet?.name ?? '',
    tx.cashier?.name ?? '',
    itemsSummary(tx),
    tx.subtotal,
    tx.discountAmount,
    tx.taxAmount,
    tx.totalAmount,
    tx.paymentMethod,
    tx.status,
  ])
  const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
  // BOM so Excel opens UTF-8 (product names, "Rp") correctly
  download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `transaksi-${fileStamp()}.csv`)
}

export async function exportTransactionsPDF(transactions: ExportTransaction[], labels: ExportLabels) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const c = labels.columns

  const revenue = transactions
    .filter(tx => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.totalAmount, 0)

  doc.setFontSize(16)
  doc.text(labels.title, 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`${labels.generatedAt}: ${formatFullDateTime(new Date())}`, 14, 21)
  doc.text(labels.filterSummary, 14, 26)
  doc.text(`${labels.count}: ${transactions.length}   ·   ${labels.totalRevenue}: ${formatCurrency(revenue)}`, 14, 31)

  autoTable(doc, {
    startY: 36,
    head: [[c.id, c.date, c.outlet, c.cashier, c.items, c.discount, c.total, c.payment, c.status]],
    body: transactions.map(tx => [
      tx.transactionId,
      formatFullDateTime(tx.createdAt),
      tx.outlet?.name ?? '-',
      tx.cashier?.name ?? '-',
      itemsSummary(tx),
      tx.discountAmount > 0 ? formatCurrency(tx.discountAmount) : '-',
      formatCurrency(tx.totalAmount),
      tx.paymentMethod,
      tx.status.toUpperCase(),
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 95, 85] },
    columnStyles: {
      0: { cellWidth: 34 },
      4: { cellWidth: 70 },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  })

  doc.save(`transaksi-${fileStamp()}.pdf`)
}
