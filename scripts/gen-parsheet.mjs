// Generates the par sheets — the single source of truth for the math.
//   node scripts/gen-parsheet.mjs
//
// Two sheets share one structure (theory.ts/lines.ts evaluate either):
//   parsheet.gift.json    — the web-prototype economics (RTP ~132%), the default.
//   parsheet.casino.json  — same weights/lines/bonus, paytable retuned to a
//                           balanced ~95% RTP. Keeping weights identical means
//                           base-hit (~43%) and bonus frequency (~2.3%) are
//                           unchanged and already inside the casino targets;
//                           only win *amounts* shrink.
//
// The embedded theoretical_rtp is computed with the SAME rules as src/model and
// re-derived from theory.ts in parsheet.test.ts to guard drift.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(__dirname, '..', 'src', 'model');

const LAYOUT = { reels: 5, rows: 3 };
const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0],
  [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
];
const BONUS = { trigger_symbol: 'scatter', trigger_count: 3, free_spins: 8, multiplier: 3, retrigger: true, scope: 'anywhere' };
const BETS = [15, 30, 75, 150, 300, 750, 1500];

// id, name, weight; gift pays [3,4,5]; casino pays [3,4,5] (~0.70× gift, balanced).
const TABLE = [
  ['star', 'Star', 22, [5, 15, 30], [4, 11, 21]],
  ['moon', 'Moon', 20, [5, 15, 40], [4, 11, 28]],
  ['galaxy', 'Galaxy', 16, [10, 25, 60], [7, 18, 42]],
  ['saturn', 'Saturn', 12, [20, 50, 100], [14, 35, 70]],
  ['mars', 'Mars', 9, [30, 90, 220], [21, 63, 154]],
  ['crown', 'Crown', 5, [50, 180, 500], [35, 126, 350]],
  ['seven', 'Lucky 7', 3, [100, 300, 1000], [70, 210, 700]],
  ['wild', 'Wild', 4, [100, 300, 1000], [70, 210, 700], { wild: true }],
  ['scatter', 'Earth', 4, [0, 0, 0], [0, 0, 0], { scatter: true }],
];

function symbols(payIdx) {
  return TABLE.map(([id, name, weight, gift, casino, flags]) => {
    const pays = (payIdx === 0 ? gift : casino);
    return { id, name, weight, pays: { 3: pays[0], 4: pays[1], 5: pays[2] }, ...(flags || {}) };
  });
}

function theoretical(syms) {
  const totalWeight = syms.reduce((a, s) => a + s.weight, 0);
  const ids = syms.map((s) => s.id);
  const p = syms.map((s) => s.weight / totalWeight);
  const wildId = syms.find((s) => s.wild).id;
  const scatterId = syms.find((s) => s.scatter).id;
  const payOf = (id, count) => syms.find((s) => s.id === id).pays[count] ?? 0;

  const evalLine = (line) => {
    let base = null, count = 0;
    for (const k of line) {
      if (k === scatterId) break;
      if (k === wildId) { count++; continue; }
      if (base === null) { base = k; count++; }
      else if (k === base) count++;
      else break;
    }
    if (base === null && count > 0) base = wildId;
    if (count < 3 || base === null) return 0;
    return payOf(base, count);
  };

  let baseRtp = 0, lineHit = 0;
  const line = new Array(LAYOUT.reels);
  (function recurse(i, prob) {
    if (i === LAYOUT.reels) {
      const v = evalLine(line);
      if (v > 0) { baseRtp += prob * v; lineHit += prob; }
      return;
    }
    for (let s = 0; s < ids.length; s++) { line[i] = ids[s]; recurse(i + 1, prob * p[s]); }
  })(0, 1);

  const cells = LAYOUT.reels * LAYOUT.rows;
  const psc = syms.find((s) => s.scatter).weight / totalWeight;
  const binom = (n, k) => { let c = 1; for (let j = 0; j < k; j++) c = (c * (n - j)) / (j + 1); return c; };
  let q = 0;
  for (let k = BONUS.trigger_count; k <= cells; k++) q += binom(cells, k) * psc ** k * (1 - psc) ** (cells - k);
  const eFree = BONUS.free_spins / (1 - BONUS.free_spins * q);
  const bonusRtp = q * eFree * BONUS.multiplier * baseRtp;
  return { baseRtp, bonusRtp, totalRtp: baseRtp + bonusRtp, q, eFree, lineHit };
}

function pretty(v, indent = '') {
  const ni = indent + '  ';
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== 'object')) return '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']';
    return '[\n' + v.map((x) => ni + pretty(x, ni)).join(',\n') + '\n' + indent + ']';
  }
  if (v && typeof v === 'object') {
    return '{\n' + Object.keys(v).map((k) => ni + JSON.stringify(k) + ': ' + pretty(v[k], ni)).join(',\n') + '\n' + indent + '}';
  }
  return JSON.stringify(v);
}

function build({ file, name, source, payIdx }) {
  const syms = symbols(payIdx);
  const pool = [];
  for (const s of syms) for (let i = 0; i < s.weight; i++) pool.push(s.id);
  const reels = Array.from({ length: LAYOUT.reels }, () => ({ strip: [...pool] }));
  const t = theoretical(syms);

  const sheet = {
    name,
    version: '0.1.0',
    source,
    currency: 'credits',
    layout: LAYOUT,
    spin_model: 'independent_cells',
    bets: BETS,
    default_bet: 150,
    lines: PAYLINES.length,
    pays_direction: 'left_to_right',
    min_match: 3,
    symbols: syms,
    reels,
    paylines: PAYLINES,
    bonus: BONUS,
    theoretical_rtp: Number(t.totalRtp.toFixed(8)),
  };
  writeFileSync(join(MODEL_DIR, file), pretty(sheet) + '\n');
  console.log(`${file.padEnd(22)} RTP=${(100 * t.totalRtp).toFixed(3)}%  base=${(100 * t.baseRtp).toFixed(2)}%  q=${(100 * t.q).toFixed(3)}%  lineHit=${(100 * t.lineHit).toFixed(2)}%`);
}

build({ file: 'parsheet.gift.json', name: 'Celestial Fortune', source: 'celestial-fortune-web-prototype', payIdx: 0 });
build({ file: 'parsheet.casino.json', name: 'Celestial Fortune — Casino', source: 'retuned to 94.5-95.5% RTP (gift weights, scaled paytable)', payIdx: 1 });
