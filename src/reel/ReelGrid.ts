import { Container, Graphics, type Texture } from 'pixi.js';
import { Reel } from './Reel';
import type { WinningLine } from '../model';
import { REELS, ROWS, CELL, GRID_X, GRID_Y, GRID_W, GRID_H, reelX, cellCenter } from '../game/layout';

const LINE_COLORS = [0xffd86b, 0x7cffda, 0xff7ac8, 0x9b8bff, 0xffae57, 0x66e0ff];

/**
 * The 5×3 reel window. Drives five {@link Reel} columns to a model-provided grid
 * (theater for `SpinResult.grid`), fires `onComplete` when the last reel stops,
 * and paints winning paylines from `SpinResult.winningLines`.
 */
export class ReelGrid {
  readonly view = new Container();

  private readonly reels: Reel[] = [];
  private readonly overlay = new Graphics();
  private onComplete?: () => void;
  private settled = true;
  private highlightTime = 0;
  private hasHighlight = false;

  constructor(textures: Map<string, Texture>, symbolIds: readonly string[], initialGrid: string[][]) {
    const bg = new Graphics();
    for (let r = 0; r < REELS; r++) {
      for (let row = 0; row < ROWS; row++) {
        bg.roundRect(reelX(r) + 2, GRID_Y + row * CELL + 2, CELL - 4, CELL - 4, 10);
      }
    }
    bg.fill({ color: 0x0c0a22 }).stroke({ width: 1, color: 0xffffff, alpha: 0.05 });
    this.view.addChild(bg);

    const reelsLayer = new Container();
    for (let r = 0; r < REELS; r++) {
      const reel = new Reel(textures, symbolIds, initialGrid[r]);
      reel.view.x = reelX(r);
      reel.view.y = GRID_Y;
      this.reels.push(reel);
      reelsLayer.addChild(reel.view);
    }
    const mask = new Graphics().rect(GRID_X, GRID_Y, GRID_W, GRID_H).fill(0xffffff);
    reelsLayer.mask = mask;
    this.view.addChild(reelsLayer, mask, this.overlay);
  }

  /** Fired as each reel transitions spinning -> stopped (for staggered tick SFX). */
  onReelStop?: (index: number) => void;
  private readonly wasSpinning: boolean[] = [];

  get spinning(): boolean {
    return this.reels.some((r) => r.spinning);
  }

  /** Spin all reels to `grid` (grid[reel] = [row0,row1,row2]); call back when settled. */
  spinTo(grid: string[][], onComplete: () => void): void {
    this.clearHighlights();
    this.onComplete = onComplete;
    this.settled = false;
    for (let r = 0; r < REELS; r++) {
      this.reels[r].start(grid[r], 18 + r * 5); // staggered travel -> cascading stops
      this.wasSpinning[r] = true;
    }
  }

  update(dt: number): void {
    for (const reel of this.reels) reel.update(dt);

    // per-reel stop edges -> staggered ticks
    for (let r = 0; r < this.reels.length; r++) {
      const sp = this.reels[r].spinning;
      if (this.wasSpinning[r] && !sp) this.onReelStop?.(r);
      this.wasSpinning[r] = sp;
    }

    if (!this.settled && !this.spinning) {
      this.settled = true;
      const cb = this.onComplete;
      this.onComplete = undefined;
      cb?.();
    }

    if (this.hasHighlight) {
      this.highlightTime += dt;
      this.overlay.alpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(this.highlightTime * 6));
    }
  }

  highlight(lines: readonly WinningLine[]): void {
    this.clearHighlights();
    if (lines.length === 0) return;
    const g = this.overlay;
    lines.forEach((wl, i) => {
      const color = LINE_COLORS[i % LINE_COLORS.length];
      for (const pos of wl.positions) {
        const c = cellCenter(pos.reel, pos.row);
        g.roundRect(c.x - CELL / 2 + 5, c.y - CELL / 2 + 5, CELL - 10, CELL - 10, 10).stroke({ width: 3, color, alpha: 0.95 });
      }
      wl.positions.forEach((pos, j) => {
        const c = cellCenter(pos.reel, pos.row);
        if (j === 0) g.moveTo(c.x, c.y);
        else g.lineTo(c.x, c.y);
      });
      g.stroke({ width: 3, color, alpha: 0.6 });
    });
    this.hasHighlight = true;
    this.highlightTime = 0;
  }

  clearHighlights(): void {
    this.overlay.clear();
    this.overlay.alpha = 1;
    this.hasHighlight = false;
  }
}
