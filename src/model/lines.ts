import type { ParSheet, SymbolDef } from './types';

/**
 * Pre-baked lookup context for fast, allocation-light line evaluation.
 * Built once from a par sheet and reused by the engine and the theory calc.
 */
export interface EvalContext {
  readonly symbols: ReadonlyMap<string, SymbolDef>;
  readonly wildId: string;
  readonly scatterId: string;
}

export function makeContext(sheet: ParSheet): EvalContext {
  const symbols = new Map<string, SymbolDef>();
  let wildId = '';
  let scatterId = '';
  for (const s of sheet.symbols) {
    symbols.set(s.id, s);
    if (s.wild) wildId = s.id;
    if (s.scatter) scatterId = s.id;
  }
  return { symbols, wildId, scatterId };
}

export interface LineEval {
  /** Base symbol id the line resolved to, or '' if no win. */
  readonly symbol: string;
  /** Length of the matched left-to-right run. */
  readonly count: number;
  /** Pay in per-line-bet units (paytable value), 0 if no win. */
  readonly payValue: number;
}

const NO_WIN: LineEval = { symbol: '', count: 0, payValue: 0 };

/**
 * Evaluate a single line of symbols left-to-right.
 *
 * Faithfully reproduces the web prototype:
 *  - scatter breaks the run immediately;
 *  - wild extends the run and (when it leads) defers the base to the first
 *    non-wild symbol — leading wilds pay the BASE symbol's table, not wild's;
 *  - an all-wild run pays the wild table;
 *  - a win needs count >= 3 and a positive pay.
 *
 * `lineSymbols[i]` is the symbol on reel i for this payline.
 */
export function evaluateLine(lineSymbols: readonly string[], ctx: EvalContext): LineEval {
  let base: string | null = null;
  let count = 0;

  for (let i = 0; i < lineSymbols.length; i++) {
    const k = lineSymbols[i];
    if (k === ctx.scatterId) break;
    if (k === ctx.wildId) {
      count++;
      continue;
    }
    if (base === null) {
      base = k;
      count++;
    } else if (k === base) {
      count++;
    } else {
      break;
    }
  }

  // A run of only wilds resolves to the wild symbol.
  if (base === null && count > 0) base = ctx.wildId;
  if (count < 3 || base === null) return NO_WIN;

  const payValue = ctx.symbols.get(base)?.pays[String(count)] ?? 0;
  if (payValue <= 0) return NO_WIN;
  return { symbol: base, count, payValue };
}
