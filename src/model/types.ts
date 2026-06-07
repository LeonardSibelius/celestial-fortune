/**
 * Shared types for the Celestial Fortune math model.
 *
 * This module is pure data + TypeScript — no Pixi, no DOM. It must run headless
 * (Node / vitest) so the regulator suite and the future UE/C++ port can share
 * the same source of truth (`parsheet.json`).
 */

export interface SymbolDef {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  /** Pay per matching line, keyed by count of a kind ("3" | "4" | "5"), in per-line-bet units. */
  readonly pays: Readonly<Record<string, number>>;
  readonly wild?: boolean;
  readonly scatter?: boolean;
}

export interface BonusDef {
  readonly trigger_symbol: string;
  readonly trigger_count: number;
  readonly free_spins: number;
  readonly multiplier: number;
  readonly retrigger: boolean;
  readonly scope: 'anywhere';
}

export interface ParSheet {
  readonly name: string;
  readonly version: string;
  readonly source: string;
  readonly currency: string;
  readonly layout: { readonly reels: number; readonly rows: number };
  /** "independent_cells": each visible cell is an independent draw from its reel strip. */
  readonly spin_model: 'independent_cells';
  readonly bets: readonly number[];
  readonly default_bet: number;
  readonly lines: number;
  readonly pays_direction: 'left_to_right';
  readonly min_match: number;
  readonly symbols: readonly SymbolDef[];
  /** One strip per reel; a strip is the weighted symbol bag (id repeated `weight` times). */
  readonly reels: readonly { readonly strip: readonly string[] }[];
  /** Row index (0 = top) per reel for each payline. */
  readonly paylines: readonly (readonly number[])[];
  readonly bonus: BonusDef;
  /** Theoretical RTP derived from this sheet (see theory.ts). Single source of truth. */
  readonly theoretical_rtp: number;
}

export interface Position {
  readonly reel: number;
  readonly row: number;
}

export interface WinningLine {
  readonly line: number;
  readonly symbol: string;
  readonly count: number;
  /** Win for this line, in credits (per-line pay × per-line bet, before any multiplier). */
  readonly pay: number;
  readonly positions: readonly Position[];
}

export interface SpinResult {
  /** grid[reel][row] symbol id. */
  readonly grid: string[][];
  readonly winningLines: WinningLine[];
  /** Sum of line pays before multiplier, in credits. */
  readonly baseWin: number;
  readonly multiplier: number;
  /** baseWin × multiplier, in credits. */
  readonly win: number;
  readonly scatterCount: number;
  readonly bonusTriggered: boolean;
}

export interface RoundResult {
  readonly bet: number;
  /** Total returned for the paid spin plus any free spins it spawned, in credits. */
  readonly totalWin: number;
  readonly baseSpin: SpinResult;
  readonly freeSpins: SpinResult[];
  readonly freeSpinCount: number;
  readonly bonusTriggered: boolean;
}
