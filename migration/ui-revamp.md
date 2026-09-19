# UI revamp — approved mock parity (dark navy workbench)

Status: done. `npm test` → 126 passed · `tsc` clean · build works.
Dev server serves the new chrome at `/editor.html` (refresh to see it).

## What changed (chrome only — canvas output untouched)

- **Tokens**: dark navy (`#070d1d` app / `#0d1730` panels / `#2f7bff` accent)
  + refined light paper mode. `--ed-*` still chrome-only.
- **TopBar**: logo mark, `Projects › <name> ⌄` crumb, Preview/Record/Export/
  Open/Popout, sun/moon toggle, static `JD` avatar. All labels kept for tests.
- **Rail**: icon + label sections (Components/Text/Shapes/Icons/
  Illustrations/Uploads/Settings), collapse toggles the panel.
- **Library**: curated storefront (Infrastructure/Services/People & Devices/
  Arrows & Connectors, emoji tiles, See all → full 170 grid → ← Curated),
  icon picker stamping real `icon` kinds (built-in SVG set), Uploads
  (file → data-URL image comp), Settings (theme, hold, canvas W/H, new project).
- **Story**: scene cards with live mini previews, per-scene numbering,
  checklist items as numbered rows, expandable steps (chips, move-to-new,
  run/retire sections), row drag reorder, per-scene + Add step (arms the
  scene), dashed Add-scene card.
- **Properties**: Design/Motion/Story(default)/Export tabs. Story =
  Scene › Step header, Appears stepper, Changes list + add, Exits picker,
  Arrange (new undoable z-order commands), Position/Size/Rotation numerics,
  Appearance (Accent where applicable + Opacity slider). Motion = entrance,
  duration, delay, hold, exit. Export = PNG/SVG/component stills.

## Deliberate deviations from the mock

- Label/Sublabel toggles → generic Opacity + Accent (no per-type
  visibility flags exist in the model; nothing faked).
- "+ Add step" arms the scene (steps are positions — created by adding
  components, per the product rule), rather than inventing content.
- Avatar is a static `JD` chip (local profile placeholder).
- Scene subtitles show live step counts (no subtitle field in the model).

## Tests

`revamp.test.tsx` (6): breadcrumb/actions/avatar, curated tiles + See-all
round-trip, rail section switching, uploads stamping, scene cards +
checklist rows + per-scene numbering, Story-tab sections + z-order + tabs.
Updated `shell.test`/`story.test` to the new contracts (kept hooks:
`data-comp`, `.es-step`, `data-seq`, `data-testid="sequence"`).
