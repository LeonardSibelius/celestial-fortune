import type { ParSheet } from './types';
import { PARSHEET, SlotEngine } from './engine';
import { Rng } from './rng';

export interface SimOptions {
  spins: number;
  seed: number;
  bet: number;
  sheet?: ParSheet;
}

export interface SimStats {
  spins: number;
  bet: number;
  totalStake: number;
  totalReturn: number;
  /** Measured return-to-player. */
  rtp: number;

  /** Rounds returning any win (paid spin + free spins). */
  roundHits: number;
  roundHitFreq: number;

  /** Paid spins with a base-game line win. */
  baseHits: number;
  baseHitFreq: number;

  /** Rounds that triggered the bonus. */
  bonusRounds: number;
  bonusFreq: number;
  freeSpinsTotal: number;
  avgFreeSpinsPerTrigger: number;

  /** Largest single spin win (incl. ×3 free spins), in multiples of bet. */
  maxSpinWinX: number;
  /** Largest single round return (one stake's full exposure), in multiples of bet. */
  maxRoundWinX: number;
}

/**
 * Headless Monte-Carlo over full paid rounds. Deterministic for a given seed —
 * the regulator suite and the C++ port can replay the identical stream.
 */
export function simulate(opts: SimOptions): SimStats {
  const { spins, seed, bet } = opts;
  const sheet = opts.sheet ?? PARSHEET;
  const engine = new SlotEngine(new Rng(seed), sheet);

  let totalReturn = 0;
  let roundHits = 0;
  let baseHits = 0;
  let bonusRounds = 0;
  let freeSpinsTotal = 0;
  let maxSpinWin = 0;
  let maxRoundWin = 0;

  for (let i = 0; i < spins; i++) {
    const r = engine.playRound(bet);
    totalReturn += r.totalWin;
    if (r.totalWin > 0) roundHits++;
    if (r.baseSpin.baseWin > 0) baseHits++;
    if (r.bonusTriggered) {
      bonusRounds++;
      freeSpinsTotal += r.freeSpinCount;
    }
    if (r.baseSpin.win > maxSpinWin) maxSpinWin = r.baseSpin.win;
    for (const fs of r.freeSpins) if (fs.win > maxSpinWin) maxSpinWin = fs.win;
    if (r.totalWin > maxRoundWin) maxRoundWin = r.totalWin;
  }

  const totalStake = spins * bet;
  return {
    spins,
    bet,
    totalStake,
    totalReturn,
    rtp: totalReturn / totalStake,
    roundHits,
    roundHitFreq: roundHits / spins,
    baseHits,
    baseHitFreq: baseHits / spins,
    bonusRounds,
    bonusFreq: bonusRounds / spins,
    freeSpinsTotal,
    avgFreeSpinsPerTrigger: bonusRounds ? freeSpinsTotal / bonusRounds : 0,
    maxSpinWinX: maxSpinWin / bet,
    maxRoundWinX: maxRoundWin / bet,
  };
}
