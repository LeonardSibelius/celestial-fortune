# Celestial Fortune

An HTML5 slot machine built with **PixiJS v8 + Vite + TypeScript**.

> **Demo mode only. No real-money play.** This is an entertainment / technology
> demo. There is no wagering, no payouts, and no money of any kind.

## The pipeline: UE5 as an art factory

Celestial Fortune treats **Unreal Engine 5 as an offline art factory**. Symbols,
backgrounds, and FX are modelled and rendered in UE5, then baked into texture
**atlases / sprite sheets** that ship as static assets. The runtime is a thin,
fast PixiJS WebGL client that composites those pre-rendered frames — no engine in
the browser. UE5 output lands in `src/factory/`; the runtime never depends on UE
at play time.

## Status — P0: factory spike

The first milestone is a vertical slice of the rendering + motion loop:

- One spinning reel — 3 visible cells in a masked window over a strip of 8
  placeholder symbols (seven, bell, star, diamond, bar, cherry, moon, coin),
  drawn procedurally with Pixi `Graphics` (no external art yet).
- **SPIN** button and **spacebar** trigger a spin: accelerate → cruise (~1s) →
  ease-out stop, aligned to a random symbol on the center pay-line.
- Smooth 60 fps via the Pixi ticker.

No win logic and no money — that's **P1**.

### Roadmap

- **P0** — factory spike: one spinning reel. ✅
- **P1** — game model in `src/model/` (reel strips, RNG, paytable, win evaluation).
- **P2** — real UE5-rendered atlases in `src/factory/` replace the placeholders.

## Project layout

```
src/
  model/    # P1: TS game model (empty for now)
  factory/  # UE5-rendered atlases + metadata land here (empty for now)
  reel/     # P0: reel rendering + spin state machine
  main.ts   # cabinet, masked window, SPIN button, ticker wiring
```

## Dev quickstart

Requires Node 18+.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server (prints a localhost URL)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

Then open the printed `http://localhost:5173` URL and press **SPIN** (or the
spacebar).
