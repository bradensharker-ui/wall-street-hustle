// =============================================================================
// sim.js — pure simulation core for Wall Street Hustle.
//
// Everything in this file is deterministic-by-math, framework-free, and
// importable from both the React app and the test runner. No DOM, no React,
// no audio, no localStorage. This is the layer that gets regression-tested
// against documented identities; if any of the calibration claims drift, the
// tests should fail loudly.
//
// Calibration provenance lives in CALIBRATION.md. The `source:` strings here
// are short pointers to that document, not citations.
// =============================================================================

// ===== ASSETS =====
// μ (annual drift) and σ (annual vol) are INSTRUCTIONAL ASSUMPTIONS chosen to
// sit near long-run history — not forecasts. Each entry points to a section
// in CALIBRATION.md that documents the dataset, formula, and verification
// status. Numbers are placeholders until a dated retrieval is logged there.
export const ASSETS = [
  { id: 'TBILL', name: 'US T-Bills (3-mo)', emoji: '🏛️', mu: 0.045, sigma: 0.010, spread: 0.001,
    desc: 'Cash-like short Treasury', source: 'See CALIBRATION.md §tbill' },
  { id: 'BOND', name: 'US 10-yr Treasury', emoji: '📜', mu: 0.045, sigma: 0.08, spread: 0.002,
    desc: '10-year government bond', source: 'See CALIBRATION.md §bond' },
  { id: 'SPX', name: 'S&P 500 index fund', emoji: '🏢', mu: 0.10, sigma: 0.17, spread: 0.001,
    desc: 'Broad US stock market', source: 'See CALIBRATION.md §spx' },
  { id: 'TECH', name: 'Nasdaq-100 (large tech)', emoji: '💻', mu: 0.12, sigma: 0.20, spread: 0.002,
    desc: 'Concentrated large-cap tech', source: 'See CALIBRATION.md §tech' },
  { id: 'GOLD', name: 'Gold', emoji: '🥇', mu: 0.05, sigma: 0.155, spread: 0.005,
    desc: 'Gold (no yield)', source: 'See CALIBRATION.md §gold' },
  { id: 'BTC', name: 'Bitcoin', emoji: '₿', mu: 0.10, sigma: 0.55, spread: 0.010,
    desc: 'Crypto — extreme volatility', source: 'See CALIBRATION.md §btc' },
  { id: 'MEME', name: 'Meme stock ($YOLO)', emoji: '🚀', mu: -0.05, sigma: 1.20, spread: 0.020,
    desc: 'Hype-driven single stock', source: 'See CALIBRATION.md §meme (didactic, not a real security)' },
];

// ===== STARTING SITUATION =====
// One realistic situation for everyone (no character classes/buffs). Lessons
// emerge from the player's own choices, not assigned archetypes.
// incomePerYear is an investable take-home surplus; per-turn = incomePerYear*dt
// so total contributions are the same regardless of game length.
export const START = {
  cash: 1000,
  loan: 4000,            // student loan
  cc: 0,
  loanAPR: 0.06,         // typical student-loan APR
  ccAPR: 0.22,           // credit-card APR
  incomePerYear: 3000,   // ~$250/mo investable surplus
  ccLimit: 5000,
};

// ===== AVATAR =====
export const AVATAR_FACES = ['🧑', '👩', '🧔', '👨🏽', '👩🏿', '🧑🏻', '🧑🏾', '👵'];
export const AVATAR_ACCESSORIES = ['—', '🎧', '🧢', '👓', '🎩', '💼', '🚀', '🌟'];
export const AVATAR_COLORS = ['#39ff14', '#39a0ff', '#ff7b39', '#d97bff', '#ffd23f', '#ff5d8f'];
export function defaultAvatar() {
  return { face: '🧑', accessory: '—', color: '#39ff14', name: 'You', handle: 'rookie_investor' };
}

// ===== LIFESTYLE TIERS =====
export const LIFESTYLE_TIERS = [
  { threshold: 0, name: 'Studio Apartment', emoji: '🏚️', bg: '#0a0a0a', accent: '#666' },
  { threshold: 5000, name: 'Apartment', emoji: '🏠', bg: '#0a1a0a', accent: '#4a8' },
  { threshold: 15000, name: 'Used Car', emoji: '🚗', bg: '#0a1a1a', accent: '#5a9' },
  { threshold: 50000, name: 'Suburban House', emoji: '🏡', bg: '#0a1a14', accent: '#6ab' },
  { threshold: 150000, name: 'Luxury Condo', emoji: '🏙️', bg: '#0a141a', accent: '#7bc' },
  { threshold: 500000, name: 'Yacht', emoji: '🛥️', bg: '#0a1424', accent: '#8cd' },
  { threshold: 2000000, name: 'Private Island', emoji: '🏝️', bg: '#142428', accent: '#aef' },
  { threshold: 10000000, name: 'Space Station', emoji: '🚀', bg: '#241428', accent: '#cef' },
];

export function getLifestyle(netWorth) {
  for (let i = LIFESTYLE_TIERS.length - 1; i >= 0; i--) {
    if (netWorth >= LIFESTYLE_TIERS[i].threshold) return { ...LIFESTYLE_TIERS[i], index: i };
  }
  return { ...LIFESTYLE_TIERS[0], index: 0 };
}

// ===== GAME LENGTH =====
// dt = HORIZON_YEARS / totalTurns. Shorter games take bigger time-steps over
// the same 10 years; analytical median (predictedMedian) and Monte Carlo
// reconcile regardless.
export const HORIZON_YEARS = 10;
export const GAME_LENGTHS = {
  quick: { turns: 40, label: 'Quick (40)' },
  standard: { turns: 100, label: 'Standard (100)' },
};
export const AUTO_SPEEDS = {
  off: { ms: 0, label: 'Manual' },
  slow: { ms: 1400, label: 'Auto · Slow' },
  fast: { ms: 650, label: 'Auto · Fast' },
};

// ===== EVENT PROCESS =====
// Poisson-style arrivals so the per-turn probability scales with dt — expected
// shock count over a 10-year game is the same for any length. Magnitudes are
// damped so the calibrated GBM trend, not an arbitrary shock stream, drives
// realized returns. The Monte Carlo function replays this exact process.
export const EVENT_RATE_PER_YEAR = 0.7; // ≈7 notable events per 10-year game
export const EVENT_SHOCK_SCALE = 0.5;   // damp toward calibrated trend
export function eventProbPerTurn(dt) { return Math.min(0.9, EVENT_RATE_PER_YEAR * dt); }

export const EVENTS = [
  { text: '🏦 Fed surprise rate hike! Bonds dump.', shocks: { BOND: -0.04, TECH: -0.06, SPX: -0.03 }, sfx: 'loss' },
  { text: '🏦 Fed unexpected rate cut! Risk assets rally.', shocks: { BOND: 0.03, TECH: 0.05, SPX: 0.03 }, sfx: 'cashRegister' },
  { text: '📱 Reddit pumps $YOLO!', shocks: { MEME: 0.40 }, sfx: 'cashRegister' },
  { text: '💀 $YOLO holders panic.', shocks: { MEME: -0.45 }, sfx: 'loss' },
  { text: '🚀 Bitcoin ETF inflows surge!', shocks: { BTC: 0.20 }, sfx: 'cashRegister' },
  { text: '⛓️ Exchange hack! Bitcoin freefall.', shocks: { BTC: -0.25 }, sfx: 'loss' },
  { text: '🥇 Geopolitical tension — gold rallies.', shocks: { GOLD: 0.06 } },
  { text: '📊 Hot CPI print. Gold up, bonds down.', shocks: { GOLD: 0.04, BOND: -0.03 } },
  { text: '📉 Recession! Stocks dump, bonds rally.', shocks: { SPX: -0.05, TECH: -0.08, MEME: -0.15, BTC: -0.20, BOND: 0.03 }, sfx: 'loss' },
  { text: '🌪️ CRISIS! Everything dumps.', shocks: { SPX: -0.08, TECH: -0.10, MEME: -0.25, BTC: -0.30, GOLD: 0.03, BOND: 0.02 }, sfx: 'crisis' },
  { text: '📈 Bull market euphoria!', shocks: { SPX: 0.04, TECH: 0.06, MEME: 0.12, BTC: 0.15 }, sfx: 'cashRegister' },
  { text: '😴 Quiet day.', shocks: {} },
  { text: '☕ Low-volume session.', shocks: {} },
  { text: '🛢️ Oil spikes. Inflation fears.', shocks: { GOLD: 0.03, TECH: -0.02, BOND: -0.02 } },
  { text: '🤖 AI breakthrough at TechCo!', shocks: { TECH: 0.08, SPX: 0.02 }, sfx: 'cashRegister' },
];

// ===== RNG =====
// All gameplay randomness flows through a seedable PRNG (mulberry32). One
// seed yields one 10-year market path. This is what lets an entire classroom
// play the *identical* game from one teacher-generated code.
//
// Cosmetic randomness (audio noise, eye blinks, screen-shake jitter) stays
// on Math.random — it doesn't influence state and shouldn't burn seed bits.
function defaultRng() { return Math.random(); }

// FNV-1a 32-bit hash — turns a human-readable seed code into a numeric seed.
export function hashSeed(input) {
  const str = String(input);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, well-known PRNG. Returns a stateful function with
// getState/setState attached so the autosave can snapshot the RNG position and
// restore it byte-identically after a refresh. This preserves determinism
// across refreshes for synchronized classroom play.
export function makeRng(seed) {
  let a = (typeof seed === 'string' ? hashSeed(seed) : (seed >>> 0));
  function rng() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  rng.getState = () => a >>> 0;
  rng.setState = (newA) => { a = newA >>> 0; };
  return rng;
}

// Seed-code alphabet: no 0/O, 1/I/L — fewer "what character is that?" issues
// when a teacher reads a code aloud or writes it on the board.
const SEED_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateSeedCode(rng = Math.random) {
  let body = '';
  for (let i = 0; i < 6; i++) body += SEED_ALPHABET[Math.floor(rng() * SEED_ALPHABET.length)];
  return `WSH-${body}`;
}

export function normalizeSeedCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
}

export function pickRandom(arr, rng = defaultRng) {
  return arr[Math.floor(rng() * arr.length)];
}

// ===== MATH =====
// Box–Muller transform: two uniforms → one standard normal sample.
export function gaussian(rng = defaultRng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// One step of geometric Brownian motion with an optional additive log-shock.
// Closed form: S_{t+dt} = S_t · exp((μ − σ²/2)·dt + σ·√dt·Z + shock).
// Floored at $0.50 so a price never reaches zero (avoids log singularities).
export function stepPrice(price, mu, sigma, shock = 0, dt = 0.1, rng = defaultRng) {
  const z = gaussian(rng);
  const drift = (mu - (sigma * sigma) / 2) * dt;
  const diffusion = sigma * Math.sqrt(dt) * z;
  return Math.max(0.5, price * Math.exp(drift + diffusion + shock));
}

// Analytical median of GBM with no shocks: S0 · exp(T·(μ − σ²/2)).
// This is the "trend" line the Monte Carlo is compared to — but realized
// outcomes also include the damped event process, so MC sits NEAR this line,
// not on it.
export function predictedMedian(mu, sigma, years = 10, start = 100) {
  return start * Math.exp(years * (mu - (sigma * sigma) / 2));
}

// Monte Carlo that REPLAYS the same event process the game uses. The Teacher
// panel uses this output to compare "trend" (predictedMedian) vs "realized
// with events." A tight band, not a point match, is the right expectation.
export function monteCarloSim(asset, numRuns = 1000, turns = 100, rng = defaultRng) {
  const dt = HORIZON_YEARS / turns;
  const results = [];
  const pEvent = eventProbPerTurn(dt);
  for (let r = 0; r < numRuns; r++) {
    let price = 100;
    for (let t = 0; t < turns; t++) {
      let shock = 0;
      if (rng() < pEvent) {
        const ev = EVENTS[Math.floor(rng() * EVENTS.length)];
        shock = (ev.shocks[asset.id] || 0) * EVENT_SHOCK_SCALE;
      }
      price = stepPrice(price, asset.mu, asset.sigma, shock, dt, rng);
    }
    results.push(price);
  }
  results.sort((a, b) => a - b);
  return {
    p10: results[Math.floor(numRuns * 0.10)],
    median: results[Math.floor(numRuns * 0.50)],
    p90: results[Math.floor(numRuns * 0.90)],
    pctPositive: results.filter(x => x > 100).length / numRuns * 100,
    pctDoubled: results.filter(x => x > 200).length / numRuns * 100,
    pctHalved: results.filter(x => x < 50).length / numRuns * 100,
    predicted: predictedMedian(asset.mu, asset.sigma),
  };
}

// ===== SCHEDULED EVENTS =====
// Earnings / Fed / IPO punctuation that the player sees coming. Strides scale
// with totalTurns so the cadence is consistent across game lengths.
export function createSchedule(totalTurns = 100, rng = defaultRng) {
  const schedule = [];
  const N = totalTurns;
  const earnStride = Math.max(4, Math.round(0.10 * N));
  const fedStride = Math.max(5, Math.round(0.13 * N));
  const ipoStride = Math.max(8, Math.round(0.25 * N));
  for (let t = Math.max(4, Math.round(0.08 * N)); t < N; t += earnStride) {
    if (rng() < 0.85) {
      const beat = rng() < 0.55;
      schedule.push({ turn: t + Math.floor(rng() * 3), type: 'earnings', asset: 'TECH', text: `💻 TechCo earnings on T${t}`, beat });
    }
    if (rng() < 0.7) {
      const beat = rng() < 0.55;
      schedule.push({ turn: t + Math.floor(rng() * 3) + 2, type: 'earnings', asset: 'SPX', text: `🏢 Mega-cap earnings season T${t+2}`, beat });
    }
  }
  for (let t = Math.max(5, Math.round(0.12 * N)); t < N; t += fedStride) {
    const direction = rng() < 0.5 ? 1 : -1;
    const surprise = rng() < 0.3;
    schedule.push({ turn: t, type: 'fed', text: `🏦 Fed meeting T${t}`, direction, surprise });
  }
  for (let t = Math.round(0.20 * N); t < 0.9 * N; t += ipoStride) {
    schedule.push({ turn: t, type: 'ipo', text: `🎯 NewCo IPO T${t}` });
  }
  return schedule.sort((a, b) => a.turn - b.turn);
}
