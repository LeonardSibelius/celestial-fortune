import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Game } from './game/Game';
import { Starfield } from './game/Starfield';
import { loadSymbolTextures } from './reel/symbols';
import { WIDTH, HEIGHT, GRID_X, GRID_Y, GRID_W, GRID_H } from './game/layout';
import './style.css';

const STARFIELD_SEED = 0x0c0ffee; // seeded procedural background (deterministic)

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    background: 0x05060d,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  // Fit-to-window: scale the fixed-design-size cabinet to fill the viewport.
  // Pure CSS transform — flex centering keeps it centered, and the 2x backing
  // resolution keeps it sharp up to ~2x scale. Benefits big monitors AND the
  // Leonard Sibelius in-game embed (UE Chromium widget).
  const fit = (): void => {
    const s = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT) * 0.97;
    app.canvas.style.transform = `scale(${s})`;
  };
  window.addEventListener('resize', fit);
  fit();

  // seeded starfield behind everything
  const starfield = new Starfield(STARFIELD_SEED);
  app.stage.addChild(starfield.view);
  app.ticker.add((t) => starfield.update(t.deltaMS / 1000));

  buildCabinet(app.stage);

  const textures = await loadSymbolTextures();
  const seed = (Date.now() >>> 0) ^ 0x9e3779b9;
  new Game(app, textures, seed);
}

/** Translucent cabinet chrome — stars show through the panels. */
function buildCabinet(stage: Container): void {
  const bg = new Graphics();
  bg.roundRect(16, 16, WIDTH - 32, HEIGHT - 32, 24).fill({ color: 0x141a2e, alpha: 0.72 });
  bg.roundRect(16, 16, WIDTH - 32, HEIGHT - 32, 24).stroke({ width: 3, color: 0x2a3354 });
  bg.roundRect(36, 40, WIDTH - 72, 72, 14).fill({ color: 0x1d2540, alpha: 0.82 });
  // glow rails flanking the reel window
  bg.roundRect(GRID_X - 34, GRID_Y - 10, 16, GRID_H + 20, 8).fill({ color: 0x3a2a6a, alpha: 0.85 });
  bg.roundRect(GRID_X + GRID_W + 18, GRID_Y - 10, 16, GRID_H + 20, 8).fill({ color: 0x3a2a6a, alpha: 0.85 });
  // gold bezel around the grid
  bg.roundRect(GRID_X - 10, GRID_Y - 10, GRID_W + 20, GRID_H + 20, 14).stroke({ width: 5, color: 0xffd24a, alpha: 0.85 });
  stage.addChild(bg);

  const title = new Text({
    text: 'CELESTIAL FORTUNE',
    style: new TextStyle({
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 34,
      fontWeight: 'bold',
      fill: 0xffd700,
      stroke: { color: 0x5a3d00, width: 3 },
      dropShadow: { color: 0xffd24a, blur: 8, distance: 0, alpha: 0.5 },
      letterSpacing: 3,
    }),
  });
  title.anchor.set(0.5);
  title.position.set(WIDTH / 2, 80);
  stage.addChild(title);

  const footer = new Text({
    text: 'DEMO MODE — NO REAL-MONEY PLAY',
    style: new TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: 0x6b7494, letterSpacing: 1 }),
  });
  footer.anchor.set(0.5);
  footer.position.set(WIDTH / 2, HEIGHT - 30);
  stage.addChild(footer);
}

void main();
