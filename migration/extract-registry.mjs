/**
 * Mechanical registry extraction (Phase 3b).
 * Re-run procedure (cf. AGENTS.md split precedent):
 *   node migration/extract-registry.mjs
 * Reads index.html, slices `const REGISTRY = {...};`, splits entries by
 * their `group` field into src/catalog/components/<group>.ts, and writes
 * src/catalog/registry.ts (ComponentDef + merged REGISTRY) and
 * src/catalog/groups.ts (ordered manifest).
 * Entry bodies are preserved VERBATIM — zero visual change by construction.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');

const start = src.indexOf('const REGISTRY = {');
const endMarker = '\n/* ============ state ============ */';
const end = src.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error('registry bounds not found');
const body = src.slice(start, end); // ends with '};\n'

// Split entries: each starts with two-space indent `  <key>:` at line start.
const entryRe = /^  (\w+): *\{/gm;
const starts = [];
let m;
while ((m = entryRe.exec(body))) starts.push({ key: m[1], index: m.index });
if (starts.length !== 170)
  throw new Error(`expected 170 entries, found ${starts.length}`);

/**
 * Consume a regex literal starting at the `/` at index i; return the index
 * of its last char (flags included). Handles escapes and [...] classes.
 */
function consumeRegex(text, i) {
  let j = i + 1;
  let inClass = false;
  for (; j < text.length; j++) {
    const ch = text[j];
    if (ch === '\\') {
      j++;
      continue;
    }
    if (ch === '[') {
      inClass = true;
      continue;
    }
    if (ch === ']' && inClass) {
      inClass = false;
      continue;
    }
    if (ch === '/' && !inClass) break;
    if (ch === '\n') break; // not a regex — bail at line end
  }
  while (/[gimsuy]/.test(text[j + 1] || '')) j++;
  return j;
}

/**
 * Find the index just past the `}` balancing the `{` at openIdx.
 * Context-stack machine (code/tpl/strings/comments). Safe for this slice:
 * verified it contains no regex literals with braces, quotes or backticks
 * (only /^<|>$/g, /"/g, /^[+-]/ and lone divisions).
 */
function matchBrace(text, openIdx) {
  // Frames: 'code' | 'tpl' | 'line' | 'block' | "'" | '"' (string frames
  // store the quote char itself so the pop comparison matches).
  const stack = []; // text[openIdx] pushes the first frame below
  let i = openIdx;
  const push = (c) => stack.push(c);
  for (; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1] || '';
    const top = stack[stack.length - 1];
    if (top === 'line') {
      if (ch === '\n') stack.pop();
      continue;
    }
    if (top === 'block') {
      if (ch === '*' && nx === '/') {
        stack.pop();
        i++;
      }
      continue;
    }
    if (top === "'" || top === '"') {
      if (ch === '\\') i++;
      else if (ch === top) stack.pop();
      continue;
    }
    if (top === 'tpl') {
      if (ch === '\\') i++;
      else if (ch === '`') stack.pop();
      else if (ch === '$' && nx === '{') {
        push('code');
        i++;
      } else if (ch === "'") push("'");
      else if (ch === '"') push('"');
      continue;
    }
    // code
    if (ch === '/' && nx === '/') {
      push('line');
      i++;
      continue;
    }
    if (ch === '/' && nx === '*') {
      push('block');
      i++;
      continue;
    }
    if (ch === '/' && nx !== '/' && nx !== '*') {
      // regex-literal heuristic: `/` opens a regex only after an operator
      // (or at the start); after a value char it is division. The slice's
      // only quote-bearing regex is /"/g — this keeps the matcher exact.
      let k = i - 1;
      while (k >= 0 && /\s/.test(text[k])) k--;
      const prev = k >= 0 ? text[k] : '';
      if (prev === '' || '(,=:[!&|?{};'.includes(prev)) {
        i = consumeRegex(text, i);
        continue;
      }
      continue; // division — no state change
    }
    if (ch === "'") {
      push("'");
      continue;
    }
    if (ch === '"') {
      push('"');
      continue;
    }
    if (ch === '`') {
      push('tpl');
      continue;
    }
    if (ch === '{') {
      push('code');
      continue;
    }
    if (ch === '}') {
      stack.pop();
      if (!stack.length) return i + 1;
      continue;
    }
  }
  throw new Error('unbalanced braces from ' + openIdx);
}

const entries = starts.map((s, i) => {
  const openIdx = body.indexOf('{', s.index);
  const closeEnd = matchBrace(body, openIdx);
  const next = i + 1 < starts.length ? starts[i + 1].index : body.length;
  // Carry = anything between this entry's close and the next entry's start
  // (banner comments, blanks). The last slice ends with the registry `};`.
  let carry = body.slice(closeEnd, next);
  if (i === starts.length - 1) {
    if (!/\n\};\s*$/.test(carry)) throw new Error('registry tail not found');
    carry = '';
  }
  let text = body.slice(s.index, closeEnd) + ',';
  // NOTE: no de-indentation — entry bodies keep source indentation verbatim.
  // Stripping leading spaces would corrupt whitespace INSIDE template
  // literals (multi-line markup), breaking byte-equivalence.
  return { key: s.key, text, carry: carry.trim() };
});

const groupOf = (text) => {
  const g = text.match(/^\s*group:'([^']+)'/m);
  if (!g) throw new Error('entry without group: ' + text.slice(0, 60));
  return g[1];
};

const byGroup = new Map();
for (const e of entries) {
  const g = groupOf(e.text);
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push(e);
}

const compDir = join(root, 'src', 'catalog', 'components');
mkdirSync(compDir, { recursive: true });

const IMPORTS = `// @ts-nocheck — verbatim legacy JS (see header below). Type safety lives
// at the ComponentDef boundary (registry.ts) plus the golden tests
// (registry.test.ts), not inside these generated bodies.
import type { ComponentDef } from '../registry.js';
import { rich, escHtml } from '../../renderer/richText.js';
import {
  bulletRows,
  cleanThemeColor,
  codeMarkup,
  escXml,
  fmtMoney,
  fmtTime,
  gnIcon,
  liveHex,
  splitPipeLines,
  tkCyl,
  TK_BOLT,
  TK_CLOCK,
} from '../../renderer/componentHelpers.js';
`;

// Carries belong to the NEXT entry in source order (banners precede the
// section they label), regardless of group file placement.
entries.forEach((e, i) => {
  e.prefix = i > 0 ? entries[i - 1].carry : '';
  delete e.carry;
});
for (const e of entries) {
  if (
    e.prefix &&
    !e.prefix.split('\n').every((l) => !l.trim() || l.trim().startsWith('/*') || l.trim().startsWith('*') || l.trim().endsWith('*/'))
  )
    throw new Error(`non-comment carry before ${e.key}: ${e.prefix.slice(0, 120)}`);
}

for (const [group, list] of byGroup) {
  const chunks = [];
  for (const e of list) {
    if (e.prefix) chunks.push(e.prefix);
    chunks.push(e.text);
  }
  const out =
    `/** ${group} components — extracted verbatim from index.html REGISTRY. */\n` +
    IMPORTS +
    `\nexport const ${group}Components: Record<string, ComponentDef> = {\n` +
    chunks.join('\n') +
    '\n};\n';
  writeFileSync(join(compDir, `${group}.ts`), out);
}

const groupNames = [...byGroup.keys()];
const registryTs =
  `/** Component catalog — merged REGISTRY (verbatim extraction). */\n` +
  groupNames.map((g) => `import { ${g}Components } from './components/${g}.js';`).join('\n') +
  `\n\nexport interface ComponentDef {
  name: string;
  group: string;
  // biome-ignore lint/suspicious/noExplicitAny: registry props are free-form by design
  props: Record<string, any>;
  fields: string[];
  fieldTypes?: Record<string, string>;
  // biome-ignore lint/suspicious/noExplicitAny: registry options are free-form by design
  options?: Record<string, any>;
  help?: string;
  // biome-ignore lint/suspicious/noExplicitAny: markup receives free-form props by design
  markup: (p: any) => string;
  // biome-ignore lint/suspicious/noExplicitAny: forward-compat passthrough
  [key: string]: any;
}

export const REGISTRY: Record<string, ComponentDef> = Object.assign(
  {},
\n` +
  groupNames.map((g) => `  ${g}Components,`).join('\n') +
  `\n);\n`;
writeFileSync(join(root, 'src', 'catalog', 'registry.ts'), registryTs);

const groupsTs =
  `/** Catalog groups manifest — order of first appearance in the registry. */\n` +
  `export interface CatalogGroup { key: string; count: number; }\n\n` +
  `export const CATALOG_GROUPS: CatalogGroup[] = [\n` +
  groupNames.map((g) => `  { key: '${g}', count: ${byGroup.get(g).length} },`).join('\n') +
  `\n];\n`;
writeFileSync(join(root, 'src', 'catalog', 'groups.ts'), groupsTs);

console.log(
  `extracted ${entries.length} entries into ${groupNames.length} groups: ` +
    groupNames.map((g) => `${g}(${byGroup.get(g).length})`).join(' '),
);
