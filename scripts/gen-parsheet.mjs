// Generates src/model/parsheet.json — the single source of truth for the math.
//
// Plain Node ESM (no TS toolchain needed). The canonical symbol/pay/line/bonus
// data lives here; strips are the weighted bag expanded per reel. The embedded
// theoretical_rtp is computed with the SAME evaluation rules as src/model, and
// a unit test (parsheet.test.ts) re-derives it from theory.ts to guard drift.
//
//   node scripts/gen-parsheet.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- canonical data (transcribed from the web prototype) -------------------
const SYMBOLS = [
  { id: 'star', name: 'Star', weight: 22, pays: { 3: 5, 4: 15, 5: 30 } },
  { id: 'moon', name: 'Moon', weight: 20, pays: { 3: 5, 4: 15, 5: 40 } },
  { id: 'galaxy', name: 'Galaxy', weight: 16, pays: { 3: 10, 4: 25, 5: 60 } },
  { id: 'saturn', name: 'Saturn', weight: 12, pays: { 3: 20, 4: 50, 5: 100 } },
  { id: 'mars', name: 'Mars', weight: 9, pays: { 3: 30, 4: 90, 5: 220 } },
  { id: 'crown', name: 'Crown', weight: 5, pays: { 3: 50, 4: 180, 5: 500 } },
  { id: 'seven', name: 'Lucky 7', weight: 3, pays: { 3: 100, 4: 300, 5: 1000 } },
  { id: 'wild', name: 'Wild', weight: 4, pays: { 3: 100, 4: 300, 5: 1000 }, wild: true },
  { id: 'scatter', name: 'Earth', weight: 4, pays: { 3: 0, 4: 0, 5: 0 }, scatter: true },
];

const LAYOUT = { reels: 5, rows: 3 };

const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0],
  [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
];

const BONUS = {
  trigger_symbol: 'scatter',
  trigger_count: 3,
  free_spins: 8,
  multiplier: 3,
  retrigger: true,
  scope: 'anywhere',
};

const BETS = [15, 30, 75, 150, 300, 750, 1500];

// ---- weighted bag -> one strip per reel (all reels identical) --------------
const pool = [];
for (const s of SYMBOLS) for (let i = 0; i < s.weight; i++) pool.push(s.id);
const reels = Array.from({ length: LAYOUT.reels }, () => ({ strip: [...pool] }));

// ---- theoretical RTP (mirrors src/model/lines.ts + theory.ts) --------------
const wildId = SYMBOLS.find((s) => s.wild).id;
const scatterId = SYMBOLS.find((s) => s.scatter).id;
const payOf = (id, count) => SYMBOLS.find((s) => s.id === id).pays[count] ?? 0;

function evaluateLine(lineSymbols) {
  let base = null;
  let count = 0;
  for (const k of lineSymbols) {
    if (k === scatterId) break;
    if (k === wildId) { count++; continue; }
    if (base === null) { base = k; count++; }
    else if (k === base) count++;
    else break;
  }
  if (base === null && count > 0) base = wildId;
  if (count < 3 || base === null) return 0;
  return payOf(base, count);
}

const totalWeight = SYMBOLS.reduce((a, s) => a + s.weight, 0);
const ids = SYMBOLS.map((s) => s.id);
const p = SYMBOLS.map((s) => s.weight / totalWeight);

let baseRtp = 0;
const line = new Array(LAYOUT.reels);
(function recurse(i, prob) {
  if (i === LAYOUT.reels) {
    const v = evaluateLine(line);
    if (v > 0) baseRtp += prob * v;
    return;
  }
  for (let s = 0; s < ids.length; s++) { line[i] = ids[s]; recurse(i + 1, prob * p[s]); }
})(0, 1);

const cells = LAYOUT.reels * LAYOUT.rows;
const psc = SYMBOLS.find((s) => s.scatter).weight / totalWeight;
const binom = (n, k) => { let c = 1; for (let j = 0; j < k; j++) c = (c * (n - j)) / (j + 1); return c; };
let q = 0;
for (let k = BONUS.trigger_count; k <= cells; k++) q += binom(cells, k) * psc ** k * (1 - psc) ** (cells - k);
const expectedFreeSpins = BONUS.free_spins / (1 - BONUS.free_spins * q);
const bonusRtp = q * expectedFreeSpins * BONUS.multiplier * baseRtp;
const theoreticalRtp = baseRtp + bonusRtp;

// ---- assemble + write ------------------------------------------------------
const sheet = {
  name: 'Celestial Fortune',
  version: '0.1.0',
  source: 'celestial-fortune-web-prototype',
  currency: 'credits',
  layout: LAYOUT,
  spin_model: 'independent_cells',
  bets: BETS,
  default_bet: 150,
  lines: PAYLINES.length,
  pays_direction: 'left_to_right',
  min_match: 3,
  symbols: SYMBOLS,
  reels,
  paylines: PAYLINES,
  bonus: BONUS,
  theoretical_rtp: Number(theoreticalRtp.toFixed(8)),
};

// Pretty-print, but keep primitive-only arrays (strips, paylines) on one line.
function pretty(v, indent = '') {
  const ni = indent + '  ';
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== 'object')) {
      return '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']';
    }
    return '[\n' + v.map((x) => ni + pretty(x, ni)).join(',\n') + '\n' + indent + ']';
  }
  if (v && typeof v === 'object') {
    return '{\n' + Object.keys(v).map((k) => ni + JSON.stringify(k) + ': ' + pretty(v[k], ni)).join(',\n') + '\n' + indent + '}';
  }
  return JSON.stringify(v);
}

const out = join(__dirname, '..', 'src', 'model', 'parsheet.json');
writeFileSync(out, pretty(sheet) + '\n');
console.log(`wrote ${out}`);
console.log(`  baseRtp        = ${baseRtp.toFixed(6)}`);
console.log(`  bonusRtp       = ${bonusRtp.toFixed(6)}`);
console.log(`  theoretical RTP= ${theoreticalRtp.toFixed(6)}`);
console.log(`  scatter q      = ${q.toFixed(6)}  E[freeSpins|trig]=${expectedFreeSpins.toFixed(4)}`);
