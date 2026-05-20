// =============================================================================
// sim.test.js — regression tests for the simulation core.
//
// These tests pin down the calibrated behavior that the Teacher Dashboard
// claims is "verified math." If the parameters drift or the model changes in
// a way that breaks an identity or a pedagogical ordering, these should fail
// loudly BEFORE the change ships.
//
// Statistical tests use a SEEDED RNG (mulberry32) so the results are
// deterministic — the same seed produces the same Monte Carlo numbers every
// run, and a tolerance band catches genuine drift without flaky failures.
// =============================================================================

import { describe, test, expect } from 'vitest';
import {
  ASSETS, HORIZON_YEARS, EVENT_RATE_PER_YEAR, EVENT_SHOCK_SCALE,
  eventProbPerTurn, gaussian, stepPrice, predictedMedian, monteCarloSim,
  getLifestyle, LIFESTYLE_TIERS,
  makeRng, hashSeed, generateSeedCode, normalizeSeedCode,
} from './sim.js';

// Small, well-known seedable PRNG. Same seed → identical sequence everywhere.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const asset = (id) => ASSETS.find((a) => a.id === id);

// -----------------------------------------------------------------------------
// MATH IDENTITIES (deterministic)
// -----------------------------------------------------------------------------

describe('predictedMedian (GBM analytical median)', () => {
  test('matches the closed form S₀·exp(T·(μ − σ²/2))', () => {
    const cases = [
      { mu: 0.10, sigma: 0.17, T: 10, S: 100 },
      { mu: 0.045, sigma: 0.08, T: 10, S: 100 },
      { mu: -0.05, sigma: 1.20, T: 10, S: 100 },
    ];
    for (const c of cases) {
      const expected = c.S * Math.exp(c.T * (c.mu - (c.sigma * c.sigma) / 2));
      expect(predictedMedian(c.mu, c.sigma, c.T, c.S)).toBeCloseTo(expected, 8);
    }
  });

  test('vol drag: an asset with positive μ but large σ loses at the median', () => {
    // BTC under our calibration (μ=0.10, σ=0.55): geometric drift is negative.
    const m = predictedMedian(0.10, 0.55, 10, 100);
    expect(m).toBeLessThan(100); // loses at the median despite positive μ
    expect(m).toBeGreaterThan(20); // but not absurdly so
  });
});

describe('stepPrice (one GBM step)', () => {
  test('is deterministic given a deterministic rng', () => {
    // Seed two RNGs identically — same result twice.
    const r1 = mulberry32(42), r2 = mulberry32(42);
    const p1 = stepPrice(100, 0.10, 0.17, 0, 0.1, r1);
    const p2 = stepPrice(100, 0.10, 0.17, 0, 0.1, r2);
    expect(p1).toBe(p2);
  });

  test('floors at $0.50 so prices never reach zero (no log singularity)', () => {
    // Force a very negative shock — output should clamp at the floor.
    const r = mulberry32(7);
    const p = stepPrice(1, 0.10, 0.17, -100, 0.1, r);
    expect(p).toBe(0.5);
  });
});

describe('gaussian (Box–Muller)', () => {
  test('over N=10k samples, mean ≈ 0 and std ≈ 1', () => {
    const r = mulberry32(123);
    const N = 10000;
    let sum = 0, sumSq = 0;
    for (let i = 0; i < N; i++) {
      const z = gaussian(r);
      sum += z;
      sumSq += z * z;
    }
    const mean = sum / N;
    const variance = sumSq / N - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.05);
  });
});

// -----------------------------------------------------------------------------
// EVENT PROCESS (dt-scaling)
// -----------------------------------------------------------------------------

describe('eventProbPerTurn (Poisson-style dt-scaling)', () => {
  test('scales linearly with dt for small dt', () => {
    // λ · dt at standard (dt=0.1) and quick (dt=0.25)
    expect(eventProbPerTurn(0.1)).toBeCloseTo(EVENT_RATE_PER_YEAR * 0.1, 10);
    expect(eventProbPerTurn(0.25)).toBeCloseTo(EVENT_RATE_PER_YEAR * 0.25, 10);
  });

  test('clamps at 0.9 so dt=1 does not produce probability > 1', () => {
    expect(eventProbPerTurn(2)).toBeLessThanOrEqual(0.9);
  });

  test('expected shocks over 10 years is the same for Quick (40) and Standard (100)', () => {
    // E[# shocks] = totalTurns · pEvent = totalTurns · (λ · dt) = λ · 10
    const standardExpected = 100 * eventProbPerTurn(HORIZON_YEARS / 100);
    const quickExpected = 40 * eventProbPerTurn(HORIZON_YEARS / 40);
    expect(standardExpected).toBeCloseTo(quickExpected, 8);
    expect(standardExpected).toBeCloseTo(EVENT_RATE_PER_YEAR * HORIZON_YEARS, 8);
  });
});

// -----------------------------------------------------------------------------
// STATISTICAL CLAIMS (seeded Monte Carlo)
// -----------------------------------------------------------------------------

// Helper: run MC for one asset with a fresh seed each time.
const N_RUNS = 2000;
const TURNS = 100;
function mc(id, seed) {
  return monteCarloSim(asset(id), N_RUNS, TURNS, mulberry32(seed));
}

describe('Asset ordering (pedagogical invariants)', () => {
  test('SPX median > BOND median (equity risk premium)', () => {
    const spx = mc('SPX', 1001), bond = mc('BOND', 1002);
    expect(spx.median).toBeGreaterThan(bond.median);
  });

  test('TECH median > SPX median (higher drift wins over higher vol, modestly)', () => {
    const tech = mc('TECH', 1003), spx = mc('SPX', 1004);
    expect(tech.median).toBeGreaterThan(spx.median);
  });

  test('MEME median < 50 (negative drift + extreme vol = wealth trap)', () => {
    const meme = mc('MEME', 1005);
    expect(meme.median).toBeLessThan(50);
  });

  test('BTC median < SPX median (vol drag dominates the higher drift)', () => {
    const btc = mc('BTC', 1006), spx = mc('SPX', 1007);
    expect(btc.median).toBeLessThan(spx.median);
  });
});

describe('Monte Carlo ↔ analytical trend reconciliation', () => {
  // With damped events, realized median sits NEAR the GBM trend, not on it.
  // The Teacher panel uses a 25% band; tests pin that contract.
  const TOLERANCE = 0.30; // a hair looser than the UI to absorb seed variance
  for (const a of [{ id: 'TBILL', seed: 2001 },
                   { id: 'BOND',  seed: 2002 },
                   { id: 'SPX',   seed: 2003 },
                   { id: 'TECH',  seed: 2004 },
                   { id: 'GOLD',  seed: 2005 }]) {
    test(`${a.id}: |realized median − trend| / trend < ${TOLERANCE}`, () => {
      const r = mc(a.id, a.seed);
      const drift = Math.abs(r.median - r.predicted) / r.predicted;
      expect(drift).toBeLessThan(TOLERANCE);
    });
  }
});

// -----------------------------------------------------------------------------
// SEEDED RNG — determinism contract for the classroom feature
// -----------------------------------------------------------------------------

describe('makeRng / hashSeed (classroom determinism)', () => {
  test('the same seed (string or number) produces an identical sequence', () => {
    const r1 = makeRng('WSH-7K3M9P');
    const r2 = makeRng('WSH-7K3M9P');
    for (let i = 0; i < 50; i++) {
      expect(r1()).toBe(r2());
    }
  });

  test('different seeds produce different sequences', () => {
    const r1 = makeRng('WSH-AAAAAA');
    const r2 = makeRng('WSH-BBBBBB');
    let differences = 0;
    for (let i = 0; i < 20; i++) {
      if (r1() !== r2()) differences++;
    }
    expect(differences).toBeGreaterThan(15); // overwhelmingly different
  });

  test('two students on the same seed get byte-identical 100-step price paths', () => {
    const spx = asset('SPX');
    const r1 = makeRng('WSH-CLASS01');
    const r2 = makeRng('WSH-CLASS01');
    const path1 = [], path2 = [];
    let p1 = 100, p2 = 100;
    for (let i = 0; i < 100; i++) {
      p1 = stepPrice(p1, spx.mu, spx.sigma, 0, 0.1, r1);
      p2 = stepPrice(p2, spx.mu, spx.sigma, 0, 0.1, r2);
      path1.push(p1); path2.push(p2);
    }
    expect(path1).toEqual(path2);
  });

  test('rng() outputs are in [0, 1)', () => {
    const r = makeRng(0xDEADBEEF);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('Seed-code formatting', () => {
  test('generateSeedCode produces a WSH-prefixed 10-char code from the safe alphabet', () => {
    const code = generateSeedCode(makeRng(1234));
    expect(code).toMatch(/^WSH-[2-9A-HJ-NP-Z]{6}$/);
    expect(code).not.toContain('0');
    expect(code).not.toContain('O');
    expect(code).not.toContain('1');
    expect(code).not.toContain('I');
    expect(code).not.toContain('L');
  });

  test('normalizeSeedCode strips junk and uppercases', () => {
    expect(normalizeSeedCode(' wsh-7k3m9p ')).toBe('WSH-7K3M9P');
    expect(normalizeSeedCode('wsh.7k!3m9p?')).toBe('WSH7K3M9P');
    expect(normalizeSeedCode(null)).toBe('');
  });
});

// -----------------------------------------------------------------------------
// LIFESTYLE TIER BOUNDARIES
// -----------------------------------------------------------------------------

describe('getLifestyle (wealth tier mapping)', () => {
  test('floors at the studio apartment for low/negative net worth', () => {
    expect(getLifestyle(0).index).toBe(0);
    expect(getLifestyle(-1000).index).toBe(0);
  });

  test('returns the highest tier whose threshold has been crossed', () => {
    for (let i = 0; i < LIFESTYLE_TIERS.length; i++) {
      const t = LIFESTYLE_TIERS[i];
      // Just above this tier's threshold should map to this tier (or higher,
      // if the next threshold is at the same value — none currently are).
      const ls = getLifestyle(t.threshold + 1);
      expect(ls.index).toBeGreaterThanOrEqual(i);
    }
  });

  test('Space Station unlocks only at very large net worth', () => {
    expect(getLifestyle(9_999_999).name).not.toBe('Space Station');
    expect(getLifestyle(10_000_000).name).toBe('Space Station');
  });
});
