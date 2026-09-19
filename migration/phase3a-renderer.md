# Phase 3a — Pure renderer core (MIGRATION_PLAN.md Phase 3, part 1)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 26 passed · `npx tsc --noEmit` clean · `npm run build` works.

## Extracted (`src/renderer/`, DOM-free, verbatim logic)

- `richText.ts` — `RICH_COLORS` + `rich()` + `escHtml`, line-for-line port.
  Verified output-identical to legacy via node (evals the actual function
  out of `index.html`). Two legacy quirks documented + tested, NOT fixed
  (fixing = visual change):
  - nesting asymmetry: `[b][g]x[/g][/b]` nests, `[r][b]x[/b][/r]` stays
    literal (colors stash before styles run);
  - size tag closes with `[/s]`, not `[/s1.5]`.
  - (Phase0 caption fixed accordingly: `[s1.5]⚠[/s]`.)
- `stateChanges.ts` — `isState / statePatches / effProps / effEdge /
  lastStateIdx / findTarget / stateSummary` with explicit `cutoff`
  (take/export = SEQ.shown, edit = 0, row scrub = index+1).
- `visibility.ts` — take-mode `compVisibleAt` (clear/pin, hides, hideWhen,
  parked, scene take, solo) + `resolveSceneAtStep()` — the deterministic
  frame resolver Phase 9 mandates for editor/popout/recording.
- `geometry.ts` — `visualBox / portsOf / portById / nearestPort /
  edgeRoute (smooth/step/straight/curved) / edgeGeom / EDGE_PRESETS /
  edgeColor (theme lookup injected) / edgeWireText`.
  Golden-tested incl. a phase0 wire (`M 310 480 C 354.2 480, 375.8 490, 420 490`).

## Still in legacy → Phase 3b (registry + full scene render)

Not started, by design (one extraction per change):
2. component defaults/metadata, 3. the 170 `markup()` bodies + helpers
   (`gnIcon/tkCyl/codeMarkup/…`), 4. `renderScene({scene,
   playbackPosition, selection, mode})` with `editor/preview/popout/
   snapshot/recording` modes, 8. full scene assembly.
Mechanical procedure: copy helpers → TS module, copy REGISTRY groups with
`markup: (p) => string` preserved, golden-test each group against legacy
`REGISTRY[type].markup(defaultProps)` output in node, then browser
pixel-compare the phase0 fixtures (editor vs popout vs PNG gate).
