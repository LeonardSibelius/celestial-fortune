import { Container, type Texture } from 'pixi.js';
import { createSymbol } from './symbols';
import { CELL, ROWS } from '../game/layout';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

type Phase = 'idle' | 'accel' | 'cruise' | 'decel';

interface PoolCell {
  readonly cont: Container;
  index: number;
  id: string;
}

/**
 * A single reel column — pure theater. The model decides the outcome up front;
 * `start(target, …)` is told exactly which 3 symbols to land on. The reel builds
 * a one-shot tape (current symbols → random blur → target) and scrolls `pos`
 * from 0 to the stop with an accelerate → cruise → ease-out profile, so the
 * visible window finishes showing the target.
 */
export class Reel {
  readonly view = new Container();

  private readonly textures: Map<string, Texture>;
  private readonly symbolIds: readonly string[];
  private readonly pool: PoolCell[] = [];

  private tape: string[] = [];
  private pos = 0;
  private target = 0;
  private phase: Phase = 'idle';
  private visible: string[];
  private pendingVisible: string[] = [];

  private vel = 0;
  private readonly cruiseVel = 26; // cells/sec
  private readonly accel = 90; // cells/sec²
  private decelFrom = 0;
  private decelDist = 0;
  private decelElapsed = 0;
  private decelDur = 0.7;

  constructor(textures: Map<string, Texture>, symbolIds: readonly string[], initial: readonly string[]) {
    this.textures = textures;
    this.symbolIds = symbolIds;
    this.visible = [...initial];
    this.tape = [...initial];

    for (let j = 0; j < ROWS + 2; j++) {
      const cont = new Container();
      cont.x = CELL / 2;
      this.view.addChild(cont);
      this.pool.push({ cont, index: Number.NaN, id: '' });
    }
    this.render();
  }

  get spinning(): boolean {
    return this.phase !== 'idle';
  }

  /** The 3 symbols currently shown (top → bottom). */
  get shown(): readonly string[] {
    return this.visible;
  }

  private randomId(): string {
    return this.symbolIds[Math.floor(Math.random() * this.symbolIds.length)];
  }

  /** Spin and land on `target` (3 symbols, top→bottom), travelling `spinCells`. */
  start(target: readonly string[], spinCells: number): void {
    const tape = [...this.visible]; // indices 0..2 keep continuity from the last stop
    for (let i = this.visible.length; i < spinCells; i++) tape.push(this.randomId());
    for (let r = 0; r < ROWS; r++) tape[spinCells + r] = target[r];

    this.tape = tape;
    this.target = spinCells;
    this.pendingVisible = [...target];
    this.pos = 0;
    this.vel = 0;
    this.phase = 'accel';
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'idle':
        return;

      case 'accel':
        this.vel = Math.min(this.cruiseVel, this.vel + this.accel * dt);
        this.pos += this.vel * dt;
        if (this.vel >= this.cruiseVel) this.phase = 'cruise';
        this.maybeDecel();
        break;

      case 'cruise':
        this.pos += this.vel * dt;
        this.maybeDecel();
        break;

      case 'decel': {
        this.decelElapsed += dt;
        const t = Math.min(1, this.decelElapsed / this.decelDur);
        this.pos = this.decelFrom + this.decelDist * easeOutCubic(t);
        if (t >= 1) {
          this.pos = this.target;
          this.phase = 'idle';
          this.visible = [...this.pendingVisible];
          this.render();
          return;
        }
        break;
      }
    }

    if (this.pos > this.target) this.pos = this.target;
    this.render();
  }

  private maybeDecel(): void {
    if (this.phase === 'decel') return;
    const remaining = this.target - this.pos;
    // Begin the ease-out when close enough that its initial speed (3·dist/dur)
    // matches cruise speed — no jolt at the hand-off.
    if (remaining <= this.cruiseVel * 0.27) {
      this.decelFrom = this.pos;
      this.decelDist = this.target - this.pos;
      this.decelElapsed = 0;
      this.decelDur = Math.max(0.45, Math.min(0.95, (3 * this.decelDist) / this.cruiseVel));
      this.phase = 'decel';
    }
  }

  private render(): void {
    const top = Math.floor(this.pos) - 1;
    for (let j = 0; j < this.pool.length; j++) {
      const cell = this.pool[j];
      const index = top + j;
      if (index < 0 || index >= this.tape.length) {
        cell.cont.visible = false;
        cell.index = Number.NaN;
        continue;
      }
      cell.cont.visible = true;
      cell.cont.y = (index - this.pos) * CELL + CELL / 2;
      const id = this.tape[index];
      if (cell.id !== id || cell.index !== index) {
        if (cell.id !== id) {
          cell.cont.removeChildren();
          cell.cont.addChild(createSymbol(id, CELL, this.textures));
          cell.id = id;
        }
        cell.index = index;
      }
    }
  }
}
