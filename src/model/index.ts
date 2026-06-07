/**
 * Celestial Fortune — headless math model (P1).
 *
 * Pure TypeScript, zero Pixi/DOM imports. `parsheet.json` is the single source
 * of truth; the UE/C++ port reads the same file.
 */
export { Rng } from './rng';
export {
  SlotEngine,
  PARSHEET,
  GIFT_PARSHEET,
  CASINO_PARSHEET,
  SHEETS,
  type SheetOption,
} from './engine';
export { computeTheoretical, type Theory } from './theory';
export { makeContext, evaluateLine, type EvalContext, type LineEval } from './lines';
export type {
  ParSheet,
  SymbolDef,
  BonusDef,
  SpinResult,
  RoundResult,
  WinningLine,
  Position,
} from './types';
