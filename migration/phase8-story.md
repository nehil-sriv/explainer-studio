# Phase 8 — Story workflow (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 80 passed · `npx tsc --noEmit` clean · `npm run build` works.

## Product rule (implemented)

Canvas position controls where a component appears. Story order controls
when it appears. Steps stay positions (Phase 2/4 decision) — runs
(`stepId`), state steps and ordering flags express the workflow.

## Store (`editorStore` + `commands`)

- Runs: `mergeSteps` (2+, same scene, shared `st`-id, compacted contiguous —
  legacy parity), `splitRun` (whole run, never half), `moveToNewStep`,
  run helpers in `domain/step.ts` (`runStart/runEnd/runBoundaries/
  runMembers/runCount/runIndexOf`).
- Playback is run-aware: `play(from)` lands `runEnd(from-1)`; `stepNext`
  jumps whole beats and ends the take past the last step; `stepBack`
  leaves the whole beat; `jumpTo` clamps to visited ground, extends the
  head on legal landings (legacy seqJump parity).
- State steps: `addStateStep` (end of sequence, selected — legacy
  placement rationale preserved), `updateStatePatch`, `setStateTarget`
  (retarget + patch reset in one entry). `newProject` (fresh doc).
- `SceneComponent.stepId` promoted to a first-class schema field.

## UI

- StoryPanel: expandable rows (run member chips, move-to-new-step, inline
  Run/Retire sections), per-row 🧹📌 toggles, native-DnD row reorder with
  drop indicator, scene cards with live scaled previews (edges skipped),
  NEXT highlight while playing. Existing row contract kept
  (`.es-step`, `data-seq`, count text).
- Inspector: Run section (appear-together w/ cross-scene guard, split,
  move-new), ⇄ add-state-change button, full state-step editor (target
  picker incl. wires, when −/+/end, fires-before-appears status, typed
  patch rows with base-as-of-step defaults, add/remove), Retire section
  (⊘ checklist of earlier comps, 🚪 downstream-only exit picker).

## Gate evidence

Acceptance workflow passes end-to-end: Database + Failure Arrow merged →
Alert on its own step → reorder → preview reveals alert alone, then
database + arrow together — the same sequence state the legacy engine
produces. Plus 6 store run tests and 6 UI tests (expand/flags/drag/state
patch/merge/previews).

## Bugs found (expectation-side except one addition)

1. `jumpTo(0)` lands `runEnd(0)` (legacy parity) — test corrected.
2. Patch base values see earlier state patches (`stateBeforeAt` parity).
3. Singleton pollution across UI tests → new `newProject()` command
   (also genuine product value: File → New).
4. Add-field picker is the second inspector select — query by option text.

## Explicit non-goals

Edge authoring (🔗 ports, edge panel) stays in legacy — state steps can
already target wires. Scene delete, per-point stepped reveals in takes,
and teleprompter narration view remain Phase 9 territory.
