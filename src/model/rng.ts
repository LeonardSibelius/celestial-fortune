/**
 * Seeded, deterministic PRNG — mulberry32.
 *
 * Deliberately NOT Math.random: the regulator suite and the C++ port must be
 * able to replay the exact same stream from a seed. Fast, 32-bit state, good
 * enough statistical quality for slot RNG simulation (this is a model harness,
 * not a certified production RNG).
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Force to uint32. Avoid a zero state landing on a degenerate stream.
    this.state = (seed >>> 0) || 0x1a2b3c4d;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Next integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}
