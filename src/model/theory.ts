import type { ParSheet } from './types';
import { makeContext, evaluateLine } from './lines';

/**
 * Closed-form theoretical figures derived directly from a par sheet.
 *
 * These are EXACT under the sheet's `independent_cells` model (every visible
 * cell is an iid draw from its reel strip). The million-spin simulation must
 * converge to these numbers — that's the regulator check.
 */
export interface Theory {
  /** Base-game return (line pays), as a fraction of stake. */
  baseRtp: number;
  /** Free-spins return, as a fraction of stake. */
  bonusRtp: number;
  /** baseRtp + bonusRtp. */
  totalRtp: number;
  /** q — probability a single spin shows >= trigger_count scatters. */
  scatterTriggerProb: number;
  /** E[total free spins | a trigger], accounting for retriggers. */
  expectedFreeSpinsPerTrigger: number;
  /** Probability a single payline pays. */
  lineHitProb: number;
  symbolProb: Record<string, number>;
}

export function computeTheoretical(sheet: ParSheet): Theory {
  const ctx = makeContext(sheet);
  const syms = sheet.symbols;
  const reels = sheet.layout.reels;
  const totalWeight = syms.reduce((a, s) => a + s.weight, 0);
  const ids = syms.map((s) => s.id);
  const p = syms.map((s) => s.weight / totalWeight);

  // Base RTP = E[pay on a single payline]. Each of the 5 line cells is an
  // independent draw with the symbol marginals, so we enumerate all ids^reels
  // lines weighted by probability. With 15 identical lines and per-line-linear
  // pays, total base RTP equals this single-line expectation.
  let baseRtp = 0;
  let lineHitProb = 0;
  const line: string[] = new Array(reels);
  const recurse = (i: number, prob: number): void => {
    if (i === reels) {
      const e = evaluateLine(line, ctx);
      if (e.payValue > 0) {
        baseRtp += prob * e.payValue;
        lineHitProb += prob;
      }
      return;
    }
    for (let s = 0; s < ids.length; s++) {
      line[i] = ids[s];
      recurse(i + 1, prob * p[s]);
    }
  };
  recurse(0, 1);

  // Scatter trigger probability: P(>= trigger_count scatters among all cells),
  // cells iid with the scatter marginal.
  const cells = sheet.layout.reels * sheet.layout.rows;
  const scatter = syms.find((s) => s.scatter);
  const psc = scatter ? scatter.weight / totalWeight : 0;
  const binom = (n: number, k: number): number => {
    let c = 1;
    for (let j = 0; j < k; j++) c = (c * (n - j)) / (j + 1);
    return c;
  };
  let q = 0;
  for (let k = sheet.bonus.trigger_count; k <= cells; k++) {
    q += binom(cells, k) * Math.pow(psc, k) * Math.pow(1 - psc, cells - k);
  }

  // Free spins form a branching process: each spin independently retriggers
  // with probability q, granting g more spins. E[N | trigger] = g / (1 - g·q).
  // Each free spin returns m·baseRtp in expectation, so (per node existence is
  // independent of its own win) E[bonus] = q · E[N] · m · baseRtp exactly.
  const g = sheet.bonus.free_spins;
  const m = sheet.bonus.multiplier;
  const expectedFreeSpinsPerTrigger = g / (1 - g * q);
  const bonusRtp = q * expectedFreeSpinsPerTrigger * m * baseRtp;

  const symbolProb: Record<string, number> = {};
  syms.forEach((s, i) => (symbolProb[s.id] = p[i]));

  return {
    baseRtp,
    bonusRtp,
    totalRtp: baseRtp + bonusRtp,
    scatterTriggerProb: q,
    expectedFreeSpinsPerTrigger,
    lineHitProb,
    symbolProb,
  };
}
