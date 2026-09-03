# AGENTS.md — Explainer Studio

> **For humans and AI agents working on this repo.** Read this before touching code, adding components, or generating visuals.

## What we're building

**Explainer Studio** is a static, no-build-step scene composer for **tech explainer videos** (shorts & long-form). You arrange HTML/CSS components on a 1080p canvas, drive the narrative beat-by-beat with **Space**, and record the popout window (OBS or built-in ⏺ REC) into DaVinci Resolve.

**Core loop:** `Add component → Place on beat → Space reveals next → Record → Export PNG/MP4`

**Differentiator vs draw.io/Excalidraw:** built for *recording*, not drawing. Beats, per-component entrance animations, typewriter reveals, and a 1:1 live popout. Everything is HTML → PNG/MP4.

---

## Project structure

```
explainer-studio/
├── index.html          ← THE builder — edit here (single file, ~3k lines)
├── assets/tokens.css   ← design tokens (:root vars) — palette lives here
├── css/phosphor.css    ← component library (all visuals)
├── js/phosphor.js      ← animation engine (typewriter, etc.)
├── js/themes.js        ← runtime theme switcher
├── examples/           ← sample project JSONs (load via 📂 Open)
├── AGENTS.md           ← this file
├── BACKLOG.md          ← roadmap — check before adding features
├── README.md
└── LICENSE (MIT)

_archive/old-builder/   ← previous builder copies (do not edit)
```

**No build step, no framework.** Vanilla HTML + CSS + JS. The builder is a single `index.html` that *is* the app.

---

## Tech stack & conventions

- **Tokens:** All colors live in `assets/tokens.css` as CSS variables. Components MUST read from `var(--*)`, never hardcode hex.
  - `--bg-deep`, `--panel`, `--phos-green`, `--amber`, `--alert-red`, etc.
- **Components:** Defined in `REGISTRY` inside `index.html` (`const REGISTRY = { kicker:{...}, svcblock:{...} }`). Each entry: `name`, `props`, `fields`, `fieldTypes`, `markup(props) → HTML`.
- **Styling:** `css/phosphor.css` — one class per component. Use `var(--ca)` / `--ct` / `--cbg` / `--fscale` for color/background/font overrides so the EDIT panel's pickers work.
- **Rich text:** `rich(text)` in `index.html` handles inline tags: `[g]/[a]/[r]/[c]/[m]/[d]` colors, `[b]` bold, `[i]` italic, `[s1.5]` size, `[#hex]` custom. Extend there.
- **Persistence:**
  - `localStorage` keys: `phosphor-autosave-v2` (canvas), `phosphor-saved-v1` (components), `phosphor-scenes-v1` (scenes).
  - Project files: `{scene:{w,h}, comps:[], beats, curBeat, beatLabels}` — loaded via 📂 Open, saved via 💾.
  - **Hard rule:** only the explicit **💾 save scene** button writes scene storage. Never auto-write on `clear`/`open`/autosave — it silently wiped saved scenes before.

---

## Workflow: Sequence (linear — beats retired)

```
SHOW (video)
 └─ SEQUENCE — footer strip in list order (STORY CANVAS ↑↓ reorders)
     └─ COMPONENTS — Space reveals next, ← goes back, Esc exits to edit
```

- **Order = list order.** `↑`/`↓` in STORY CANVAS sets the play order. Clicking a dot in the footer jumps there.
- **Space / PageDown / →** → next component. **← / PageUp** → back. **Esc** → exit to edit (show all).
- **Clear / retire:** `🧹` on a step clears the screen before it appears; `📌` pins survivors through clears; EDIT SELECTED `⊘ hide` retires specific earlier comps when a step appears. Edit mode always shows everything.
- **Stepped terminals/checklists:** tick `stepped` → Space reveals one line at a time before the next component.
- **Hold timing (auto mode):** footer `hold s` = global default; EDIT SELECTED `hold s` = per-component override.

**Preview:** footer `▶ play` (step) / `⏩ auto` (timed, no recording).
**Record:** `⏺ REC → step` (you press Space) / `⏩ auto` (plays all with hold timing) → MP4.
Capture is cropped to the canvas (Region Capture) — window title, URL and editor UI never reach the clip. Popout (`⧉`) remains for OBS users and as REC fallback.

---

## How to work on this repo

1. **Read BACKLOG.md first** — it lists shipped vs next-up vs later. Don't duplicate.
2. **Keep it static** — no bundler, no npm. If you add a library, use a CDN `<script>` tag (see `html-to-image`).
3. **One file to edit:** `index.html` is the app. `css/phosphor.css` is the visuals. Don't split without discussion.
4. **Test headless after edits:**
   ```bash
   python3 -m http.server 8000 --directory explainer-studio
   # then in Brave/Chrome headless, fetch index.html and check palette renders
   ```
5. **Don't break file:// fallback** — `assets/tokens.css` is also inlined as `<style id="tokens-inline">` so double-clicking `index.html` works.

---

## For AI agents generating episodes

- Use `examples/*.json` as template. Each beat is an object with `beat` index; components reference `REGISTRY` keys.
- Color semantics: green = healthy, amber = warning/cache, red = failure, cyan = data/storage, dim = infra.
- New tech visuals (fence/node/pod etc.) are already in `REGISTRY` — prefer them over generic boxes for infra videos.

---

## License

MIT — see `LICENSE`.
