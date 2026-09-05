# Canvas themes

One file per theme, scoped to `#scene[data-theme="<key>"]`, overriding only
what differs from `assets/tokens.css`. Canvas-only: themes change what gets
recorded, never the builder chrome.

## Add a theme (two steps)

1. Copy `_template.css` → `<key>.css` and fill in what differs.
2. One line in `manifest.js`:
   `{ key: '<key>', label: 'Name · one-liner', dark: true },`

Add `hidden: true` to keep the file working (old projects, recordings) while
dropping it out of the picker. `js/themes.js` never needs touching.

## Why CSS files, not JSON

`fetch()` is blocked on `file://`, and double-clicking `index.html` has to
keep working. A `<link>` injection works everywhere — and CSS is the natural
way to express "override just these few things". A two-line theme is valid.

## Loading

Additive, activation by attribute: a sheet is injected once, on first
selection, and only matches its own `data-theme`. A loaded-but-unselected
theme costs nothing and never needs unloading — switching is one attribute
write. The popout links every sheet up front (its cloned `#scene` already
carries its `data-theme`).

## Files

- `manifest.js` — the ONLY file you edit to add/hide a theme
- `_template.css` — copy this
- `<key>.css` — one per theme (16 shipped: 7 in the picker, 9 hidden)
- `design/` (gitignored, local-only) — sample mockups, not shipped
