# Phase 2 — Typed project model + migrations (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 14 passed · `npx tsc --noEmit` clean · `npm run build` works.

## What was added

- `tsconfig.json`, `vitest.config.ts`, `npm test` script; devDeps `zod`, `vitest`, `@types/node`.
- `src/domain/` — Zod schemas + types (permissive, catchall passthrough):
  - `component.ts` — SceneComponent (+ `STATE_TYPE`, `isStateStep`)
  - `edge.ts` — Edge (routing/branch/weight/dir/style/speed/pillAccent)
  - `project.ts` — Project / Scene / CanvasSettings (`version` = plan's schemaVersion)
  - `step.ts` — steps are DERIVED (comps[] order === show order); first-class Step objects land in Phase 8
  - `migrations.ts` — `importProjectFile` / `parseProjectFile` / `serializeProject`
- `src/persistence/` — `projectFile.ts` (`toFileJson`, v3 shape), `localStorage.ts`
  (key registry + autosave/library adapters enforcing the explicit-save rule by construction)
- Tests: `migrations.test.ts` (10), `localStorage.test.ts` (3), `step.test.ts` (1)

## Fidelity boundary (explicit)

`importProjectFile` mirrors `importProject()` EXCEPT two registry-dependent
passes that stay in legacy until Phase 3 extracts the registry:
`themeize()` (exact-hue → var() roles) and `backfillComp()` (per-type prop
defaults). Structural migration is fully covered; visual equivalence
completes with Phase 3.

## Acceptance gate

- All 5 `examples/*.json` + `migration/fixtures/phase0-coverage.json` import
  with zero comp/edge loss (legacy folds only: flowlink/emptycanvas).
- Round-trip `old → typed → exported → re-import` is stable; serialized
  output leaks no runtime transients (`_stateAt/_played/revealed/beat`).
- Autosave adapter touches ONLY `phosphor-autosave-v3` (+ v2 read fallback);
  library keys are reachable only via the explicit-save path.
