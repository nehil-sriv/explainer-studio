# Phase 9 — Playback + recording (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 98 passed · `npx tsc --noEmit` clean · build emits
`index.html` + `editor.html` + `popout.html` (all serve 200).

## One resolver, three consumers (the plan's acceptance gate)

`resolveSceneAtStep` (Phase 3) drives the editor canvas, the popout
mirror and auto takes. Proven: editor take and popout render at shown=5
both show exactly `[lb, db]` (clearBefore) — popout test asserts it.

## Store takes

- Stepped reveals: `stepNext` serves the deepest unfinished stepped comp
  first (line-by-line, no `shown` change); newly revealed stepped comps
  open on line one; `play()` primes the opening run (legacy seqPlay parity,
  incl. from-blank). Counts come from `stepTotalFor` (rendered-markup line
  count, node-verified against legacy incl. the terminal single-`tline`
  quirk); per-line hiding via `applyLineReveal` (string-level, DOM-free).
- Auto: `startAuto/stopAuto` + closure timer (per-store, never serialized).
  Each beat waits entrance time + slowest run-member hold (`seqHoldFor`:
  per-step override else global). Take ends itself past the last step;
  `stopAuto` halts without exiting; load/new/stop clear the timer.
- Run-aware stepping kept from Phase 8 (whole beats only).

## Rendering

- `SceneView` (shared by editor + popout): visibility, state patches,
  line reveals, entrances. New comps leave `anim` undefined so
  `resolveAnim` applies per-type defaults (`catalog/defaultAnims.ts`,
  138 entries verbatim); `--ks/--kr` set per element; `pa-*` keyframes
  extracted verbatim to `entrances.css`. Delay skipped mid-take.
- Entrance re-arm matches legacy exactly: only the run revealed by the
  latest advance animates (tracked across renders; stepping back shows
  settled steps; re-stepping forward replays — all tested).

## Popout + recording

- `popout.html` + `PopoutApp`: chrome-free mirror, BroadcastChannel sync
  with hello-handshake (editor reposts on open), independent of editor
  fate (never throws). ⧉ Popout button in TopBar.
- `src/recording/session.ts`: region capture (CropTarget + Safari bare
  fallback), vp9→vp8→default mime cascade, chunk-collecting session with
  Blob download. ⏺ Record captures the scene while the take auto-plays;
  stopping downloads the `.webm` and ends the take.

## Bugs found (expectation-side except noted)

1. Terminal counts 1 line, not 3 (legacy `rich()` eats newlines before the
   split — node-verified parity, test corrected; code/checklist split first).
2. `play()` from blank primes the opening run, not `shown` rows — fixed.
3. Fixture title carries explicit `pa-left` (explicit-wins proven by the test).
4. `in`-narrowing dead end avoided via probe casts (established pattern).

## Explicit non-goals

Exit animations (instant vanish — agreement unaffected), `type`
typewriter animation (static full text), camera comps, teleprompter view,
GIF/MP4 export paths (Phase 10), legacy bridge removal (Phase 11).
