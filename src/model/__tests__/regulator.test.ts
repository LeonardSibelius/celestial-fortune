import { describe, it, expect } from 'vitest';
import { PARSHEET } from '../engine';
import { computeTheoretical } from '../theory';
import { simulate } from '../simulate';

/**
 * The regulator suite — a million-spin par-sheet review.
 *
 * Seeded and deterministic: these exact numbers reproduce on every run. The
 * test prints a par-sheet-style review and asserts the measured statistics sit
 * inside the reviewed bands.
 */

// ============================================================================
//  REGULATOR BANDS  —  reviewed & approved by Walt (2026-06-07)
//  Seed sits mid-band; see the 8-seed sweep that informed these tolerances.
// ============================================================================
const SEED = 0x99999999; // mid-band seed (RTP ≈ 131.83%, ~0.08% off theory)
const SPINS = 1_000_000;
const BET = 150;

const BANDS = {
  // Measured RTP must sit within ±1.0% absolute of theoretical.
  rtpAbsTolerance: 0.01,
  // Bonus trigger frequency within ±0.10% absolute of theoretical q.
  bonusFreqAbsTolerance: 0.001,
  // Avg free spins per trigger must land in this range.
  freeSpinsPerTrigger: { min: 9.5, max: 10.1 },
  // Hard ceiling: no single round may return more than this multiple of bet.
  maxRoundWinXCap: 1000,
  // Base-game line-hit frequency band (43.18% ± 0.5%).
  baseHitFreq: { center: 0.43179, tol: 0.005 },
};

function fmtPct(x: number): string {
  return (x * 100).toFixed(3) + '%';
}

describe('regulator — million-spin review', () => {
  it(`runs ${SPINS.toLocaleString()} seeded spins and reports`, () => {
    const theory = computeTheoretical(PARSHEET);
    const stats = simulate({ spins: SPINS, seed: SEED, bet: BET });

    /* eslint-disable no-console */
    console.log('\n======================================================================');
    console.log('  CELESTIAL FORTUNE — PAR SHEET REVIEW (' + SPINS.toLocaleString() + ' spins)');
    console.log('  seed=0x' + SEED.toString(16) + '  bet=' + BET + '  stake=' + stats.totalStake.toLocaleString());
    console.log('----------------------------------------------------------------------');
    console.log('  metric                      theoretical        measured');
    console.log('  RTP (total)                 ' + fmtPct(theory.totalRtp).padEnd(15) + '  ' + fmtPct(stats.rtp));
    console.log('    · base game               ' + fmtPct(theory.baseRtp).padEnd(15) + '  —');
    console.log('    · free spins              ' + fmtPct(theory.bonusRtp).padEnd(15) + '  —');
    console.log('  bonus trigger freq          ' + fmtPct(theory.scatterTriggerProb).padEnd(15) + '  ' + fmtPct(stats.bonusFreq));
    console.log('  avg free spins / trigger    ' + theory.expectedFreeSpinsPerTrigger.toFixed(3).padEnd(15) + '  ' + stats.avgFreeSpinsPerTrigger.toFixed(3));
    console.log('  round hit frequency         —' + '                ' + fmtPct(stats.roundHitFreq));
    console.log('  base-game line-hit freq     —' + '                ' + fmtPct(stats.baseHitFreq));
    console.log('  max single-spin win (×bet)  —' + '                ' + stats.maxSpinWinX.toFixed(1));
    console.log('  max single-round win (×bet) —' + '                ' + stats.maxRoundWinX.toFixed(1));
    console.log('  bonus rounds                —' + '                ' + stats.bonusRounds.toLocaleString());
    console.log('======================================================================');
    console.log('  NOTE: theoretical RTP exceeds 100% — this is the prototype gift/demo');
    console.log('  economics (generous free-spins feature), not a balanced casino par.');
    console.log('======================================================================\n');
    /* eslint-enable no-console */

    // --- bands (approved by Walt — see header) ---
    // Measured RTP within ±1.0% of theoretical.
    expect(stats.rtp).toBeGreaterThan(theory.totalRtp - BANDS.rtpAbsTolerance);
    expect(stats.rtp).toBeLessThan(theory.totalRtp + BANDS.rtpAbsTolerance);
    // Bonus trigger frequency within ±0.10% of theoretical q.
    expect(Math.abs(stats.bonusFreq - theory.scatterTriggerProb)).toBeLessThan(BANDS.bonusFreqAbsTolerance);
    // Avg free spins per trigger in range.
    expect(stats.avgFreeSpinsPerTrigger).toBeGreaterThan(BANDS.freeSpinsPerTrigger.min);
    expect(stats.avgFreeSpinsPerTrigger).toBeLessThan(BANDS.freeSpinsPerTrigger.max);
    // Base-game line-hit frequency in band.
    expect(Math.abs(stats.baseHitFreq - BANDS.baseHitFreq.center)).toBeLessThan(BANDS.baseHitFreq.tol);
    // Max single-round exposure capped.
    expect(stats.maxRoundWinX).toBeLessThan(BANDS.maxRoundWinXCap);
  }, 180_000);
});
