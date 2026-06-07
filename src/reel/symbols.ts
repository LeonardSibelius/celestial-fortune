import { Graphics } from 'pixi.js';

/**
 * Placeholder symbol set for the P0 factory spike.
 *
 * Everything here is drawn procedurally with Pixi `Graphics` — distinct shapes
 * and colors, no external art. In a later phase these get replaced by
 * UE5-rendered atlases dropped into `src/factory/`.
 */
export interface SymbolDef {
  readonly name: string;
  readonly color: number;
}

export const SYMBOLS: readonly SymbolDef[] = [
  { name: 'seven', color: 0xff3b3b },
  { name: 'bell', color: 0xffcf3f },
  { name: 'star', color: 0xffd23f },
  { name: 'diamond', color: 0x3fd2ff },
  { name: 'bar', color: 0xff8c3f },
  { name: 'cherry', color: 0xff4f6d },
  { name: 'moon', color: 0xd7e0ff },
  { name: 'coin', color: 0xffd700 },
];

const darken = (color: number, amount = 0.45): number => {
  const r = Math.floor(((color >> 16) & 0xff) * (1 - amount));
  const g = Math.floor(((color >> 8) & 0xff) * (1 - amount));
  const b = Math.floor((color & 0xff) * (1 - amount));
  return (r << 16) | (g << 8) | b;
};

/**
 * Draw symbol `type` centered on (0, 0), sized to fit inside a `cell`-px square.
 */
export function drawSymbol(g: Graphics, type: number, cell: number): void {
  g.clear();
  const def = SYMBOLS[type];
  const inner = cell * 0.74;
  const half = inner / 2;
  const edge = darken(def.color);

  switch (def.name) {
    case 'seven': {
      const p = (x: number, y: number): [number, number] => [x * half, y * half];
      g.poly([
        ...p(-0.62, -0.7),
        ...p(0.62, -0.7),
        ...p(0.62, -0.45),
        ...p(0.12, 0.75),
        ...p(-0.2, 0.75),
        ...p(0.3, -0.45),
        ...p(-0.62, -0.45),
      ])
        .fill({ color: def.color })
        .stroke({ width: 4, color: edge, join: 'round' });
      break;
    }

    case 'bell': {
      const p = (x: number, y: number): [number, number] => [x * half, y * half];
      g.circle(0, -0.74 * half, inner * 0.1).fill({ color: def.color });
      g.poly([
        ...p(0.0, -0.62),
        ...p(0.45, -0.18),
        ...p(0.6, 0.32),
        ...p(0.74, 0.5),
        ...p(-0.74, 0.5),
        ...p(-0.6, 0.32),
        ...p(-0.45, -0.18),
      ])
        .fill({ color: def.color })
        .stroke({ width: 4, color: edge, join: 'round' });
      g.circle(0, 0.62 * half, inner * 0.1).fill({ color: edge });
      break;
    }

    case 'star': {
      g.star(0, 0, 5, 0.85 * half, 0.36 * half, -Math.PI / 2)
        .fill({ color: def.color })
        .stroke({ width: 4, color: edge, join: 'round' });
      break;
    }

    case 'diamond': {
      const p = (x: number, y: number): [number, number] => [x * half, y * half];
      g.poly([...p(0, -0.88), ...p(0.62, 0), ...p(0, 0.88), ...p(-0.62, 0)])
        .fill({ color: def.color })
        .stroke({ width: 4, color: edge, join: 'round' });
      // facet hint
      g.moveTo(-0.62 * half, 0).lineTo(0.62 * half, 0).stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
      break;
    }

    case 'bar': {
      const barW = inner * 0.92;
      const barH = inner * 0.22;
      const gap = inner * 0.08;
      for (const yc of [-(barH + gap), 0, barH + gap]) {
        g.roundRect(-barW / 2, yc - barH / 2, barW, barH, 5);
      }
      g.fill({ color: def.color }).stroke({ width: 3, color: edge });
      break;
    }

    case 'cherry': {
      const r = inner * 0.22;
      g.circle(-0.3 * half, 0.42 * half, r).circle(0.34 * half, 0.55 * half, r).fill({ color: def.color });
      // stems
      g.moveTo(0.1 * half, -0.78 * half)
        .quadraticCurveTo(-0.5 * half, -0.2 * half, -0.3 * half, 0.42 * half - r)
        .moveTo(0.1 * half, -0.78 * half)
        .quadraticCurveTo(0.5 * half, -0.1 * half, 0.34 * half, 0.55 * half - r)
        .stroke({ width: 4, color: 0x4caf50, cap: 'round' });
      break;
    }

    case 'moon': {
      const r = 0.64 * half;
      g.circle(0, 0, r).fill({ color: def.color });
      // bite out a crescent (transparent hole reveals the cell behind it)
      g.circle(0.42 * half, -0.12 * half, r * 0.92).cut();
      break;
    }

    case 'coin': {
      const r = 0.72 * half;
      g.circle(0, 0, r)
        .fill({ color: def.color })
        .stroke({ width: 4, color: edge });
      g.circle(0, 0, r * 0.7).stroke({ width: 3, color: edge, alpha: 0.8 });
      // sparkle
      g.star(-0.22 * half, -0.24 * half, 4, r * 0.16, r * 0.05).fill({ color: 0xffffff, alpha: 0.85 });
      break;
    }
  }
}
