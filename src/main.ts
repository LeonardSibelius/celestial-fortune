import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Game } from './game/Game';
import { loadSymbolTextures } from './reel/symbols';
import { WIDTH, HEIGHT, GRID_X, GRID_Y, GRID_W, GRID_H } from './game/layout';
import './style.css';

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    background: 0x0b0d17,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  buildCabinet(app.stage);

  const textures = await loadSymbolTextures();
  const seed = (Date.now() >>> 0) ^ 0x9e3779b9;
  new Game(app, textures, seed);
}

/** Static cabinet chrome behind the reels. */
function buildCabinet(stage: Container): void {
  const bg = new Graphics();
  bg.roundRect(16, 16, WIDTH - 32, HEIGHT - 32, 24).fill(0x141a2e).stroke({ width: 3, color: 0x2a3354 });
  bg.roundRect(36, 40, WIDTH - 72, 72, 14).fill(0x1d2540);
  // glow rails flanking the reel window
  bg.roundRect(GRID_X - 34, GRID_Y - 10, 16, GRID_H + 20, 8).fill(0x3a2a6a);
  bg.roundRect(GRID_X + GRID_W + 18, GRID_Y - 10, 16, GRID_H + 20, 8).fill(0x3a2a6a);
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
