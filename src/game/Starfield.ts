import { Container, Graphics } from 'pixi.js';
import { Rng } from '../model';
import { WIDTH, HEIGHT } from './layout';

interface Star {
  readonly gfx: Graphics;
  readonly base: number;
  readonly phase: number;
  readonly speed: number;
}

const STAR_TINTS = [0xffffff, 0xfff3c4, 0xcfe0ff, 0xffe9b8];

/**
 * Seeded procedural starfield — soft nebula glows + twinkling stars in the
 * celestial palette. Deterministic for a given seed; drawn behind the cabinet.
 */
export class Starfield {
  readonly view = new Container();
  private readonly stars: Star[] = [];
  private t = 0;

  constructor(seed: number, starCount = 170) {
    const rng = new Rng(seed);

    // a few soft nebula blobs (stacked low-alpha circles fake a radial glow)
    const nebula = new Graphics();
    const tints = [0x3a2a6a, 0x1d3a6e, 0x5a3d2a, 0x2a1d4a];
    for (let i = 0; i < 5; i++) {
      const cx = rng.next() * WIDTH;
      const cy = rng.next() * HEIGHT;
      const r = 90 + rng.next() * 150;
      const tint = tints[rng.int(tints.length)];
      for (let ring = 6; ring >= 1; ring--) {
        nebula.circle(cx, cy, (r * ring) / 6).fill({ color: tint, alpha: 0.04 });
      }
    }
    this.view.addChild(nebula);

    // stars
    for (let i = 0; i < starCount; i++) {
      const x = rng.next() * WIDTH;
      const y = rng.next() * HEIGHT;
      const radius = rng.next() < 0.92 ? 0.6 + rng.next() * 1.3 : 1.6 + rng.next() * 1.8;
      const tint = STAR_TINTS[rng.int(STAR_TINTS.length)];
      const base = 0.35 + rng.next() * 0.55;
      const gfx = new Graphics().circle(0, 0, radius).fill({ color: tint });
      gfx.position.set(x, y);
      gfx.alpha = base;
      this.view.addChild(gfx);
      this.stars.push({ gfx, base, phase: rng.next() * Math.PI * 2, speed: 0.6 + rng.next() * 2.2 });
    }
  }

  update(dt: number): void {
    this.t += dt;
    for (const s of this.stars) {
      s.gfx.alpha = s.base * (0.55 + 0.45 * Math.sin(this.t * s.speed + s.phase));
    }
  }
}
