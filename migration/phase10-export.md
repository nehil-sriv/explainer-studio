# Phase 10 — Export paths (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 120 passed · `npx tsc --noEmit` clean · build emits all entries.

## Paths (all render resolved take state, no legacy DOM ids)

1. **PNG still** — live `#scene` via bundled html-to-image (offline-capable,
   not CDN), 2×, editor chrome cloaked (`data-export-hide` on handles,
   guides, marquee art, drop preview, inline editor — legacy hideChrome
   parity; the selection toolbar already lives outside the scene).
2. **SVG still** — vector document of the current canvas, downloaded.
3. **Per-component PNG** — padded transparent stage (64px glow headroom),
   2×, selection-wins-else-all, `NN-type-slug` names (legacy parity).
4. **GIF take** — live-capture ~8fps × duration (ambient loops play, takes
   untouched), gif.js `{workers:2, quality:9, repeat:0}` + Blob-URL workers
   + 90s stall watchdog + delay clamping (all legacy parity).
5. **WebM/MP4 take** — blank + 3 settled frames per run boundary
   (anim½/anim½/hold), canvas.captureStream(30fps) + bitrate-capped
   recorder; mime order matches legacy (`mp4/avc1 → mp4 → vp9 → vp8 → webm`).
6. **Recording fallback** — Phase 9 region capture (unchanged).

Plus: self-contained snapshot HTML (inlined canvas CSS + self-hosted
fonts) as the portable still format; Export menu (Project JSON / PNG /
SVG / Component PNGs / GIF / WebM) with scale + duration options,
progress, busy guard and Esc cancel; `restoreTake` returns the take
after walks; `pretest`/`prebuild` regenerate the CSS bundle.

## Deltas vs legacy (all deliberate, documented in code/tests)

- Video plan appends the finale (`comps.length`): legacy `ends` uses run
  *starts*, silently dropping the last step's frames — contradicts its own
  "(0=blank … n)" comment. Proven by boundary arithmetic.
- Settled frames only (no entrance sampling): CSS entrances can't be
  scrubbed headless; durations preserved, motion frozen — same caveat
  legacy already notes for ambient loops.
- `pickMimeType` now follows the legacy mp4-first order (was vp-first).
- Fonts: 7 data-URL faces (381KB) extracted verbatim to
  `src/assets/fonts.css` — also fixes shell canvas type fidelity.

## Tooling notes

- `?raw` CSS imports return '' under this vitest setup → build-time
  generator (`migration/bundle-canvas-css.mjs` → `canvasCss.generated.ts`,
  committed, refreshed by pretest/prebuild) instead of bundler magic.
- jsdom lacks DragEvent/clientX passthrough, `URL.createObjectURL`,
  canvas 2d — all injected (deps props) or guarded with readable errors;
  gif.js stays a CDN script with the legacy offline message.

## Explicit non-goals

Pixel-diffed raster comparison (needs a real browser/Playwright),
thumbnail generator, queue persistence — all Phase 11 or later work.
