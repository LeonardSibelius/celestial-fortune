import { Assets, Graphics, Sprite, type Container, type Texture } from 'pixi.js';
import starUrl from '../factory/star.png';
import moonUrl from '../factory/moon.png';
import galaxyUrl from '../factory/galaxy.png';
import saturnUrl from '../factory/saturn.png';
import marsUrl from '../factory/mars.png';
import crownUrl from '../factory/crown.png';
import sevenUrl from '../factory/seven.png';
import wildUrl from '../factory/wild.png';
import scatterUrl from '../factory/scatter.png';

/**
 * Procedural symbol art for the grey-box (P2), keyed by the model's symbol ids
 * (star, moon, galaxy, saturn, mars, crown, seven, wild, scatter — see
 * src/model/parsheet.json). Everything is drawn with Pixi `Graphics`; the art
 * factory pass (P3) replaces these with UE-rendered atlases via the texture
 * seam below.
 */

const darken = (color: number, amount = 0.45): number => {
  const r = Math.floor(((color >> 16) & 0xff) * (1 - amount));
  const g = Math.floor(((color >> 8) & 0xff) * (1 - amount));
  const b = Math.floor((color & 0xff) * (1 - amount));
  return (r << 16) | (g << 8) | b;
};

interface SymbolStyle {
  readonly color: number;
  readonly draw: (g: Graphics, half: number, inner: number, edge: number) => void;
}

const p = (half: number) => (x: number, y: number): [number, number] => [x * half, y * half];

const STYLES: Readonly<Record<string, SymbolStyle>> = {
  star: {
    color: 0xffd23f,
    draw: (g, half, _inner, edge) => {
      g.star(0, 0, 5, 0.92 * half, 0.4 * half, -Math.PI / 2)
        .fill({ color: 0xffd23f })
        .stroke({ width: 4, color: edge, join: 'round' });
    },
  },
  moon: {
    color: 0xd7e0ff,
    draw: (g, half) => {
      const r = 0.66 * half;
      g.circle(0, 0, r).fill({ color: 0xeef2ff });
      g.circle(0.42 * half, -0.12 * half, r * 0.95).cut(); // crescent bite
    },
  },
  galaxy: {
    color: 0xb06bff,
    draw: (g, half) => {
      g.ellipse(0, 0, 0.92 * half, 0.34 * half).stroke({ width: 6, color: 0xb06bff, alpha: 0.9 });
      g.ellipse(0, 0, 0.6 * half, 0.22 * half).stroke({ width: 3, color: 0xcfd8ff, alpha: 0.75 });
      g.circle(0, 0, 0.24 * half).fill({ color: 0xe9d4ff });
      g.circle(-0.5 * half, -0.18 * half, 2).circle(0.55 * half, 0.16 * half, 2).circle(0.18 * half, -0.3 * half, 1.6).fill({ color: 0xffffff });
    },
  },
  saturn: {
    color: 0xe9c349,
    draw: (g, half, _inner, edge) => {
      g.circle(0, 0, 0.5 * half).fill({ color: 0xe9c349 }).stroke({ width: 3, color: edge });
      g.ellipse(0, 0, 0.96 * half, 0.3 * half).stroke({ width: 6, color: 0xfff3c4, alpha: 0.95 });
      g.ellipse(0, 0, 0.78 * half, 0.24 * half).stroke({ width: 2, color: 0xe9c349, alpha: 0.8 });
    },
  },
  mars: {
    color: 0xff7a3c,
    draw: (g, half) => {
      g.circle(0, 0, 0.56 * half).fill({ color: 0xff7a3c }).stroke({ width: 3, color: 0xc1440e });
      g.circle(-0.18 * half, -0.1 * half, 0.1 * half)
        .circle(0.16 * half, 0.16 * half, 0.13 * half)
        .circle(0.1 * half, -0.22 * half, 0.07 * half)
        .fill({ color: 0x8a2410, alpha: 0.5 });
      g.ellipse(0, -0.46 * half, 0.16 * half, 0.06 * half).fill({ color: 0xffffff, alpha: 0.8 });
    },
  },
  crown: {
    color: 0xffd24a,
    draw: (g, half, _inner, edge) => {
      const c = p(half);
      g.poly([...c(-0.72, 0.46), ...c(-0.82, -0.4), ...c(-0.36, 0.02), ...c(0, -0.55), ...c(0.36, 0.02), ...c(0.82, -0.4), ...c(0.72, 0.46)])
        .fill({ color: 0xffd24a })
        .stroke({ width: 3, color: edge, join: 'round' });
      g.rect(-0.72 * half, 0.42 * half, 1.44 * half, 0.22 * half).fill({ color: 0xffd24a }).stroke({ width: 3, color: edge });
      g.circle(0, 0.2 * half, 0.08 * half).fill({ color: 0xe23b58 });
      g.circle(-0.42 * half, 0.3 * half, 0.06 * half).fill({ color: 0x3f6fe0 });
      g.circle(0.42 * half, 0.3 * half, 0.06 * half).fill({ color: 0x21c47a });
    },
  },
  seven: {
    color: 0xff3b5c,
    draw: (g, half, _inner, edge) => {
      const c = p(half);
      g.poly([...c(-0.6, -0.66), ...c(0.6, -0.66), ...c(0.6, -0.42), ...c(0.12, 0.72), ...c(-0.2, 0.72), ...c(0.3, -0.42), ...c(-0.6, -0.42)])
        .fill({ color: 0xff3b5c })
        .stroke({ width: 4, color: edge, join: 'round' });
    },
  },
  wild: {
    color: 0xb06bff,
    draw: (g, half) => {
      const c = p(half);
      g.poly([...c(0, -0.92), ...c(0.88, -0.28), ...c(0.54, 0.8), ...c(-0.54, 0.8), ...c(-0.88, -0.28)])
        .fill({ color: 0xb06bff })
        .stroke({ width: 4, color: 0xffffff, join: 'round' });
      g.star(0, 0.04 * half, 5, 0.42 * half, 0.18 * half, -Math.PI / 2).fill({ color: 0xffffff, alpha: 0.95 });
    },
  },
  scatter: {
    color: 0x2e8fff,
    draw: (g, half) => {
      g.circle(0, 0, 0.56 * half).fill({ color: 0x2e8fff }).stroke({ width: 3, color: 0xbfe6ff });
      g.circle(-0.18 * half, -0.04 * half, 0.16 * half)
        .circle(0.2 * half, 0.18 * half, 0.13 * half)
        .circle(0.24 * half, -0.2 * half, 0.08 * half)
        .fill({ color: 0x3fae5a });
      g.ellipse(-0.04 * half, -0.34 * half, 0.18 * half, 0.06 * half).fill({ color: 0xffffff, alpha: 0.6 });
    },
  },
};

/** Color associated with a symbol id (for win highlights, banners, etc.). */
export function symbolColor(id: string): number {
  return STYLES[id]?.color ?? 0xffffff;
}

/** Draw symbol `id` centered on (0, 0), sized to fit inside a `cell`-px square. */
export function drawSymbol(g: Graphics, id: string, cell: number): void {
  g.clear();
  const style = STYLES[id];
  if (!style) return;
  const inner = cell * 0.76;
  const half = inner / 2;
  style.draw(g, half, inner, darken(style.color));
}

/**
 * UE-rendered symbol art (P3), keyed by model symbol id. `contentFraction` is
 * the opaque art's largest dimension as a share of the 512px texture (measured
 * from each render), so every symbol sizes to the same inner box as the drawn
 * fallbacks. When a texture is present it's used; otherwise `createSymbol` falls
 * back to the procedural `Graphics` drawing.
 */
interface TexturedSymbol {
  readonly url: string;
  readonly contentFraction: number;
}

export const SYMBOL_TEXTURES: Readonly<Record<string, TexturedSymbol>> = {
  star: { url: starUrl, contentFraction: 0.512 },
  moon: { url: moonUrl, contentFraction: 0.879 },
  galaxy: { url: galaxyUrl, contentFraction: 0.902 },
  saturn: { url: saturnUrl, contentFraction: 0.939 },
  mars: { url: marsUrl, contentFraction: 0.82 },
  crown: { url: crownUrl, contentFraction: 0.863 },
  seven: { url: sevenUrl, contentFraction: 0.682 },
  wild: { url: wildUrl, contentFraction: 0.918 },
  scatter: { url: scatterUrl, contentFraction: 0.877 },
};

/** Load every UE-rendered symbol texture. Returns an id -> Texture map. */
export async function loadSymbolTextures(): Promise<Map<string, Texture>> {
  const textures = new Map<string, Texture>();
  for (const [id, def] of Object.entries(SYMBOL_TEXTURES)) {
    textures.set(id, await Assets.load<Texture>(def.url));
  }
  return textures;
}

/**
 * Build the display object for symbol `id`, centered on (0, 0) and sized to the
 * cell — a UE-rendered `Sprite` when a texture exists for that id, otherwise the
 * procedural `Graphics` drawing.
 */
export function createSymbol(id: string, cell: number, textures: Map<string, Texture>): Container {
  const texture = textures.get(id);
  if (texture) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    const inner = cell * 0.76;
    sprite.width = sprite.height = inner / SYMBOL_TEXTURES[id].contentFraction;
    return sprite;
  }
  const g = new Graphics();
  drawSymbol(g, id, cell);
  return g;
}
