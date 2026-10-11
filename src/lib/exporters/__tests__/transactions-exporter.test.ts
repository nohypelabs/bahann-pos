import {
  exportTransactionsCSV,
  exportTransactionsPDF,
  type ExportLabels,
  type ExportTransaction,
} from '@/lib/exporters/transactions-exporter';

const save = jest.fn();
const autoTable = jest.fn();
const text = jest.fn();

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    text,
    save,
  })),
}));
jest.mock('jspdf-autotable', () => ({ autoTable: (...args: unknown[]) => autoTable(...args) }));

// jsdom's Blob has no text()
function readBlob(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

const labels: ExportLabels = {
  title: 'Laporan Transaksi',
  filterSummary: 'Semua transaksi',
  generatedAt: 'Dibuat',
  totalRevenue: 'Pendapatan',
  count: 'Jumlah',
  columns: {
    id: 'ID', date: 'Tanggal', outlet: 'Outlet', cashier: 'Kasir', items: 'Item',
    subtotal: 'Subtotal', discount: 'Diskon', tax: 'Pajak', total: 'Total',
    payment: 'Pembayaran', status: 'Status',
  },
};

function makeTx(overrides: Partial<ExportTransaction> = {}): ExportTransaction {
  return {
    transactionId: 'TRX-001',
    createdAt: '2026-10-11T03:00:00Z',
    status: 'completed',
    paymentMethod: 'cash',
    subtotal: 50000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 50000,
    outlet: { name: 'Outlet Utama' },
    cashier: { name: 'Kasir 1' },
    items: [{ productName: 'Kopi', quantity: 2 }],
    ...overrides,
  };
}

describe('transactions exporter', () => {
  let blobs: Blob[];
  let downloads: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    blobs = [];
    downloads = [];
    global.URL.createObjectURL = jest.fn((blob: Blob) => { blobs.push(blob); return 'blob:x'; });
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
  });

  it('writes a UTF-8 CSV with a header row and escapes commas and quotes', async () => {
    exportTransactionsCSV(
      [makeTx({ items: [{ productName: 'Nasi "Spesial", Pedas', quantity: 1 }] })],
      labels,
    );

    expect(downloads[0]).toMatch(/^transaksi-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readBlob(blobs[0]);
    const [header, row] = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(header).toBe('ID,Tanggal,Outlet,Kasir,Item,Subtotal,Diskon,Pajak,Total,Pembayaran,Status');
    expect(row).toContain('"Nasi ""Spesial"", Pedas x1"');
    expect(row.endsWith(',50000,cash,completed')).toBe(true);
  });

  it('builds a PDF table and only counts completed transactions as revenue', async () => {
    await exportTransactionsPDF(
      [makeTx(), makeTx({ transactionId: 'TRX-002', status: 'voided', totalAmount: 99000 })],
      labels,
    );

    const body = autoTable.mock.calls[0][1].body;
    expect(body).toHaveLength(2);
    expect(body[1][0]).toBe('TRX-002');
    const summary = text.mock.calls.map(c => c[0]).find((s: string) => s.startsWith('Jumlah'));
    expect(summary).toContain('Jumlah: 2');
    expect(summary).toMatch(/Pendapatan: Rp\s?50\.000/);
    expect(save).toHaveBeenCalledWith(expect.stringMatching(/^transaksi-.*\.pdf$/));
  });
});
