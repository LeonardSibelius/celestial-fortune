/** Shared geometry for the 5×3 cabinet. All coordinates are absolute (stage space). */
export const REELS = 5;
export const ROWS = 3;
export const CELL = 104;
export const REEL_GAP = 8;

export const GRID_W = REELS * CELL + (REELS - 1) * REEL_GAP;
export const GRID_H = ROWS * CELL;

export const WIDTH = 660;
export const HEIGHT = 720;

export const GRID_X = (WIDTH - GRID_W) / 2;
export const GRID_Y = 150;

export const reelX = (reel: number): number => GRID_X + reel * (CELL + REEL_GAP);

export const cellCenter = (reel: number, row: number): { x: number; y: number } => ({
  x: reelX(reel) + CELL / 2,
  y: GRID_Y + row * CELL + CELL / 2,
});
