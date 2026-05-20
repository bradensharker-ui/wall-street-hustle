# Calibration Notes

> **Status of this document.** Every numerical parameter in `src/sim.js` is an
> **instructional assumption** chosen to sit near long-run history. None are
> forecasts. The placeholder values are documented below alongside the
> *named dataset* each should be calibrated against and the *verification
> status* of the current value. Before any external/publication use, each
> parameter marked `placeholder` must be retrieved from its named source on
> a specific date and the row updated to `verified · YYYY-MM-DD`.
>
> This is the no-fabrication contract: numbers in this game point to real
> data, but only after they've been dated and traced.

## The model

Each asset price evolves as discrete-step geometric Brownian motion (GBM)
with an optional additive log-shock from a damped event process:

```
S_{t+dt} = S_t · exp((μ − σ²/2)·dt + σ·√dt·Z + shock)
```

- `μ` — annual expected (arithmetic) log-return drift
- `σ` — annual volatility of log returns
- `dt = HORIZON_YEARS / totalTurns` — one game is always 10 simulated years
- `Z ~ N(0,1)` — standard normal innovation
- `shock` — additive log-return from the event process (see below)

The **closed-form median** with no shocks is
`S_T = S_0 · exp(T · (μ − σ²/2))`. The Monte Carlo simulator replays the
event process; realized medians sit *near* the closed form, not on it.

### Event process

Per turn:

- With probability `λ · dt` (Poisson-style; `λ = EVENT_RATE_PER_YEAR = 0.7`),
  draw one event from `EVENTS` and apply its per-asset log-shock,
  multiplied by `EVENT_SHOCK_SCALE = 0.5` (damping toward the calibrated
  GBM trend so events flavor outcomes rather than dominate them).
- Otherwise the turn is quiet (`shock = 0`).

Expected event count over a 10-year game is `λ · 10 ≈ 7`, independent of
game length. Tested in `sim.test.js`.

## Per-asset parameters

| ID | Display name | μ (drift) | σ (vol) | Source dataset | Formula | Status |
|----|--------------|-----------|---------|----------------|---------|--------|
| TBILL | US T-Bills (3-mo) | 4.5% | 1.0% | FRED `DTB3` (Secondary-market 3-Month T-Bill rate) | Annual nominal yield; vol of annualized yield | **placeholder** |
| BOND  | US 10-yr Treasury | 4.5% | 8.0% | FRED `DGS10` (10-Year Constant Maturity); Damodaran "Returns by Year" sheet (10-yr T-Bond total return column) | Geometric mean of annual total returns; std dev of same | **placeholder** |
| SPX   | S&P 500 index fund | 10.0% | 17.0% | Damodaran "Historical Returns on Stocks, Bonds and Bills" — S&P 500 *with dividends* column | Long-run geometric mean (~9–10%); annual return std dev (~17–20%) | **placeholder** |
| TECH  | Nasdaq-100 (large tech) | 12.0% | 20.0% | Nasdaq, Inc. NDX total return data (or Invesco QQQ NAV history since 1985) | Geometric mean & std dev of annual total returns | **placeholder** |
| GOLD  | Gold | 5.0% | 15.5% | LBMA Gold Price PM (USD/oz) or FRED `GOLDPMGBD228NLBM` | Geometric mean & std dev of annual returns (nominal) | **placeholder** |
| BTC   | Bitcoin | 10.0% | 55.0% | *No defensible long-run sample.* Forward drift set to "equities + a small risk premium" by *assumption*. σ near realized annualized vol since ~2014. | Assumption; document explicitly that BTC's forward return is unknowable | **assumption — not historical** |
| MEME  | Meme stock ($YOLO) | −5.0% | 120.0% | *Didactic archetype, not a real security.* | Negative drift + extreme vol to teach vol drag | **didactic** |

### Verification checklist (per row)

When updating a row to `verified · YYYY-MM-DD`, document:

1. **Dataset URL** and series identifier (e.g. `https://fred.stlouisfed.org/series/DTB3`).
2. **Date range** used (start & end).
3. **Real vs nominal**: nominal unless explicitly otherwise.
4. **Total return vs price-only**: total return for equities/bonds.
5. **Geometric vs arithmetic**: geometric for `μ`; standard deviation of
   annual log returns (or annual simple returns, with note) for `σ`.
6. **Retrieval date** and tool (e.g. "FRED website, 2026-MM-DD").

## Non-asset assumptions

| Parameter | Value | Rationale | Status |
|-----------|-------|-----------|--------|
| `START.loanAPR` | 6.0% | Typical federal undergrad student loan ~5–8% (US Dept. of Education) | **placeholder** |
| `START.ccAPR` | 22.0% | National-average credit-card APR ~21–23% (Federal Reserve `TERMCBCCALLNS`) | **placeholder** |
| `START.cash` | $1,000 | Starting situation for a young saver; pedagogical choice | **didactic** |
| `START.loan` | $4,000 | Pedagogical choice; small enough to be payable in-game | **didactic** |
| `START.incomePerYear` | $3,000 | Investable surplus (≈$250/mo); pedagogical | **didactic** |
| Employer match | 50% (capped via game logic) | Common US 401(k) match pattern (e.g. 50% of first 6%) | **placeholder** |
| Lifestyle counterfactual rate | 8% nominal for ~5 yrs avg | "If invested at the long-run equity rate over mid-game spending horizon" — disclosed in-game | **assumption (labeled)** |

## Calibration tests

`sim.test.js` enforces:

- The GBM closed-form identity (`predictedMedian` matches `S₀·exp(T·(μ−σ²/2))`).
- `gaussian()` is approximately standard normal over 10k samples.
- The event process is dt-scaled: expected shock count over 10 years is
  identical for Quick (40) and Standard (100) game lengths.
- Pedagogical orderings hold in Monte Carlo:
  - SPX > BOND (equity risk premium)
  - TECH > SPX (higher drift, despite higher vol)
  - MEME median < 50 (wealth trap)
  - BTC < SPX (vol drag dominates the modest drift assumption)
- Monte Carlo realized median sits within ~25% of the analytical trend for
  every asset (matches the band shown in the Teacher dashboard).

Run with `npm test`.

## Limitations

1. **GBM is not a model of bond *prices***. We model bond *total return*
   compounding at `μ` with vol `σ`. This is a deliberate simplification for
   the classroom and is disclosed in the Teacher dashboard.
2. **No interest-rate / inflation regime modeling.** All returns are
   nominal; there is no explicit interest-rate process driving bond yields
   or asset correlations.
3. **No correlations across assets.** Each asset's GBM is independent —
   except where events apply correlated shocks (e.g. a CRISIS event hits
   stocks, tech, memes, and BTC together). Real diversification gains in
   the game come from the event process, not from a covariance matrix.
4. **Bitcoin's drift is not derivable from historical data**, by design.
   It is an explicitly labeled assumption.
5. **Meme stock is illustrative**, not a model of any real security.
6. **Calibration is point-in-time, not regime-aware.** A bond drift of
   4.5% was reasonable in 2024–2026; in different rate environments these
   should be re-calibrated.

## Update procedure

1. Retrieve fresh values from the named datasets, on a specific date.
2. Edit the corresponding entries in `src/sim.js`.
3. Update the row above to `verified · YYYY-MM-DD` with the dataset URL.
4. Run `npm test`. Most tests should still pass; if pedagogical orderings
   break (e.g. SPX no longer > BOND in MC), document the change and decide
   whether to update the test or the parameter.
5. Update the in-game Teacher dashboard wording if any rationale changes.
