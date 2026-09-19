# Phase 0 — Regression Baseline (MIGRATION_PLAN.md)

Acceptance gate: current behavior is reproducible and critical regressions
can be detected automatically. Do not start Phase 1 conversion work until
this baseline exists.

## Fixture matrix

Existing reusable fixtures (in `examples/`):

| Fixture | Covers |
|---|---|
| `microservices.json` | multi-comp scene, `sceneId: sc-arc`, `clearBefore`, 5 `edges[]` (smooth/dots/animate), `seqHold` |
| `memory-bandwidth.json` | 1 edge (label/caption/weight/style/speed), mixed comp types |
| `rag-short.json` | rich text (`[g]...[/g]`), `stepped` candidate types, accent `var()` + hex |
| `hackrisk-dash.json` / `invest-cards.json` | gauges/metrics/cards, `draft` flags |

New synthetic fixture: `migration/fixtures/phase0-coverage.json`

It intentionally covers what no single example covers together:

- 2 scenes (`SCENES[]` + per-comp `sceneId`): request-flow + recovery
- `gnode` + `edges[]` (smooth + step routing, dots + pulse, `animate: true`)
- `clearBefore` on a step, `pin: true` survivor, `hideWhen` retirement
- `out` exit animation (`fade`, `exitWhen` downstream rule)
- `type: "state"` patch step (`target` + `patch`, draws nothing)
- `stepped: true` terminal + checklist (Space reveals one line at a time)
- rich text tags `[g]/[a]/[r]/[#hex]/[b]/[s1.5]`
- `seqHold` per-step + global hold fallback
- legacy compat: `version: 1`, `beats` absent, `beatLabels` absent

## Smoke path (browser-level, manual until Playwright lands in Phase 1)

Fixed viewport: 1440×900. Canvas: 1920×1080 (`scene.w/h`).

1. `python3 -m http.server 8000` → open `index.html` (also double-click `file://` once to confirm fallback)
2. 📂 Open `migration/fixtures/phase0-coverage.json` → canvas shows Scene 1 step 1 only in take preview
3. Select Database comp → Edit panel shows props → change `sub` → canvas updates
4. Drag Database → position changes, snap guides appear; Alt-drag bypasses
5. Sequence tab: drag Step 3 above Step 2 → order changes, `hideWhen` downstream rule holds (no stranded refs)
6. ▶ play → Space × N reveals each step with entrance; stepped terminal reveals line-by-line; state step patches in place (no new comp); Esc exits to edit (show all)
7. 🎞 export → PNG still renders full-res; GIF/WebM paths untouched (Phase 10)
8. 💾 save scene → reload page → autosave restores canvas BUT saved scenes intact (explicit-save rule: autosave/clear/open never overwrite `phosphor-scenes-v1`)
9. Popout (⧉): same step position, same theme, typing chars forced shown

## Reference screenshots (capture once, commit)

- `migration/baseline/*.png`: fixed 1440×900, canvas 1920×1080
  - `editor-scene1-step1.png`, `editor-scene1-step3-fail.png`, `editor-scene2.png`
  - `popout-step3.png`, `export-png-step3.png`
  - one per canvas theme in the fixture (`studio-black`, `paper`)
- Compare rule: editor canvas vs popout vs PNG must agree at every step (Phase 9 gate preview).

## What NOT to do in Phase 0

- No `index.html` logic changes. Additive `migration/` files only.
- No toolchain, no deps, no build step.
- No schema changes. Document observed fields only (see fixture header comment).
