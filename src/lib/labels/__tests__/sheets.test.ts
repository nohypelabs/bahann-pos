import { LABEL_SHEETS, placeLabels, sheetFits } from '@/lib/labels/sheets';

const sheet = (id: string) => LABEL_SHEETS.find((s) => s.id === id)!;

describe('label sheets', () => {
  it('every preset fits on A4', () => {
    for (const s of LABEL_SHEETS) expect(sheetFits(s)).toBe(true);
  });

  it('refuses a grid larger than A4', () => {
    expect(sheetFits({ ...sheet('a4-3x8'), columns: 4 })).toBe(false);
  });

  it('places labels row by row with gaps and margins', () => {
    const placed = placeLabels(['a', 'b', 'c', 'd'], sheet('a4-3x7'));
    expect(placed.map((p) => [p.x, p.y])).toEqual([
      [7.2, 15.15], [7.2 + 66, 15.15], [7.2 + 132, 15.15], [7.2, 15.15 + 38.1],
    ]);
  });

  it('starts after skipped positions and continues on a new page', () => {
    const s = sheet('a4-3x8'); // 24 per page
    const placed = placeLabels(Array.from({ length: 5 }, (_, i) => i), s, 22);
    expect(placed.map((p) => p.page)).toEqual([0, 0, 1, 1, 1]);
    expect(placed[0]).toMatchObject({ x: 70, y: 0.5 + 7 * 37 }); // position 23 of 24: row 8, column 2
    expect(placed[2]).toMatchObject({ x: 0, y: 0.5 }); // first position of page 2
  });
});
