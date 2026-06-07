import { describe, it, expect } from 'vitest';
import { PARSHEET } from '../engine';
import { SlotEngine } from '../engine';
import { Rng } from '../rng';
import { makeContext, evaluateLine } from '../lines';

const ctx = makeContext(PARSHEET);
// RNG is unused by evaluateGrid; any seed is fine.
const engine = new SlotEngine(new Rng(1), PARSHEET);

/** Build a 5×3 grid (grid[reel][row]) filled with one symbol, then patch cells. */
function gridOf(fill: string, patches: Array<[number, number, string]> = []): string[][] {
  const g = Array.from({ length: 5 }, () => [fill, fill, fill]);
  for (const [reel, row, sym] of patches) g[reel][row] = sym;
  return g;
}

describe('evaluateLine — left-to-right matching', () => {
  it('pays a plain 3 of a kind', () => {
    expect(evaluateLine(['star', 'star', 'star', 'moon', 'moon'], ctx)).toMatchObject({
      symbol: 'star',
      count: 3,
      payValue: 5,
    });
  });

  it('pays 4 and 5 of a kind from the right tiers', () => {
    expect(evaluateLine(['star', 'star', 'star', 'star', 'moon'], ctx).payValue).toBe(15);
    expect(evaluateLine(['star', 'star', 'star', 'star', 'star'], ctx).payValue).toBe(30);
  });

  it('does not pay 2 of a kind', () => {
    expect(evaluateLine(['star', 'star', 'moon', 'galaxy', 'crown'], ctx).payValue).toBe(0);
  });

  it('lets a wild substitute mid-run', () => {
    // star, wild, star -> three stars
    expect(evaluateLine(['star', 'wild', 'star', 'moon', 'moon'], ctx)).toMatchObject({
      symbol: 'star',
      count: 3,
      payValue: 5,
    });
  });

  it('greedy quirk: leading wilds pay the BASE symbol table, not wild', () => {
    // Faithful to the prototype: wild,wild,star,star,star -> 5x star (30), NOT 3x wild (100).
    expect(evaluateLine(['wild', 'wild', 'star', 'star', 'star'], ctx)).toMatchObject({
      symbol: 'star',
      count: 5,
      payValue: 30,
    });
  });

  it('an all-wild line pays the wild table', () => {
    expect(evaluateLine(['wild', 'wild', 'wild', 'wild', 'wild'], ctx)).toMatchObject({
      symbol: 'wild',
      count: 5,
      payValue: 1000,
    });
  });

  it('leading wilds then a break resolve to wild', () => {
    // wild,wild,wild,scatter,star -> run stops at scatter, 3 wilds -> wild 3oak = 100
    expect(evaluateLine(['wild', 'wild', 'wild', 'scatter', 'star'], ctx)).toMatchObject({
      symbol: 'wild',
      count: 3,
      payValue: 100,
    });
  });

  it('a scatter breaks the run', () => {
    // star,star,scatter,star,star -> only 2 stars before the scatter -> no pay
    expect(evaluateLine(['star', 'star', 'scatter', 'star', 'star'], ctx).payValue).toBe(0);
  });

  it('a leading scatter yields nothing', () => {
    expect(evaluateLine(['scatter', 'scatter', 'scatter', 'scatter', 'scatter'], ctx).payValue).toBe(0);
  });

  it('wild + top symbol pays the top table', () => {
    expect(evaluateLine(['wild', 'seven', 'seven', 'seven', 'seven'], ctx)).toMatchObject({
      symbol: 'seven',
      count: 5,
      payValue: 1000,
    });
  });
});

describe('evaluateGrid — full grid', () => {
  it('sums every winning payline (all-star grid)', () => {
    // Every one of the 15 lines is 5 stars -> 30 each. perLine = 15/15 = 1.
    const r = engine.evaluateGrid(gridOf('star'), 15, 1);
    expect(r.baseWin).toBe(15 * 30);
    expect(r.win).toBe(450);
    expect(r.scatterCount).toBe(0);
    expect(r.bonusTriggered).toBe(false);
    expect(r.winningLines).toHaveLength(15);
  });

  it('applies the free-spins multiplier to the win only', () => {
    const r = engine.evaluateGrid(gridOf('star'), 15, 3);
    expect(r.baseWin).toBe(450);
    expect(r.win).toBe(1350);
  });

  it('scales pays by the per-line bet', () => {
    const r = engine.evaluateGrid(gridOf('star'), 150, 1); // perLine = 10
    expect(r.baseWin).toBe(450 * 10);
  });

  it('counts scatters anywhere and triggers at 3', () => {
    const g = gridOf('star', [
      [0, 0, 'scatter'],
      [1, 0, 'scatter'],
      [2, 0, 'scatter'],
    ]);
    const r = engine.evaluateGrid(g, 15, 1);
    expect(r.scatterCount).toBe(3);
    expect(r.bonusTriggered).toBe(true);
  });

  it('does not trigger on 2 scatters', () => {
    const g = gridOf('star', [
      [0, 0, 'scatter'],
      [1, 0, 'scatter'],
    ]);
    const r = engine.evaluateGrid(g, 15, 1);
    expect(r.scatterCount).toBe(2);
    expect(r.bonusTriggered).toBe(false);
  });

  it('scatter pays nothing on a line but still counts for the bonus', () => {
    // A full screen of scatters: 15 scatters, zero line pay, bonus triggered.
    const r = engine.evaluateGrid(gridOf('scatter'), 15, 1);
    expect(r.baseWin).toBe(0);
    expect(r.scatterCount).toBe(15);
    expect(r.bonusTriggered).toBe(true);
  });
});

describe('determinism', () => {
  it('same seed -> identical round stream', () => {
    const a = new SlotEngine(new Rng(42), PARSHEET);
    const b = new SlotEngine(new Rng(42), PARSHEET);
    for (let i = 0; i < 1000; i++) {
      expect(a.playRound(150).totalWin).toBe(b.playRound(150).totalWin);
    }
  });
});
