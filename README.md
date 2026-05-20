# Wall Street Hustle

[![CI](https://github.com/bradensharker-ui/wall-street-hustle/actions/workflows/ci.yml/badge.svg)](https://github.com/bradensharker-ui/wall-street-hustle/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Content: CC BY 4.0](https://img.shields.io/badge/Content-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

A classroom-scale financial-literacy game. Students build an avatar, get one
realistic starting situation (cash, a student loan, a paycheck), and play
ten in-game years of investing decisions. The lessons — vol drag, debt math,
panic selling, FOMO buying, lifestyle inflation, the difference between
peer pressure and a finfluencer — emerge from the player's own choices.

## What it teaches

- **Active vs passive** — the central comparison is your portfolio vs a
  passive 60/40 "responsible twin" that takes the same paychecks and
  starting debt as you.
- **Vol drag** — assets with positive μ but huge σ (Bitcoin, meme stocks)
  can lose at the median. Demonstrated, not asserted.
- **Behavioral traps** — emergent flags: panic selling into drops, FOMO
  buying into pumps, financing emergencies at 22%, declining an employer
  match. The recap calls out *what you actually did*.
- **Peer dynamics, both flavors** — *Chad* is the finfluencer ("trust me
  bro, my insider says"); *Leo* is the peer ("everyone at school owns
  this"). Different lanes, distinct lessons.

The end-of-run screen shows a counterfactual: *you vs the passive twin
vs the best single asset in hindsight*. Hindsight always finds a winner.
That's the case for diversifying, not picking.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm test           # regression tests for the simulation core
```

## Project layout

- `src/sim.js` — pure simulation core (GBM, event process, Monte Carlo,
  assets, lifestyle tiers). No React, no DOM, no audio.
- `src/sim.test.js` — regression tests pinning the calibrated behavior.
- `src/App.jsx` — React UI and game-state machinery.
- `src/main.jsx`, `src/index.css`, `index.html` — Vite entry.
- `CALIBRATION.md` — every numerical assumption traced to its dataset.

## Methodology — short version

Each asset evolves as geometric Brownian motion in 10 years of in-game
time (regardless of game length — the time-step `dt` rescales). A damped,
Poisson-style event process layers shocks on top with an expected ~7
notable events per 10-year game. The Teacher dashboard's Monte Carlo
panel **replays the same event process** the player experiences, so
"trend vs realized" reflects the actual game rather than a pure GBM the
game never runs.

**Calibration is documented in [`CALIBRATION.md`](./CALIBRATION.md).**
Every μ and σ points to a named dataset (FRED, Damodaran, etc.) and is
marked `placeholder` until a dated retrieval is logged. This is an
explicit no-fabrication contract: numbers point to real data, but only
after they've been dated and traced.

## Privacy

- No backend, no accounts, no PII collected.
- The only state stored client-side (in `localStorage`) is your avatar,
  career stats, and submitted classroom results — all readable in the
  browser, never transmitted.
- Same-browser only. Cross-device classrooms need the future seeded-class
  feature (Milestone 2), which is still local-first.

## Running a class

A "seeded shared market" — every student plays the *identical* 10 years
from one teacher-provided seed — is the Milestone 2 feature. Until then,
the Teacher Dashboard aggregates student codes by hand-typed handle.

## Deployment

The repo is configured for one-click Netlify deploys via [`netlify.toml`](./netlify.toml).

To go live:

1. Sign in at [app.netlify.com](https://app.netlify.com) (free tier is fine).
2. **Add new site → Import an existing project → GitHub** → pick this repo.
3. Netlify reads `netlify.toml`, runs `npm run build`, publishes `dist/`.

Future pushes to `main` redeploy automatically. Every push also runs CI on
GitHub Actions (`.github/workflows/ci.yml`) — tests + build must pass.

## Status

| Milestone | Scope | Status |
|----------:|-------|--------|
| **1** | Defensibility foundation (tests, calibration doc, license) | ✅ done |
| **2** | Seeded classroom (deterministic RNG, teacher seed, 30-player optionality) | ✅ done |
| **3** | Accessibility pass + teacher's guide PDF | next |
| **4** | Production hosting + deployment | repo ready, awaiting Netlify connect |

## License

- **Code**: MIT — see [`LICENSE`](./LICENSE).
- **Educational content** (teacher materials, in-game text): CC-BY-4.0.
