import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Reel, CELL, VISIBLE } from './reel/Reel';
import './style.css';

const WIDTH = 460;
const HEIGHT = 680;
const WINDOW_W = CELL;
const WINDOW_H = VISIBLE * CELL;
const WINDOW_X = (WIDTH - WINDOW_W) / 2;
const WINDOW_Y = 150;

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

  // --- Reel + masked window -------------------------------------------------
  const reel = new Reel();
  reel.view.x = WINDOW_X;
  reel.view.y = WINDOW_Y;

  const mask = new Graphics().rect(WINDOW_X, WINDOW_Y, WINDOW_W, WINDOW_H).fill(0xffffff);
  reel.view.mask = mask;

  app.stage.addChild(reel.view, mask);
  buildWindowFrame(app.stage);

  // --- SPIN button ----------------------------------------------------------
  const button = buildSpinButton(() => reel.spin());
  app.stage.addChild(button.view);

  // --- Input ----------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      reel.spin();
    }
  });

  // --- Ticker ---------------------------------------------------------------
  app.ticker.add((ticker) => {
    reel.update(ticker.deltaMS / 1000);
    button.setEnabled(!reel.spinning);
  });
}

function buildCabinet(stage: Container): void {
  const bg = new Graphics();
  // base panel
  bg.roundRect(20, 20, WIDTH - 40, HEIGHT - 40, 24).fill(0x141a2e);
  bg.roundRect(20, 20, WIDTH - 40, HEIGHT - 40, 24).stroke({ width: 3, color: 0x2a3354 });
  // header band
  bg.roundRect(40, 44, WIDTH - 80, 70, 14).fill(0x1d2540);
  // glow accents flanking the window
  bg.roundRect(40, WINDOW_Y - 14, 14, WINDOW_H + 28, 7).fill(0x3a2a6a);
  bg.roundRect(WIDTH - 54, WINDOW_Y - 14, 14, WINDOW_H + 28, 7).fill(0x3a2a6a);
  stage.addChild(bg);

  const title = new Text({
    text: 'CELESTIAL FORTUNE',
    style: new TextStyle({
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 30,
      fontWeight: 'bold',
      fill: 0xffd700,
      stroke: { color: 0x5a3d00, width: 3 },
      letterSpacing: 2,
    }),
  });
  title.anchor.set(0.5);
  title.x = WIDTH / 2;
  title.y = 80;
  stage.addChild(title);

  const footer = new Text({
    text: 'DEMO MODE — NO REAL-MONEY PLAY',
    style: new TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: 0x6b7494, letterSpacing: 1 }),
  });
  footer.anchor.set(0.5);
  footer.x = WIDTH / 2;
  footer.y = HEIGHT - 44;
  stage.addChild(footer);
}

/** Frame, row dividers and center pay-line drawn on top of the reel. */
function buildWindowFrame(stage: Container): void {
  const frame = new Graphics();
  // row dividers
  for (let i = 1; i < VISIBLE; i++) {
    const y = WINDOW_Y + i * CELL;
    frame.moveTo(WINDOW_X, y).lineTo(WINDOW_X + WINDOW_W, y).stroke({ width: 1, color: 0xffffff, alpha: 0.08 });
  }
  // center pay-line highlight
  frame
    .rect(WINDOW_X, WINDOW_Y + CELL, WINDOW_W, CELL)
    .stroke({ width: 2, color: 0xffd700, alpha: 0.5 });
  // bezel
  frame
    .roundRect(WINDOW_X - 8, WINDOW_Y - 8, WINDOW_W + 16, WINDOW_H + 16, 10)
    .stroke({ width: 5, color: 0xffd700, alpha: 0.85 });
  stage.addChild(frame);
}

interface SpinButton {
  view: Container;
  setEnabled(enabled: boolean): void;
}

function buildSpinButton(onPress: () => void): SpinButton {
  const w = 200;
  const h = 64;
  const x = (WIDTH - w) / 2;
  const y = WINDOW_Y + WINDOW_H + 60;

  const view = new Container();
  view.x = x;
  view.y = y;
  view.eventMode = 'static';
  view.cursor = 'pointer';
  view.hitArea = { contains: (px: number, py: number) => px >= 0 && px <= w && py >= 0 && py <= h };

  const bg = new Graphics();
  const label = new Text({
    text: 'SPIN',
    style: new TextStyle({ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', fill: 0x141a2e, letterSpacing: 3 }),
  });
  label.anchor.set(0.5);
  label.x = w / 2;
  label.y = h / 2;
  view.addChild(bg, label);

  let enabled = true;
  const paint = (fill: number, alpha = 1): void => {
    bg.clear();
    bg.roundRect(0, 0, w, h, 14).fill({ color: fill, alpha });
    bg.roundRect(0, 0, w, h, 14).stroke({ width: 3, color: 0xfff3b0, alpha });
  };
  paint(0xffd700);

  view.on('pointerover', () => enabled && paint(0xffe34d));
  view.on('pointerout', () => paint(enabled ? 0xffd700 : 0x6b6038, enabled ? 1 : 0.6));
  view.on('pointertap', () => enabled && onPress());

  return {
    view,
    setEnabled(next: boolean) {
      if (next === enabled) return;
      enabled = next;
      view.cursor = next ? 'pointer' : 'default';
      label.alpha = next ? 1 : 0.5;
      paint(next ? 0xffd700 : 0x6b6038, next ? 1 : 0.6);
    },
  };
}

void main();
