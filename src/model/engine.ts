import giftSheet from './parsheet.gift.json';
import casinoSheet from './parsheet.casino.json';
import type { ParSheet, Position, RoundResult, SpinResult, WinningLine } from './types';
import { makeContext, evaluateLine, type EvalContext } from './lines';
import { Rng } from './rng';

/** The two bundled par sheets. The model is sheet-parametric — pass either. */
export const GIFT_PARSHEET = giftSheet as unknown as ParSheet;
export const CASINO_PARSHEET = casinoSheet as unknown as ParSheet;

/** Default sheet (the web-prototype gift economics). */
export const PARSHEET = GIFT_PARSHEET;

export interface SheetOption {
  readonly key: string;
  readonly label: string;
  readonly sheet: ParSheet;
}

/** Selectable sheets for the HUD, in display order. */
export const SHEETS: readonly SheetOption[] = [
  { key: 'gift', label: 'GIFT', sheet: GIFT_PARSHEET },
  { key: 'casino', label: 'CASINO', sheet: CASINO_PARSHEET },
];

/** Runaway safety only; with q≈2% this is never approached. */
const MAX_FREE_SPINS_PER_ROUND = 100_000;

export class SlotEngine {
  private readonly sheet: ParSheet;
  private readonly ctx: EvalContext;
  private readonly strips: readonly (readonly string[])[];
  private readonly rng: Rng;

  constructor(rng: Rng, sheet: ParSheet = PARSHEET) {
    this.rng = rng;
    this.sheet = sheet;
    this.ctx = makeContext(sheet);
    this.strips = sheet.reels.map((r) => r.strip);
  }

  /**
   * One spin: build the grid (each cell an independent draw from its reel
   * strip) and evaluate it. `multiplier` scales line wins — 3 during free spins.
   */
  spin(bet: number, multiplier = 1): SpinResult {
    const { reels, rows } = this.sheet.layout;
    const grid: string[][] = [];
    for (let r = 0; r < reels; r++) {
      const strip = this.strips[r];
      const col: string[] = [];
      for (let row = 0; row < rows; row++) {
        col.push(strip[this.rng.int(strip.length)]);
      }
      grid.push(col);
    }
    return this.evaluateGrid(grid, bet, multiplier);
  }

  /** Evaluate an explicit grid[reel][row] of symbol ids. Pure — no RNG. */
  evaluateGrid(grid: string[][], bet: number, multiplier = 1): SpinResult {
    const perLine = bet / this.sheet.lines;
    const winningLines: WinningLine[] = [];
    let baseWin = 0;

    for (let li = 0; li < this.sheet.paylines.length; li++) {
      const rowsForLine = this.sheet.paylines[li];
      const lineSymbols: string[] = [];
      for (let reel = 0; reel < rowsForLine.length; reel++) {
        lineSymbols.push(grid[reel][rowsForLine[reel]]);
      }
      const e = evaluateLine(lineSymbols, this.ctx);
      if (e.payValue > 0) {
        const pay = e.payValue * perLine;
        baseWin += pay;
        const positions: Position[] = [];
        for (let reel = 0; reel < e.count; reel++) {
          positions.push({ reel, row: rowsForLine[reel] });
        }
        winningLines.push({ line: li, symbol: e.symbol, count: e.count, pay, positions });
      }
    }

    let scatterCount = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let row = 0; row < grid[r].length; row++) {
        if (grid[r][row] === this.ctx.scatterId) scatterCount++;
      }
    }

    const bonusTriggered = scatterCount >= this.sheet.bonus.trigger_count;
    const win = Math.round(baseWin * multiplier);
    return { grid, winningLines, baseWin, multiplier, win, scatterCount, bonusTriggered };
  }

  /**
   * A full paid round: the paid spin plus any free spins it spawns (with ×3
   * wins and retriggers), mirroring the prototype's bonus loop. Returns the
   * total credits returned for the single stake `bet`.
   */
  playRound(bet: number): RoundResult {
    const baseSpin = this.spin(bet, 1);
    let totalWin = baseSpin.win;
    const freeSpins: SpinResult[] = [];

    if (baseSpin.bonusTriggered) {
      const m = this.sheet.bonus.multiplier;
      let remaining = this.sheet.bonus.free_spins;
      while (remaining > 0 && freeSpins.length < MAX_FREE_SPINS_PER_ROUND) {
        const fs = this.spin(bet, m);
        freeSpins.push(fs);
        totalWin += fs.win;
        remaining--;
        if (this.sheet.bonus.retrigger && fs.bonusTriggered) {
          remaining += this.sheet.bonus.free_spins;
        }
      }
    }

    return {
      bet,
      totalWin,
      baseSpin,
      freeSpins,
      freeSpinCount: freeSpins.length,
      bonusTriggered: baseSpin.bonusTriggered,
    };
  }
}
