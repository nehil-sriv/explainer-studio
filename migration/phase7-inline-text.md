# Phase 7 — In-place text editing (MIGRATION_PLAN.md)

Status: done, additive only. Legacy `index.html` untouched.
`npm test` → 67 passed · `npx tsc --noEmit` clean · `npm run build` works.

## What was added

- `src/editor/canvas/editableFields.ts` — primary-field map: first present
  of text/title/label/name/sub/body/items; multiline when the fieldType is
  textarea/code or the key is body/items. `state` steps, unknown types and
  textless comps (rec/frame/spinner) return null → double-click no-ops.
- `src/editor/canvas/InlineTextEditor.tsx` — temporary overlay (never a
  permanent contenteditable node): positioned over the rendered box, style
  copied from the rendered text node (font/size/line-height/align/color,
  guarded fallbacks). Contract: single click selects · double-click edits ·
  Enter commits short labels · Shift+Enter breaks lines · Ctrl/Cmd+Enter
  commits multiline · Escape cancels · outside click commits. Tokens stay
  raw (`[g]` editable as text); commit is one `updateProps` = one undo entry.
- `CanvasWorkspace` wiring: dblclick opens the session, drag/handles
  suppressed while editing, overlay cleared when its comp vanishes.

## Gate evidence (`canvas-inline.test.tsx`)

Field map unit test + 5 interaction tests: raw tokens in the editor,
Enter→one undo entry, Escape→zero history, Shift+Enter newline with
Ctrl+Enter commit, outside-click commit, textless no-op, and edited text
rendering identically inside a preview take.

## Bugs found (all test-side except one source)

1. Store commands issued after `render()` need `act()` flushing (established
   Phase 6 pattern) — applied to spinner setup + play/step assertions.
2. Outside-click guard assumed Element targets; synthetic window dispatches
   carry non-Node targets → guard hardened (`instanceof Node` check).
