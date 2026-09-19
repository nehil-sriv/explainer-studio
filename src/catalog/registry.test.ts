import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { REGISTRY } from './registry.js';
import { CATALOG_GROUPS } from './groups.js';
import { escHtml, rich } from '../renderer/richText.js';
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
} from '../renderer/componentHelpers.js';

/**
 * Golden equivalence: every extracted markup(props) must return byte-identical
 * HTML to the legacy REGISTRY markup with default props.
 * Legacy source is eval'd directly out of index.html (helpers injected —
 * the registry body itself is DOM-free, verified during extraction).
 */
function legacyRegistry(): Record<string, { props: unknown; markup: (p: any) => string }> {
  const html = readFileSync('index.html', 'utf8');
  const start = html.indexOf('const REGISTRY = {');
  const end = html.indexOf('\n/* ============ state ============ */');
  const src = html.slice(start, end);
  const factory = new Function(
    'rich',
    'escHtml',
    'tkCyl',
    'gnIcon',
    'liveHex',
    'fmtMoney',
    'escXml',
    'codeMarkup',
    'splitPipeLines',
    'bulletRows',
    'cleanThemeColor',
    'fmtTime',
    'TK_BOLT',
    'TK_CLOCK',
    `${src}; return REGISTRY;`,
  );
  return factory(
    rich,
    escHtml,
    tkCyl,
    gnIcon,
    liveHex,
    fmtMoney,
    escXml,
    codeMarkup,
    splitPipeLines,
    bulletRows,
    cleanThemeColor,
    fmtTime,
    TK_BOLT,
    TK_CLOCK,
  );
}

// biome-ignore lint/suspicious/noExplicitAny: golden-test cloning is untyped by design
const clone = (v: unknown): any => JSON.parse(JSON.stringify(v ?? {}));

describe('catalog golden equivalence', () => {
  it('extracts all 170 entries with metadata intact', () => {
    const keys = Object.keys(REGISTRY);
    expect(keys.length).toBe(170);
    expect(CATALOG_GROUPS.reduce((n, g) => n + g.count, 0)).toBe(170);
    for (const [key, def] of Object.entries(REGISTRY)) {
      expect(typeof def.name, `${key}.name`).toBe('string');
      expect(typeof def.group, `${key}.group`).toBe('string');
      expect(Array.isArray(def.fields), `${key}.fields`).toBe(true);
      expect(typeof def.markup, `${key}.markup`).toBe('function');
    }
  });

  it('markup(defaultProps) is byte-identical to legacy for all 170 types', () => {
    const legacy = legacyRegistry();
    expect(Object.keys(legacy).length).toBe(170);
    const mismatches: string[] = [];
    for (const key of Object.keys(REGISTRY)) {
      const expected = legacy[key].markup(clone(legacy[key].props));
      const actual = REGISTRY[key].markup(clone(REGISTRY[key].props));
      if (actual !== expected) mismatches.push(key);
    }
    expect(mismatches, `${mismatches.length} markup mismatches`).toEqual([]);
  });

  it('default props are identical to legacy', () => {
    const legacy = legacyRegistry();
    const mismatches: string[] = [];
    for (const key of Object.keys(REGISTRY)) {
      if (JSON.stringify(REGISTRY[key].props) !== JSON.stringify(legacy[key].props))
        mismatches.push(key);
    }
    expect(mismatches, `${mismatches.length} props mismatches`).toEqual([]);
  });
});
