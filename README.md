# Poincaré Disk — Constructions

[![Sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/campos20)

[![Test](https://github.com/campos20/poincare-disk-web/actions/workflows/test.yml/badge.svg)](https://github.com/campos20/poincare-disk-web/actions/workflows/test.yml)
[![Deploy](https://github.com/campos20/poincare-disk-web/actions/workflows/deploy.yml/badge.svg)](https://github.com/campos20/poincare-disk-web/actions/workflows/deploy.yml)
[![Coverage](https://campos20.github.io/poincare-disk-web/coverage-badge.svg)](https://campos20.github.io/poincare-disk-web/coverage-badge.svg)

You can try the app here: <https://campos20.github.io/poincare-disk-web/>

An interactive geometry tool (GeoGebra/Desmos-inspired). Constructions are
currently rendered in Euclidean geometry; the goal is to swap the rendering to
the Poincaré disk (hyperbolic geometry) without touching the engine, tools, or
interaction code.

## Architecture

- **`src/engine/`** — framework-agnostic TypeScript, zero React imports: the
  object model, construction state, snapping, and the tool state machines.
  Only points carry coordinates; every other entity references point ids, so
  dragging a point updates all dependents at render time for free. Derived
  points (intersections, midpoints) and a dependency DAG slot in here later —
  see the comments in `engine/types.ts` and `engine/construction.ts`.
- **`src/view/`** — React + SVG. All Euclidean geometry lives in
  [`src/view/geometry.ts`](src/view/geometry.ts), marked as the **swap point**:
  replacing those pure functions with Poincaré equations (geodesic arcs,
  offset-center circles) is the entire hyperbolic migration.
- **`src/routes/`** — TanStack Router file-based routes; the canvas is the
  index route.

## Develop

```sh
npm install
npm run dev       # dev server (serves under /poincare-disk-web/)
npm test          # engine + geometry unit tests (vitest)
npm run coverage  # unit tests with a coverage report
npm run build     # typecheck + production build
npm run preview   # serve the production build locally
```

## Deployment

Pushes to `main` deploy to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
<https://campos20.github.io/poincare-disk-web/>

**SPA routing under Pages:** GitHub Pages has no server-side fallback, so a
refresh or deep link to a non-root route would 404. The workflow copies
`dist/index.html` to `dist/404.html`, so Pages serves the app shell for unknown
paths and TanStack Router (configured with `basepath: import.meta.env.BASE_URL`)
resolves the route client-side. This keeps clean URLs, needs no code changes,
and is the simplest fix for a single-page app on Pages.
