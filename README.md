# Explainer Studio

> Build HTML scenes for explainer videos — then record them.

A **static, no-build-step** scene composer for tech videos. Drop components (terminals, service blocks, wires, databases, load balancers, …), arrange them on a 1080p canvas, and drive the narrative **beat-by-beat with Space**. The output is a pixel-perfect popout window you capture in OBS (or with the built-in ⏺ REC) and drop straight into DaVinci Resolve.

![Explainer Studio](https://via.placeholder.com/960x540/0A0F0A/39FF7A?text=PHOSPHOR+Builder)

## Why not draw.io / Excalidraw?

- **Built for recording, not drawing** — beats, per-component entrance animations, typewriter reveals, and a live popout that mirrors the canvas 1:1.
- **Beats, not layers** — Space reveals the next component in the current beat, then advances. The story accumulates as you talk.
- **HTML → PNG/MP4** — everything is HTML/CSS; export is `html-to-image` + `MediaRecorder`. No Electron, no backend.

## Quick start

```bash
# clone and open — no install, no build
git clone https://github.com/yourname/explainer-studio.git
cd explainer-studio
python3 -m http.server 8000
open http://localhost:8000/
# or just double-click index.html (tokens are inlined as fallback)
```

1. Pick components from the left palette — they land on the stage as drafts.
2. Drag, edit text/colors/size in **EDIT SELECTED**, set entrance animations.
3. **＋ beat** — each beat is a moment in your video. Components live on a beat.
4. **▦ accumulative / ▭ isolated** — story builds, or each beat is a clean slate.
5. **Space / PageDown** → next component (or next beat). **← / PageUp** → back.
6. **⧉ popout** + OBS *or* **⏺ REC** → pick the *llmao-scene* window → Space through your beats.

## Project files

File → **Save / Open** exports a single JSON:

```json
{ "scene": {"w":1080,"h":1920}, "comps": [...], "beatStep": {...}, "beats": 5 }
```

Load any `examples/*.json` to see a complete short.

## Tech stack

- Vanilla HTML + CSS + JS — no framework, no bundler.
- Design tokens in `assets/tokens.css` — swap the whole palette by editing `:root`.
- `js/themes.js` + `themes/manifest.js` — manifest-driven canvas themes, all 16 in the picker (see `themes/README.md`).
- Animations are pure CSS keyframes (`pa-*`); re-armed per-entrance so every take is clean.

## Contributing

See `BACKLOG.md` for the roadmap. PRs that keep the tool **static and recording-first** are welcome. Please keep `index.html` as a single file + `css/` + `js/` — no build step.

## License

MIT — see [LICENSE](LICENSE).
