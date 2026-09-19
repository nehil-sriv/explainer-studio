# Phase 4 — Store + command layer (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 46 passed · `npx tsc --noEmit` clean · `npm run build` works.

## What was added (`src/store/`, zustand 5 vanilla — no React yet)

- `history.ts` — transactional undo/redo over `{comps, edges}` snapshots
  (60-step cap, redo cleared on new edit — legacy `snap()` parity):
  `push / begin / commit / cancel`, nested begins collapse.
- `editorStore.ts` — `createEditorStore()` factory (isolated tests) +
  vanilla `editorStore` singleton (Phase 5 binds it to React). Slices:
  `project` (ONLY serialized slice) · `selection` · `playback` ·
  `prefs` (active scene) · `exportState` · `history`.
  All mutations flow through actions; `updateComponent/updateEdge` cannot
  rewrite identity; delete cascades to wires + aimed state steps (legacy
  `dropDependents` parity); moves/reorders/deletes revalidate exits;
  duplicate shares one fresh groupId; add selects the new comp;
  `jumpTo` clamps to visited ground; `loadProject` resets transient slices
  + history (file-open never snaps, like legacy).
- `commands.ts` — the plan's `commands.*` facade over the singleton
  (`addComponent/moveComponents/resizeComponent/updateComponentProps/
  moveComponentToStep/reorderStep/deleteSelection/...`), incl.
  transaction-safe `setPositions` for live drags.
- `selectors.ts` — pure derived reads (`getComp`, `selectedComps`,
  `sceneComps`, `takeFrame` via the Phase 9 resolver, `canUndo/canRedo`).
- Tests: `history.test.ts` (4) + `store.test.ts` (13) incl. the gate:
  one gesture (begin + 10 live moves + commit) = exactly one undo entry.

## Bugs found (source-side, fixed)

1. `zustand` root import pulls the React entry (`react` not installed
   until Phase 5) → `zustand/vanilla` `createStore`; hook binding deferred.
2. Pre-image taken AFTER mutation ran: `revalidateExits` mutates shared
   comp objects (shallow-copied arrays), so the pushed snapshot was
   already corrupted (proven: `past[0]` lost `hideWhen`). Fixed both
   layers: snapshot-before-mutate in `applyProject` (same reason legacy
   `snap()`s before editing) + per-comp clones in move/reorder/delete.
3. Test wrongly expected canvas-size undo — legacy `snap()` covers
   `{comps, edges}` only; documented as the boundary, not a regression.

## Explicit non-goals (later phases)

Run-aware stepping (`stepId` merged runs) and entrance/exit animation
playback stay in legacy until Phase 9; `stepNext` is +1 clamped.
`loadProject` intentionally skips registry `themeize/backfill` (Phase 3
boundary — structural only).
