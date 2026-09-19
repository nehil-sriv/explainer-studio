# Phase 6 — Direct manipulation (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 61 passed · `npx tsc --noEmit` clean · `npm run build` works.

## What was added

- `src/editor/canvas/coords.ts` — fit-scale coordinate conversion
  (`canvas = (client - rect) / (rect / canvas)`), pure + tested.
- `src/editor/canvas/snapping.ts` — union-bbox vs comp edges/centers +
  canvas bounds/center, 8px threshold, guide lines, pure + tested.
- `src/editor/canvas/marquee.ts` — normalized rect + spatial select
  (state/parked excluded), pure + tested.
- `src/editor/canvas/Handles.tsx` — 8 resize handles (wpx/hpx, legacy
  E/S parity) + rotate handle, live updates in one transaction.
- `CanvasWorkspace` — pointer drag (multi-select group moves, snap guides,
  Alt bypass, 3px click threshold), marquee (shift-additive), library
  drag-to-canvas (drop preview, centered place, select; click-to-add kept),
  keyboard (arrows/shift-10 nudge, Delete, Ctrl+D, Esc), snap/unsnap guides,
  takebar. No drag/handles while playing (takes are for narrating).
- Store: `patchComps` (transaction-aware live field patches) + facade.
- Tests: `interactions.test.ts` (5 pure) + `canvas.test.tsx` (6 gesture —
  drag lands snapped with exactly one undo entry, marquee, keyboard,
  resize, rotate, drop-at-point).

## Stack deviation (deliberate, reported per plan guidance)

The plan names Moveable/Selecto + dnd-kit. The canvas gestures are
implemented natively on pointer events instead:
- Moveable/Selecto drive the DOM directly and need a real layout engine —
  unverifiable in the jsdom gate, untestable transactions, heavy bundle.
- The Phase 4 transaction model (begin/live/commit) already fits pointer
  gestures exactly; coordinate math is 10 lines.
- dnd-kit stays slated for Phase 8 story sorting (its strength); library
  drops use native DnD (drop-coordinate conversion is trivial).
Revisit only with a Playwright-level gate that can measure real layout.

## Bugs found (all test-side except two source)

1. Well click-to-deselect fired after every drag/marquee/resize (click
   follows pointerup) → `suppressClick` flag; comp clicks are safe (scene
   node stops click propagation).
2. Test-only: `renderToString`-style staleness — commands after `render()`
   need act ordering (select-before-render); native dispatches wrapped in
   `act()`; jsdom lacks DragEvent/PointerEvent fidelity → manual events.
3. Test expectations corrected by the implementation: y-snaps 433→430
   (guides assert it mid-gesture), marquee is spatial (term1 included).
