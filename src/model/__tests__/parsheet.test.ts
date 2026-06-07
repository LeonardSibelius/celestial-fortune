import { describe, it, expect } from 'vitest';
import { PARSHEET, CASINO_PARSHEET } from '../engine';
import { computeTheoretical } from '../theory';

describe('par sheet integrity', () => {
  it('has the expected shape', () => {
    expect(PARSHEET.layout).toEqual({ reels: 5, rows: 3 });
    expect(PARSHEET.lines).toBe(15);
    expect(PARSHEET.paylines).toHaveLength(15);
    expect(PARSHEET.symbols).toHaveLength(9);
    expect(PARSHEET.reels).toHaveLength(5);
  });

  it('strips are the weighted bag (length = total weight) on every reel', () => {
    const totalWeight = PARSHEET.symbols.reduce((a, s) => a + s.weight, 0);
    expect(totalWeight).toBe(95);
    for (const reel of PARSHEET.reels) {
      expect(reel.strip).toHaveLength(totalWeight);
      for (const s of PARSHEET.symbols) {
        const n = reel.strip.filter((id) => id === s.id).length;
        expect(n).toBe(s.weight);
      }
    }
  });

  it('every payline row index is within the grid', () => {
    for (const line of PARSHEET.paylines) {
      expect(line).toHaveLength(PARSHEET.layout.reels);
      for (const row of line) expect(row).toBeGreaterThanOrEqual(0), expect(row).toBeLessThan(PARSHEET.layout.rows);
    }
  });

  it('embedded theoretical_rtp matches the theory calc (no drift between data and code)', () => {
    const t = computeTheoretical(PARSHEET);
    expect(PARSHEET.theoretical_rtp).toBeCloseTo(t.totalRtp, 6);
  });
});

describe('casino par sheet', () => {
  it('shares the gift structure (same layout/lines/symbols/weights)', () => {
    expect(CASINO_PARSHEET.layout).toEqual({ reels: 5, rows: 3 });
    expect(CASINO_PARSHEET.lines).toBe(15);
    expect(CASINO_PARSHEET.symbols).toHaveLength(9);
    const totalWeight = CASINO_PARSHEET.symbols.reduce((a, s) => a + s.weight, 0);
    expect(totalWeight).toBe(95);
    // weights match gift exactly (so hit/bonus frequencies are preserved)
    for (const s of CASINO_PARSHEET.symbols) {
      const gift = PARSHEET.symbols.find((g) => g.id === s.id);
      expect(s.weight).toBe(gift?.weight);
    }
  });

  it('embedded theoretical_rtp matches the theory calc', () => {
    const t = computeTheoretical(CASINO_PARSHEET);
    expect(CASINO_PARSHEET.theoretical_rtp).toBeCloseTo(t.totalRtp, 6);
  });

  it('is retuned to a balanced 94.5–95.5% RTP', () => {
    expect(CASINO_PARSHEET.theoretical_rtp).toBeGreaterThan(0.945);
    expect(CASINO_PARSHEET.theoretical_rtp).toBeLessThan(0.955);
  });
});
