# Phase 1 — Toolchain spike (MIGRATION_PLAN.md)

Status: spike only. Legacy `index.html` is untouched and remains the app.
Revert by deleting `package.json`, `vite.config.ts`, `node_modules/`, `dist/`.

## What was added

- `package.json` — `dev` / `build` / `preview` scripts; `vite` + `typescript` devDeps only.
  React, Zustand, Zod, Moveable/Selecto, dnd-kit, Vitest, Playwright are
  INTENTIONALLY not installed yet — they land with the phases that use them
  (Phases 2–6), keeping this step independently reversible.
- `vite.config.ts` — serves repo root, `index.html` as entry, `base: './'`
  for relative-asset static builds. No plugins, no transforms.
- `.gitignore` — added `node_modules/` + `dist/`.

## file:// vs HTTP — deliberate decision required

- Today: double-clicking `index.html` works (`tokens-inline` fallback, AGENTS.md rule).
- Vite `dev`/`preview` require HTTP. `vite build` output in `dist/` is static
  files and can be served over HTTP; ES-module/CDN fetches in the page
  (Google Fonts `<link>`, `html-to-image`, `gif.js` CDNs) already need network.
- No silent breakage: this spike changes NOTHING about `index.html`.
  Before Phase 5 makes the Vite build the default, decide and document:
  keep `file://` working (ship built `dist/index.html` self-contained enough
  to double-click) or declare HTTP-serving required.

## Acceptance gate (run after `npm install`)

```bash
npm run dev      # → http://localhost:8000, legacy builder, zero diffs
npm run build    # → dist/ static output
npm run preview  # → http://localhost:4173 serves dist/
```

Then run `migration/phase0-baseline.md` smoke path against BOTH `:8000`
(dev) and `:4173` (built) and compare with `file://` + reference screenshots.
