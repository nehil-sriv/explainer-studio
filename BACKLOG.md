# Builder — feature backlog

Status of ideas for `html-png/components/builder.html`.
✅ = shipped · 🔜 = next up · ⬜ = not started

## ✅ Shipped (was: High priority — recording quality)

- **Playback / choreography** — "▶ play scene" hides everything, then Space/→ reveals
  components one-by-one, each playing its configured entrance animation + delay.
  Esc exits and shows all.
- **Keyboard triggers during recording** — Space is context-aware:
  playback stepping → line-reveal on stepped terminal/checklist → start playback.
  No mouse needed while talking.
- **Scene queue** — `▸Q` on saved scenes lines them up (queue visible in header);
  **⏭ next queued** clears the canvas and loads the next scene with animations.
  Perfect for hook → setup → receipts → outro.

## ✅ Shipped (was: Medium — polish)

- **Undo/redo** — Ctrl/Cmd+Z, 60-step stack covering delete/move/clear/scene-load.
  (Redo not implemented.)
- **Snap & align guides** — drag snaps to edges/center/thirds with green guide lines;
  hold Alt to bypass snapping.
- **Component lock** — 🔓/🔒 per component; locked = no drag/nudge/delete + badge.
- **Image/logo component** — local PNG via file picker (stored as data URL), width control.
- **Still-frame export** — 📸 PNG button exports the canvas at 2× (html-to-image).

## ✅ Also shipped alongside

- Stepped line-by-line reveal for **terminal** and **checklist**
  (`stepped` checkbox + ▸next/↺/all controls + Space).
- Word-level rich text tags in title/caption/terminal:
  `[g][a][r][c][m][d]` theme colors · `[#hex]` custom · `[b]` bold · `[i]` italic ·
  `[s1.5]` size multiplier · legacy `[w]/[e]/[n]` still valid. Parser: `rich()`.
- Per-component **color** (accent+text) and **background** editing — theme swatches +
  custom hex, channels `--ca/--ct/--cbg/--cc`.
- Theme engine (`themes.js`) integrated into builder + popout: presets phosphor/amber/
  syntaxpop/heat/paper, `?theme=` / `?set=` URL overrides, localStorage persistence.
- 4-section sidebar (Available Components / Recording Scene / Saved Components /
  Saved Scenes) with collapse, resize, reorder (↑↓), duplicate (⧉).

## 🔜 Next up

1. **Redo** (Ctrl+Shift+Z) to complement undo.
2. **Global timeline view** — visual list of components with start-times instead of only
   per-component delays; scrub preview.
3. **Layout presets per pillar** — one-click brand layouts ("hot-take short", "explainer",
   "skit", "receipts"), vertical + horizontal variants.
4. **Episode metadata panel** — title/caption/pin/pillar stored in the project JSON;
   generate upload copy from it.
5. **Queue persistence polish** — queue survives reload (in-memory today);
   auto-fire option on scene switch.

## ⬜ Later / ideas

6. Fade-out transitions between scenes (exit animations).
7. Audio cue markers attached to component reveals.
8. Multi-canvas presets (1080×1920 / 1920×1080 / 1:1) remembered per episode.
9. Thumbnail generator: compose F-style layouts from scene content automatically.

## Technical notes for implementers

- Everything renders through `renderCanvas()`; animations replay via `applyAnimation`
  (`c._played` guards; pass `force=true` to replay). Playback state = `play {shown}`;
  hidden comps get `display:none` by index.
- Component registry = `REGISTRY`: add new components there (markup + props + fields +
  fieldTypes). Field types: text/textarea/number/check/select/image; accent fields get
  color-input + hex-select pair.
- Rich text lives in `rich()` — tokenize→escape→restore pattern; keep nesting support.
- Persistence keys: autosave `phosphor-autosave-v1`, components `phosphor-saved-v1`,
  scenes `phosphor-scenes-v1`. Project files: {scene:{w,h}, comps, saved, scenes,
  currentSceneName}.
- HARD RULE: never write saved-scene storage from clear/open/autosave — only the explicit
  💾 save scene button (past bug: clearing wiped the loaded saved scene).
- Verify changes headless after edits:
  `python3 -m http.server` + Brave `--headless=new --dump-dom` and grep for console errors.
