/**
 * WebAudio-synthesized SFX — no asset files, everything is generated from
 * oscillators + noise. Lazy-initialised on the first user gesture (browser
 * autoplay policy), mute state persisted to localStorage.
 *
 * Imported only by the game/UI layer; src/model never touches audio.
 */
const MUTE_KEY = 'cf_muted';
const MASTER_VOLUME = 0.5;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;

  constructor() {
    this.muted = readMuted();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Persisted; updates the live master gain if the context exists. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore storage failures */
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.01);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- lazy context -------------------------------------------------------
  private ensure(): AudioContext | null {
    if (this.muted && !this.ctx) return null; // don't even create until needed
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // --- primitives ---------------------------------------------------------
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private sweep(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, vol: number, freq = 1000, q = 1, when = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // --- events -------------------------------------------------------------
  /** Spin button / reels accelerating. Also the first-gesture lazy-init point. */
  spinStart(): void {
    this.sweep(200, 460, 0.2, 'sawtooth', 0.1);
    this.noise(0.14, 0.04, 1400, 0.7);
  }

  /** One reel landing — pitch rises per reel for a staggered ticker feel. */
  reelStop(index: number): void {
    this.tone(170 + index * 45, 0.08, 'triangle', 0.22);
    this.noise(0.04, 0.06, 700, 1);
  }

  /** Tiered win chime — longer/brighter arpeggio as the win grows (× bet). */
  win(ratio: number): void {
    const steps = ratio < 5 ? 3 : ratio < 15 ? 4 : ratio < 40 ? 5 : 6;
    const root = 523.25;
    const semis = [0, 4, 7, 12, 16, 19];
    for (let i = 0; i < steps; i++) {
      this.tone(root * Math.pow(2, semis[i] / 12), 0.22, 'triangle', 0.16, i * 0.06);
    }
  }

  /** Big-win escalation for wins ≥ 50× bet — rising hits that scale with size. */
  bigWin(ratio: number): void {
    const hits = Math.min(8, 4 + Math.floor(ratio / 50));
    for (let i = 0; i < hits; i++) {
      const f = 300 * (1 + i * 0.14);
      this.sweep(f, f * 2, 0.26, 'sawtooth', 0.16, i * 0.13);
    }
    // capstone chord
    const at = hits * 0.13;
    for (const f of [523.25, 659.25, 783.99, 1046.5]) this.tone(f, 0.6, 'square', 0.12, at);
  }

  /** Bonus entry fanfare. */
  freeSpinsFanfare(): void {
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => {
      this.tone(f, 0.42, 'sawtooth', 0.16, i * 0.1);
      this.tone(f, 0.42, 'square', 0.05, i * 0.1);
    });
  }

  /** Free-spins retrigger sting. */
  retriggerSting(): void {
    this.tone(880, 0.12, 'square', 0.18);
    this.tone(1320, 0.2, 'square', 0.14, 0.06);
    this.noise(0.1, 0.05, 2200, 1.2);
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
