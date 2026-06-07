import { Container, Graphics } from 'pixi.js';
import { SYMBOLS, drawSymbol } from './symbols';

export const CELL = 120;
export const VISIBLE = 3;

const mod = (n: number, m: number): number => ((n % m) + m) % m;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

type SpinState = 'idle' | 'accel' | 'cruise' | 'decel';

/**
 * A single vertical reel.
 *
 * The strip is the 8 symbols in order. `scroll` is the distance (px) the strip
 * has travelled; each symbol is positioned by wrapping its slot modulo the full
 * strip height, so the reel loops forever with only 8 display objects.
 *
 * Spin profile: accelerate -> cruise (~1s) -> ease-out stop, landing aligned so
 * a random symbol sits on the center row.
 */
export class Reel {
  readonly view = new Container();
  private readonly cells: Container[] = [];
  private readonly strip: number[];
  private readonly stripPx: number;

  private scroll = 0;
  private state: SpinState = 'idle';

  // accel / cruise tuning
  private velocity = 0;
  private readonly cruiseSpeed = 2400; // px/s (= 20 cells/s)
  private readonly accel = 7000; // px/s^2
  private readonly cruiseTime = 1.0; // s
  private cruiseTimer = 0;

  // decel tuning (ease-out tween onto an aligned target)
  private decelStart = 0;
  private decelTarget = 0;
  private decelDuration = 1.1;
  private decelElapsed = 0;

  private onStop?: (centerSymbol: number) => void;

  constructor(onStop?: (centerSymbol: number) => void) {
    this.onStop = onStop;
    this.strip = SYMBOLS.map((_, i) => i);
    this.stripPx = this.strip.length * CELL;

    for (let i = 0; i < this.strip.length; i++) {
      const cell = new Container();
      const g = new Graphics();
      drawSymbol(g, this.strip[i], CELL);
      cell.addChild(g);
      cell.x = CELL / 2;
      this.view.addChild(cell);
      this.cells.push(cell);
    }
    this.layout();
  }

  get spinning(): boolean {
    return this.state !== 'idle';
  }

  /** The symbol type currently aligned to the center row. */
  get centerSymbol(): number {
    return mod(Math.round(this.scroll / CELL) + 1, this.strip.length);
  }

  spin(): void {
    if (this.spinning) return;
    this.state = 'accel';
    this.velocity = 0;
    this.cruiseTimer = 0;
  }

  update(dt: number): void {
    switch (this.state) {
      case 'idle':
        return;

      case 'accel':
        this.velocity = Math.min(this.cruiseSpeed, this.velocity + this.accel * dt);
        this.scroll += this.velocity * dt;
        if (this.velocity >= this.cruiseSpeed) {
          this.state = 'cruise';
          this.cruiseTimer = 0;
        }
        break;

      case 'cruise':
        this.scroll += this.velocity * dt;
        this.cruiseTimer += dt;
        if (this.cruiseTimer >= this.cruiseTime) this.beginDecel();
        break;

      case 'decel': {
        this.decelElapsed += dt;
        const t = clamp(this.decelElapsed / this.decelDuration, 0, 1);
        this.scroll = this.decelStart + (this.decelTarget - this.decelStart) * easeOutCubic(t);
        if (t >= 1) {
          this.scroll = this.decelTarget;
          this.state = 'idle';
          this.layout();
          this.onStop?.(this.centerSymbol);
          return;
        }
        break;
      }
    }
    this.layout();
  }

  private beginDecel(): void {
    const n = this.strip.length;
    const target = Math.floor(Math.random() * n); // random symbol on center row
    const targetMod = mod(target - 1, n); // aligned k must satisfy (k+1) mod n === target

    const minCells = 6; // guarantee a satisfying amount of travel
    let k = Math.ceil(this.scroll / CELL + minCells);
    while (mod(k, n) !== targetMod) k++;

    this.decelStart = this.scroll;
    this.decelTarget = k * CELL;
    this.decelElapsed = 0;
    // Match the ease-out's initial speed to cruise speed so there's no jolt.
    const dist = this.decelTarget - this.decelStart;
    this.decelDuration = clamp((3 * dist) / this.cruiseSpeed, 0.8, 1.6);
    this.state = 'decel';
  }

  private layout(): void {
    for (let i = 0; i < this.cells.length; i++) {
      const y = mod(i * CELL - this.scroll, this.stripPx);
      this.cells[i].y = y + CELL / 2;
    }
  }
}
