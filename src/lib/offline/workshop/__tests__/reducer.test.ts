import { applyOps, lineTotal, type StationLookups } from '@/lib/offline/workshop/reducer';
import type { OfflineOp } from '@/shared/schemas/workshopOffline';
import type { WsNote } from '@/lib/offline/database';

const AT = '2026-11-25T03:00:00.000Z';
const OUTLET = '00000000-0000-4000-8000-000000000001';
const NOTE = '00000000-0000-4000-8000-0000000000a1';
const SERVICE = '00000000-0000-4000-8000-0000000000b1';
const PLUG = '00000000-0000-4000-8000-0000000000b2';
const MEMBER = '00000000-0000-4000-8000-0000000000c1';
const MECH = '00000000-0000-4000-8000-0000000000d1';

const lookups: StationLookups = {
  products: new Map([
    [SERVICE, { id: SERVICE, name: 'Jasa Servis', sku: 'JASA', barcode: null, category: 'Jasa', price: 50_000, itemType: 'SERVICE', stockBehavior: 'UNTRACKED' }],
    [PLUG, { id: PLUG, name: 'Busi', sku: 'BUSI', barcode: '2000000000015', category: 'Part', price: 25_000, itemType: 'PRODUCT', stockBehavior: 'TRACKED' }],
  ]),
  customers: new Map([[MEMBER, { id: MEMBER, name: 'Andi', phone: null, isMember: true, memberCode: 'M0001' }]]),
  vehicles: new Map([['B1234UJI', { id: 'veh-1', plateNumber: 'B1234UJI', brand: 'Honda', model: 'Beat', customerId: MEMBER }]]),
  mechanics: new Map([[MECH, { id: MECH, name: 'Ujang' }]]),
};

let n = 0;
const op = <K extends OfflineOp['kind']>(kind: K, body: Omit<Extract<OfflineOp, { kind: K }>, 'kind' | 'opId' | 'at'>) =>
  ({ kind, opId: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, at: AT, ...body }) as unknown as OfflineOp;

const open = (plate: string, extra: Record<string, unknown> = {}) =>
  op('note.open', { note: { id: NOTE, outletId: OUTLET, plate, ...extra } } as never);

describe('workshop station reducer', () => {
  it('opens a note for a known plate with its owner', () => {
    const [note] = applyOps([], [open('b 1234 uji', { mechanicId: MECH })], lookups);
    expect(note.vehicle).toMatchObject({ id: 'veh-1', plateNumber: 'B1234UJI', customerId: MEMBER });
    expect(note.customer).toMatchObject({ name: 'Andi', memberCode: 'M0001' });
    expect(note.mechanic?.name).toBe('Ujang');
    expect(note.status).toBe('open');
  });

  it('opens a note for a new plate and a customer created on the station', () => {
    const cust = '00000000-0000-4000-8000-0000000000c2';
    const [note] = applyOps([], [
      op('customer.create', { customer: { id: cust, name: 'Budi', phone: '0812', member: true } }),
      open('F 9 X', { brand: 'Yamaha', customerId: cust }),
    ], lookups);
    expect(note.vehicle).toMatchObject({ id: null, plateNumber: 'F9X', brand: 'Yamaha', customerId: cust });
    expect(note.customer).toMatchObject({ name: 'Budi', isMember: true, memberCode: null });
  });

  it('adds, changes and removes items; quantities are absolute', () => {
    const notes = applyOps([], [
      open('B1234UJI'),
      op('note.setItem', { noteId: NOTE, productId: SERVICE, quantity: 1, unitPrice: 60_000 }),
      op('note.setItem', { noteId: NOTE, productId: PLUG, quantity: 1, unitPrice: null }),
      op('note.setItem', { noteId: NOTE, productId: PLUG, quantity: 2, unitPrice: null }),
    ], lookups);
    expect(notes[0].items.map((i) => [i.productSku, i.quantity])).toEqual([['JASA', 1], ['BUSI', 2]]);
    expect(lineTotal(notes[0])).toBe(110_000);

    const removed = applyOps(notes, [op('note.setItem', { noteId: NOTE, productId: PLUG, quantity: 0, unitPrice: null })], lookups);
    expect(removed[0].items).toHaveLength(1);
    expect(notes[0].items).toHaveLength(2); // inputs untouched
  });

  it('marks a cash payment with what was charged and the change', () => {
    const [note] = applyOps([], [
      open('B1234UJI'),
      op('note.setItem', { noteId: NOTE, productId: PLUG, quantity: 2, unitPrice: null }),
      op('note.payCash', {
        noteId: NOTE, outletId: OUTLET, shiftId: OUTLET, transactionNumber: 'TRX-1', amountPaid: 60_000,
        lines: [{ productId: PLUG, quantity: 2, unitPrice: 25_000 }], total: 50_000,
      }),
      // Anything after the payment does not change a paid note.
      op('note.setItem', { noteId: NOTE, productId: SERVICE, quantity: 1, unitPrice: null }),
    ], lookups);
    expect(note.status).toBe('paid');
    expect(note.paid).toMatchObject({ transactionNumber: 'TRX-1', total: 50_000, change: 10_000 });
    expect(note.items).toHaveLength(1);
    expect(note.items[0].unitPrice).toBe(25_000);
  });

  it('replays on top of the server copy without duplicating an opened note', () => {
    const server: WsNote = {
      id: NOTE, outletId: OUTLET, status: 'open', vehicle: { id: 'veh-1', plateNumber: 'B1234UJI', brand: null, model: null, customerId: null },
      customer: null, mechanic: null, complaint: null, odometerKm: null, openedAt: AT,
      items: [{ productId: PLUG, productName: 'Busi', productSku: 'BUSI', itemType: 'PRODUCT', quantity: 3, unitPrice: null, listPrice: 25_000 }],
    };
    const notes = applyOps([server], [open('B1234UJI'), op('note.cancel', { noteId: NOTE, reason: 'batal' })], lookups);
    expect(notes).toHaveLength(1);
    expect(notes[0].items[0].quantity).toBe(3);
    expect(notes[0]).toMatchObject({ status: 'cancelled', cancelReason: 'batal' });
  });

  it('ignores operations on notes it does not have', () => {
    expect(applyOps([], [op('note.setItem', { noteId: NOTE, productId: PLUG, quantity: 1, unitPrice: null })], lookups)).toEqual([]);
  });
});
