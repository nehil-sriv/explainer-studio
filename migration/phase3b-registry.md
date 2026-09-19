# Phase 3b — Registry extraction (MIGRATION_PLAN.md Phase 3, part 2)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 29 passed · `npx tsc --noEmit` clean · `npm run build` works.

## Extracted

- `src/renderer/componentHelpers.ts` — hand-ported markup helpers, logic-verbatim:
  `themeHex/liveHex` (theme lookup injected, DOM-free default),
  `fmtMoney`, `escXml`, `pyTokens/pyHi/parseFocus/codeMarkup`, `TK_BOLT/
  TK_CLOCK`, `tkCyl`, `gnIcon` (38 icons), `fmtTime`, `splitPipeLines/
  bulletRows`, `cleanThemeColor`. `rich/escHtml` reused from Phase 3a.
- `src/catalog/components/*.ts` — all **170** entries in 16 group files
  (basics12 ui10 meta41 seq4 nodes18 actors2 shapes2 data10 groups1
  flow14 ai20 logic4 chrome7 charts6 finance11 cloud8), bodies VERBATIM.
- `src/catalog/registry.ts` — `ComponentDef` + merged `REGISTRY`.
- `src/catalog/groups.ts` — ordered group manifest with counts.
- `migration/extract-registry.mjs` — the reproducible procedure
  (re-run: `node migration/extract-registry.mjs`). Slice → context-stack
  brace matcher (code/tpl/strings/comments + regex-literal heuristic) →
  split by `group` → emit. Bodies never re-indented (template-literal
  whitespace is output).

## Golden gate (registry.test.ts)

Legacy REGISTRY is eval'd straight out of `index.html` (helpers injected;
registry body proven DOM-free — `document`/`window` hits are prose
substrings). For all 170 types: `markup(structuredClone(defaultProps))`
is **byte-identical** and default props are deep-equal.

## Bugs found while extracting (all in tooling/tests, legacy vindicated)

1. Trailing-comma strip broke on entries ending with `//` comments, then
   on inter-entry `/*` banners → brace-matcher rewrite with carry/prefix.
2. Matcher compared chars to mode NAMES (`'sq'` vs `"'"`) — frames now
   store the quote char; caught by hexdump (quotes are ASCII 0x27).
3. `/" /g` regex literal corrupted brace matching → regex heuristic
   (slice holds exactly 4 regex literals, verified by survey).
4. De-indentation corrupted template-literal whitespace (44 diffs) →
   bodies kept byte-verbatim; caught by the golden test doing its job.
5. Missed helper `cleanThemeColor` (bullets) → ported; eval guards the set.
6. tsc strict vs verbatim JS (~100 implicit-any/union errors) → generated
   files carry `// @ts-nocheck`; safety lives at the ComponentDef boundary
   + golden tests (documented in the file header).

## Remaining for full renderScene() (explicit non-goal)

Per-comp wrapper (position/transform/entrance), stepped-line reveal,
ticker/digit liveness, edge SVG assembly, and the five render modes
(editor/preview/popout/snapshot/recording) stay in legacy — they need the
store (Phase 4) and shell (Phase 5). Pure frame resolution
(`resolveSceneAtStep`) already covers takes/exports deterministically.
