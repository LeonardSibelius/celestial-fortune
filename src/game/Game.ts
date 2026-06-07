import { Application, Container, Graphics, Text, TextStyle, type Texture } from 'pixi.js';
import { SlotEngine, PARSHEET, Rng, type SpinResult } from '../model';
import { ReelGrid } from '../reel/ReelGrid';
import { WIDTH, GRID_X, GRID_Y, GRID_H, GRID_W } from './layout';

const START_BALANCE = 25_000;
const TOP_UP = 25_000;
const FREE_SPIN_PAUSE_MS = 750; // pacing between auto free spins

interface Button {
  readonly view: Container;
  setEnabled(enabled: boolean): void;
  setLabel(text: string): void;
}

/**
 * Grey-box game shell. Owns the {@link SlotEngine} (the law), drives the
 * {@link ReelGrid} (the theater), and runs the HUD + free-spins autoplay.
 *
 * The model decides every outcome before the reels move: each spin calls
 * `engine.spin(bet, multiplier)` first, then animates to the returned grid. The
 * UI only ever reads results through the engine's public API.
 */
export class Game {
  private readonly engine: SlotEngine;
  private readonly grid: ReelGrid;

  private balance = START_BALANCE;
  private readonly bets = PARSHEET.bets;
  private betIndex: number;
  private roundWin = 0;

  private busy = false;
  private freeRemaining = 0;
  private freeTotal = 0;

  private readonly creditsText: Text;
  private readonly betText: Text;
  private readonly winText: Text;
  private readonly freeText: Text;
  private readonly banner: Text;
  private bannerTimer = 0;
  private readonly spinButton: Button;

  constructor(app: Application, textures: Map<string, Texture>, seed: number) {
    this.engine = new SlotEngine(new Rng(seed));
    this.betIndex = Math.max(0, this.bets.indexOf(PARSHEET.default_bet));

    const symbolIds = PARSHEET.symbols.map((s) => s.id);
    this.grid = new ReelGrid(textures, symbolIds, this.randomGrid(symbolIds));
    app.stage.addChild(this.grid.view);

    const hud = new Container();
    app.stage.addChild(hud);

    this.creditsText = this.makeMeter(hud, 'CREDITS', GRID_X, 'left');
    this.winText = this.makeMeter(hud, 'WIN', GRID_X + GRID_W, 'right');
    this.betText = this.makeMeter(hud, 'TOTAL BET', WIDTH / 2, 'center');

    this.freeText = new Text({
      text: '',
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold', fill: 0x7cffda, letterSpacing: 2 }),
    });
    this.freeText.anchor.set(0.5);
    this.freeText.position.set(WIDTH / 2, 124);
    hud.addChild(this.freeText);

    this.banner = new Text({
      text: '',
      style: new TextStyle({ fontFamily: 'Georgia, serif', fontSize: 44, fontWeight: 'bold', fill: 0xffd86b, stroke: { color: 0x3a1d00, width: 4 }, align: 'center' }),
    });
    this.banner.anchor.set(0.5);
    this.banner.position.set(WIDTH / 2, GRID_Y + GRID_H / 2);
    this.banner.alpha = 0;
    hud.addChild(this.banner);

    // bet steppers
    this.makeRoundButton(hud, WIDTH / 2 - 70, 512, '−', () => this.stepBet(-1));
    this.makeRoundButton(hud, WIDTH / 2 + 70, 512, '+', () => this.stepBet(+1));

    this.spinButton = this.makeSpinButton(hud, () => this.onSpinPressed());

    this.refreshMeters();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.onSpinPressed();
      }
    });

    app.ticker.add((t) => this.update(t.deltaMS / 1000));
  }

  // --- frame loop -----------------------------------------------------------
  private update(dt: number): void {
    this.grid.update(dt);
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.alpha = 0;
    }
  }

  // --- spin flow ------------------------------------------------------------
  private onSpinPressed(): void {
    if (this.busy) return;
    const bet = this.bets[this.betIndex];
    if (this.balance < bet) {
      this.flash('TAP CREDITS TO ADD');
      return;
    }
    this.busy = true;
    this.spinButton.setEnabled(false);
    this.balance -= bet;
    this.roundWin = 0;
    this.grid.clearHighlights();
    this.refreshMeters();
    this.doSpin(1);
  }

  /** One spin: model first (the law), then animate to its grid. */
  private doSpin(multiplier: number): void {
    const bet = this.bets[this.betIndex];
    const result = this.engine.spin(bet, multiplier);
    this.grid.spinTo(result.grid, () => this.resolveSpin(result));
  }

  private resolveSpin(result: SpinResult): void {
    this.roundWin += result.win;
    this.balance += result.win;
    this.grid.highlight(result.winningLines);
    this.refreshMeters();

    // Mirror the engine's playRound loop so the consumed RNG stream — and thus
    // the outcomes — match the model exactly: paid spin (×1), then up to N free
    // spins (×mult) with retriggers granting more.
    if (result.bonusTriggered) {
      this.freeRemaining += PARSHEET.bonus.free_spins;
      this.freeTotal += PARSHEET.bonus.free_spins;
      this.flash(`FREE SPINS ×${PARSHEET.bonus.multiplier}`);
    }

    if (this.freeRemaining > 0) {
      this.freeRemaining--;
      this.refreshFreeCounter();
      window.setTimeout(() => this.doSpin(PARSHEET.bonus.multiplier), FREE_SPIN_PAUSE_MS);
    } else {
      this.endRound();
    }
  }

  private endRound(): void {
    this.busy = false;
    this.freeTotal = 0;
    this.freeText.text = '';
    this.spinButton.setEnabled(true);
    this.spinButton.setLabel('SPIN');
  }

  private refreshFreeCounter(): void {
    const done = this.freeTotal - this.freeRemaining;
    this.freeText.text = `FREE SPINS  ${done} / ${this.freeTotal}   ·   ALL WINS ×${PARSHEET.bonus.multiplier}`;
    this.spinButton.setLabel('FREE');
  }

  // --- HUD helpers ----------------------------------------------------------
  private refreshMeters(): void {
    this.creditsText.text = this.balance.toLocaleString('en-US');
    this.winText.text = this.roundWin.toLocaleString('en-US');
    this.betText.text = this.bets[this.betIndex].toLocaleString('en-US');
  }

  private stepBet(dir: number): void {
    if (this.busy) return;
    this.betIndex = Math.max(0, Math.min(this.bets.length - 1, this.betIndex + dir));
    this.refreshMeters();
  }

  private flash(text: string): void {
    this.banner.text = text;
    this.banner.alpha = 1;
    this.bannerTimer = 1.8;
  }

  private randomGrid(symbolIds: readonly string[]): string[][] {
    const pick = (): string => symbolIds[Math.floor(Math.random() * symbolIds.length)];
    return Array.from({ length: PARSHEET.layout.reels }, () =>
      Array.from({ length: PARSHEET.layout.rows }, pick),
    );
  }

  private makeMeter(parent: Container, label: string, x: number, align: 'left' | 'center' | 'right'): Text {
    const anchorX = align === 'left' ? 0 : align === 'right' ? 1 : 0.5;
    const lbl = new Text({
      text: label,
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 11, fill: 0x8a93b8, letterSpacing: 2 }),
    });
    lbl.anchor.set(anchorX, 0);
    lbl.position.set(x, 492);
    parent.addChild(lbl);

    const val = new Text({
      text: '0',
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', fill: label === 'WIN' ? 0x7cffda : 0xffd24a, letterSpacing: 1 }),
    });
    val.anchor.set(anchorX, 0);
    val.position.set(x, 506);
    parent.addChild(val);

    if (label === 'CREDITS') {
      val.eventMode = 'static';
      val.cursor = 'pointer';
      val.on('pointertap', () => {
        if (this.balance < this.bets[this.betIndex]) {
          this.balance += TOP_UP;
          this.refreshMeters();
          this.flash(`+${TOP_UP.toLocaleString('en-US')} CREDITS`);
        }
      });
    }
    return val;
  }

  private makeRoundButton(parent: Container, cx: number, cy: number, glyph: string, onPress: () => void): void {
    const view = new Container();
    view.position.set(cx, cy);
    view.eventMode = 'static';
    view.cursor = 'pointer';
    const r = 17;
    const bg = new Graphics().circle(0, 0, r).fill({ color: 0x2a3354 }).stroke({ width: 2, color: 0xffd24a, alpha: 0.7 });
    const t = new Text({ text: glyph, style: new TextStyle({ fontFamily: 'Arial', fontSize: 22, fontWeight: 'bold', fill: 0xffe9b8 }) });
    t.anchor.set(0.5);
    t.y = -1;
    view.addChild(bg, t);
    view.hitArea = { contains: (px: number, py: number) => px * px + py * py <= r * r };
    view.on('pointertap', onPress);
    parent.addChild(view);
  }

  private makeSpinButton(parent: Container, onPress: () => void): Button {
    const w = 200;
    const h = 68;
    const x = (WIDTH - w) / 2;
    const y = 560;

    const view = new Container();
    view.position.set(x, y);
    view.eventMode = 'static';
    view.cursor = 'pointer';
    view.hitArea = { contains: (px: number, py: number) => px >= 0 && px <= w && py >= 0 && py <= h };

    const bg = new Graphics();
    const label = new Text({
      text: 'SPIN',
      style: new TextStyle({ fontFamily: 'Arial', fontSize: 26, fontWeight: 'bold', fill: 0x141a2e, letterSpacing: 3 }),
    });
    label.anchor.set(0.5);
    label.position.set(w / 2, h / 2);
    view.addChild(bg, label);

    let enabled = true;
    const paint = (fill: number, alpha = 1): void => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 16).fill({ color: fill, alpha });
      bg.roundRect(0, 0, w, h, 16).stroke({ width: 3, color: 0xfff3b0, alpha });
    };
    paint(0xffd24a);

    view.on('pointerover', () => enabled && paint(0xffe34d));
    view.on('pointerout', () => paint(enabled ? 0xffd24a : 0x6b6038, enabled ? 1 : 0.6));
    view.on('pointertap', () => enabled && onPress());
    parent.addChild(view);

    return {
      view,
      setEnabled(next: boolean) {
        enabled = next;
        view.cursor = next ? 'pointer' : 'default';
        label.alpha = next ? 1 : 0.5;
        paint(next ? 0xffd24a : 0x6b6038, next ? 1 : 0.6);
      },
      setLabel(text: string) {
        label.text = text;
      },
    };
  }
}
