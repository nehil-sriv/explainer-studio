# Phase 5 — React application shell (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched (still builds to
`dist/index.html` byte-stable); the shell ships as a second entry.
`npm test` → 50 passed · `npx tsc --noEmit` clean · `npm run build` emits
`dist/index.html` + `dist/editor.html` (both serve 200).

## Shell (`src/editor/`, `src/main.tsx`, `editor.html`)

- `shell/AppShell.tsx` — TopBar / filter rail / library / canvas /
  inspector / story grid (all classes `es-` prefixed; unscoped canvas CSS
  cannot collide). Boots the Phase 0 fixture so existing projects display;
  📂 Open loads any file through `commands.loadProject`.
- `toolbar/TopBar.tsx` — project crumb, Preview toggle (+ ←/→ + take
  counter while playing), ⏺ Record status (capture lands Phase 9),
  ⤴ Export (real project-JSON download via `toFileJson`), 📂 Open,
  editor light/dark toggle.
- `library/ComponentLibrary.tsx` — searchable registry grid in 16 groups
  (click-to-add via `commands.addComponent`, immediately selected).
- `canvas/CanvasWorkspace.tsx` — the extracted renderer mounted in React:
  `REGISTRY[type].markup(effProps)` positioned divs + SVG edge layer from
  `edgeGeom/edgeColor`, click/shift-click selection, scale-to-fit,
  canvas-theme picker (14 themes, `data-theme` on the scene node).
  Edit shows all; Preview drives visibility + patches through
  `resolveSceneAtStep` — the same frame the popout/exports will consume.
- `inspector/PropertiesInspector.tsx` — X/Y/scale/rot, clear/pin/hold,
  per-field editors from `fieldTypes` (commit-on-blur = one undo entry),
  multi-select bulk actions, empty-state canvas size.
- `story/StoryPanel.tsx` — scene cards + active scene, sequence rows with
  labels/flags, click-select, ↑↓ reorder + ✕ remove through commands,
  NEXT highlight while playing.
- `storeHooks.ts` — `useEditor` selector hook, editor-theme helpers
  (`explainer-editor-theme` key — never inside project JSON).
- `src/styles/editor-*.css` (Phase 1 drafts) now live: chrome uses
  `--ed-*` only; canvas output untouched.

## Gate evidence (`src/editor/shell.test.tsx`, jsdom + Testing Library)

Existing project displays (10/11 fixture comps, real `tk-svc` markup,
`studio-black` scene); library click adds a step; story click selects;
typing in the inspector lands on the canvas through commands with history
growth; Preview → 5 steps shows exactly `[lb, db]` with a `5/11` counter.

## Bugs found (all test/tooling-side)

1. `zustand` root import needs React → store already on `zustand/vanilla`;
   installing React unlocked the entry for future hook binding.
2. `renderToString` freezes the zustand server snapshot (initial state) →
   jsdom + Testing Library instead (also the Phase 6 interaction base).
3. Test race: direct command calls after `render()` need `act`/ordering —
   select-before-render in tests.
4. Exact-text queries vs split JSX text nodes (`▷ Explainer Studio`,
   `Sequence · N steps`) → regex/textContent assertions.
5. `getByLabelText` needs real `htmlFor` association → added to Field/Area.
6. Zod catchall index signatures defeat `in`-narrowing in `compLabel` →
   probe-by-cast.

## Explicit non-goals

Drag sorting (dnd-kit), direct canvas manipulation (Moveable/Selecto),
in-place text, polished Story workflow (state chips, appear-together),
playback choreography beyond clip stepping, and recording/export capture
stay in legacy — Phases 6–10, each through the command layer built here.
`editor.html` inline theme script is the only blocking JS (no paint flash).
