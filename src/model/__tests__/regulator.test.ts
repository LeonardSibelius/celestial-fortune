import { describe, it, expect } from 'vitest';
import { PARSHEET, CASINO_PARSHEET } from '../engine';
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

// ============================================================================
//  CASINO SHEET — balanced design targets (P4). Same engine/seed, retuned pays.
// ============================================================================
const CASINO_BANDS = {
  rtp: { min: 0.945, max: 0.955 }, // design target RTP band
  rtpAbsTolerance: 0.01, // measured within ±1.0% of theoretical (self-consistency)
  bonusFreq: { min: 0.015, max: 0.025 },
  baseHitFreq: { min: 0.3, max: 0.45 },
  freeSpinsPerTrigger: { min: 9.5, max: 10.1 },
  maxRoundWinXCap: 1000,
};

describe('regulator — million-spin review (casino sheet)', () => {
  it(`runs ${SPINS.toLocaleString()} seeded spins on the casino par sheet`, () => {
    const theory = computeTheoretical(CASINO_PARSHEET);
    const stats = simulate({ spins: SPINS, seed: SEED, bet: BET, sheet: CASINO_PARSHEET });

    /* eslint-disable no-console */
    console.log('\n======================================================================');
    console.log('  CELESTIAL FORTUNE — CASINO PAR SHEET REVIEW (' + SPINS.toLocaleString() + ' spins)');
    console.log('  seed=0x' + SEED.toString(16) + '  bet=' + BET + '  stake=' + stats.totalStake.toLocaleString());
    console.log('----------------------------------------------------------------------');
    console.log('  metric                      theoretical        measured');
    console.log('  RTP (total)                 ' + fmtPct(theory.totalRtp).padEnd(15) + '  ' + fmtPct(stats.rtp));
    console.log('    · base game               ' + fmtPct(theory.baseRtp).padEnd(15) + '  —');
    console.log('    · free spins              ' + fmtPct(theory.bonusRtp).padEnd(15) + '  —');
    console.log('  bonus trigger freq          ' + fmtPct(theory.scatterTriggerProb).padEnd(15) + '  ' + fmtPct(stats.bonusFreq));
    console.log('  avg free spins / trigger    ' + theory.expectedFreeSpinsPerTrigger.toFixed(3).padEnd(15) + '  ' + stats.avgFreeSpinsPerTrigger.toFixed(3));
    console.log('  base-game line-hit freq     —' + '                ' + fmtPct(stats.baseHitFreq));
    console.log('  max single-round win (×bet) —' + '                ' + stats.maxRoundWinX.toFixed(1));
    console.log('======================================================================');
    console.log('  Balanced casino economics: RTP in [94.5%, 95.5%].');
    console.log('======================================================================\n');
    /* eslint-enable no-console */

    // Design-target bands.
    expect(stats.rtp).toBeGreaterThan(CASINO_BANDS.rtp.min);
    expect(stats.rtp).toBeLessThan(CASINO_BANDS.rtp.max);
    // Self-consistency: measured tracks theoretical.
    expect(Math.abs(stats.rtp - theory.totalRtp)).toBeLessThan(CASINO_BANDS.rtpAbsTolerance);
    // Bonus trigger frequency in target range.
    expect(stats.bonusFreq).toBeGreaterThan(CASINO_BANDS.bonusFreq.min);
    expect(stats.bonusFreq).toBeLessThan(CASINO_BANDS.bonusFreq.max);
    // Base-game hit frequency in target range.
    expect(stats.baseHitFreq).toBeGreaterThan(CASINO_BANDS.baseHitFreq.min);
    expect(stats.baseHitFreq).toBeLessThan(CASINO_BANDS.baseHitFreq.max);
    // Free-spins length and max exposure.
    expect(stats.avgFreeSpinsPerTrigger).toBeGreaterThan(CASINO_BANDS.freeSpinsPerTrigger.min);
    expect(stats.avgFreeSpinsPerTrigger).toBeLessThan(CASINO_BANDS.freeSpinsPerTrigger.max);
    expect(stats.maxRoundWinX).toBeLessThan(CASINO_BANDS.maxRoundWinXCap);
  }, 180_000);
});
