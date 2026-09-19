import { describe, expect, it } from 'vitest';
import { escHtml, rich } from './richText.js';

describe('rich()', () => {
  it('renders theme colors, legacy aliases and custom hex', () => {
    expect(rich('RAG IS JUST [g]OPEN BOOK[/g]')).toBe(
      'RAG IS JUST <span style="color:var(--phos-green)">OPEN BOOK</span>',
    );
    expect(rich('[w]g[/w][e]r[/e][n]a[/n]')).toBe(
      '<span style="color:var(--phos-green)">g</span>' +
        '<span style="color:var(--alert-red)">r</span>' +
        '<span style="color:var(--amber)">a</span>',
    );
    expect(rich('[#FF0000]x[/#]')).toBe('<span style="color:#FF0000">x</span>');
    expect(rich('[c]cyan[/c] [m]mint[/m] [d]dim[/d] [a]amber[/a]')).toContain(
      'var(--cyan-dim)',
    );
  });

  it('renders styles, sizes and nesting', () => {
    expect(rich('[b]bold[/b] [i]it[/i]')).toBe('<b>bold</b> <i>it</i>');
    expect(rich('[s1.5]x[/s]')).toBe('<span style="font-size:1.5em">x</span>');
    expect(rich('[b]a [g]x[/g][/b]')).toBe(
      '<b>a <span style="color:var(--phos-green)">x</span></b>',
    );
  });

  it('escapes stray markup but keeps newlines as <br>', () => {
    expect(rich('a<b & c')).toBe('a&lt;b &amp; c');
    expect(rich('l1\nl2')).toBe('l1<br>l2');
    expect(escHtml('a"b<c>&')).toBe('a"b&lt;c&gt;&amp;');
  });

  it('documents the legacy nesting asymmetry (colors stash first)', () => {
    // style-outside/color-inside nests; color-outside/style-inside stays
    // literal — verified verbatim against index.html rich() via node.
    // (The phase0 caption intentionally exercises this quirk.)
    // Note: the size tag closes with [/s], not [/s1.5] (see regex).
    expect(rich('[r][b]Database fails[/b][/r] · fails to respond [s1.5]⚠[/s]')).toBe(
      '<span style="color:var(--alert-red)">[b]Database fails[/b]</span> · fails to respond <span style="font-size:1.5em">⚠</span>',
    );
  });
});
