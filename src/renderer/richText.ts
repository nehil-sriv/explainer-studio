/**
 * Rich-text parser — verbatim extraction of index.html `rich()` + RICH_COLORS.
 * Pure string function (no DOM). Shared by title/caption/terminal and every
 * text field registry markup calls.
 *
 * Syntax: [g]/[a]/[r]/[c]/[m]/[d] theme colors (+ legacy [w]/[e]/[n]),
 * [#hex] custom, [b] bold, [i] italic, [s1.5] size multiplier.
 * Passes: colors → stash tokens, styles → tokens, escape plain text,
 * restore (nesting-safe loop), newlines → <br>.
 */
export const RICH_COLORS: Record<string, string> = {
  g: 'var(--phos-green)',
  a: 'var(--amber)',
  r: 'var(--alert-red)',
  c: 'var(--cyan-dim)',
  m: 'var(--text-primary)',
  d: 'var(--text-dim)',
  w: 'var(--phos-green)',
  e: 'var(--alert-red)',
  n: 'var(--amber)',
};

export function rich(t: unknown): string {
  const tokens: string[] = [];
  const stash = (html: string): string => {
    tokens.push(html);
    return '\u0000' + (tokens.length - 1) + '\u0000';
  };
  let s = String(t);
  // pass 1: colors (letter names + legacy + custom hex) → protected tokens
  s = s.replace(
    /\[([garcmdwen])\]([\s\S]+?)\[\/\1\]/gi,
    (m, k: string, x: string) => {
      const v = RICH_COLORS[k.toLowerCase()] || k;
      return stash(`<span style="color:${v}">${x}</span>`);
    },
  );
  s = s.replace(
    /\[(\#[0-9a-fA-F]{3,8})\]([\s\S]+?)\[\/#\]/g,
    (m, c: string, x: string) => stash(`<span style="color:${c}">${x}</span>`),
  );
  // pass 2: styles → protected tokens
  s = s.replace(/\[b\]([\s\S]+?)\[\/b\]/g, (m, x: string) => stash(`<b>${x}</b>`));
  s = s.replace(/\[i\]([\s\S]+?)\[\/i\]/g, (m, x: string) => stash(`<i>${x}</i>`));
  s = s.replace(
    /\[s([0-9]*\.?[0-9]+)\]([\s\S]+?)\[\/s\]/g,
    (m, f: string, x: string) => stash(`<span style="font-size:${f}em">${x}</span>`),
  );
  // pass 3: escape whatever plain text remains
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // pass 4: restore rendered tokens — repeat because tokens can nest
  let prev: string | null = null;
  while (s !== prev) {
    prev = s;
    s = s.replace(/\u0000(\d+)\u0000/g, (m, i: string) => tokens[+i]);
  }
  // pass 5: newlines → <br>
  return s.replace(/\r?\n/g, '<br>');
}

/** Element-text escaping (attributes must NOT use this — see index.html note). */
export function escHtml(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
