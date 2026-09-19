import { escHtml, rich } from './richText.js';

/**
 * Component-markup helpers — verbatim ports of index.html functions used
 * inside REGISTRY markup bodies. Pure (no DOM) except theme resolution,
 * which legacy reads via getComputedStyle: here it is an injected
 * `resolveTheme(role, fallback)` defaulting to the fallback — identical
 * output to legacy whenever the DOM is absent (node/tests/exports).
 */

export type ThemeResolver = (role: string, fallback: string) => string;

export const defaultThemeResolver: ThemeResolver = (_role, fb) => fb;

export function themeHex(
  name: string,
  fb: string,
  resolve: ThemeResolver = defaultThemeResolver,
): string {
  try {
    return resolve(name, fb);
  } catch {
    return fb || '#39FF7A';
  }
}

/* Resolve a stored accent/color for SVG attributes: explicit hex passes
   through, theme-relative var() (or empty) resolves to the theme hex. */
export function liveHex(
  v: unknown,
  resolve: ThemeResolver = defaultThemeResolver,
): string {
  const s = String(v || '');
  const m = s.match(/^(?:var\()?(--[\w-]+)\)?$/);
  if (m) return themeHex(m[1], s, resolve);
  return /^#[0-9a-fA-F]{3,8}$/.test(s)
    ? s
    : themeHex('--phos-green', '#39FF7A', resolve);
}

/* compact money: Indian units (Cr/L) unless $ (M/B) — ccy is a plain prefix */
export function fmtMoney(v: unknown, ccy: string): string {
  const n = isFinite(+v!) ? +v! : 0;
  const num = n as number;
  const neg = num < 0;
  const a = Math.abs(num);
  let s: string;
  if ((ccy || '') === '$') {
    if (a >= 1e9) s = (a / 1e9).toFixed(2) + 'B';
    else if (a >= 1e6) s = (a / 1e6).toFixed(2) + 'M';
    else if (a >= 1e3) s = (a / 1e3).toFixed(2) + 'k';
    else s = (Math.round(a * 100) / 100).toString();
  } else {
    if (a >= 1e7) s = (a / 1e7).toFixed(2) + ' Cr';
    else if (a >= 1e5) s = (a / 1e5).toFixed(2) + ' L';
    else if (a >= 1e3) s = (a / 1e3).toFixed(2) + 'k';
    else s = (Math.round(a * 100) / 100).toString();
  }
  return (neg ? '-' : '') + (ccy || '') + s;
}

/* escape for SVG <text> (rich() spans are HTML-only — never nest those in SVG) */
export function escXml(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PY_KW =
  'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case';
const PY_BI =
  'abs|all|any|bool|bytes|dict|dir|enumerate|filter|float|format|getattr|hasattr|input|int|isinstance|issubclass|iter|len|list|map|max|min|next|object|open|ord|print|range|repr|reversed|round|set|setattr|sorted|str|sum|super|tuple|type|vars|zip|self|cls';
const PY_RE = new RegExp(
  [
    '(?<cmt>#[^\\n]*)',
    '(?<str>"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|[rbfuRBFU]{0,2}"(?:[^"\\\\\\n]|\\\\.)*"|[rbfuRBFU]{0,2}\'(?:[^\'\\\\\\n]|\\\\.)*\')',
    '(?<dec>@[A-Za-z_][\\w.]*)',
    '(?<cls>(?<=\\bclass\\s)[A-Za-z_]\\w*)',
    '(?<kw>\\b(?:' + PY_KW + ')\\b)',
    '(?<bi>\\b(?:' + PY_BI + ')\\b)',
    '(?<num>\\b\\d[\\w.]*\\b)',
    '(?<fn>\\b[A-Za-z_]\\w*(?=\\s*\\())',
  ].join('|'),
  'g',
);

export interface PyToken {
  t: string;
  v: string;
}

export function pyTokens(src: string): PyToken[] {
  const out: PyToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  PY_RE.lastIndex = 0;
  while ((m = PY_RE.exec(src))) {
    if (m[0] === '') {
      PY_RE.lastIndex++;
      continue;
    }
    if (m.index > last) out.push({ t: '', v: src.slice(last, m.index) });
    const g = m.groups || {};
    out.push({ t: Object.keys(g).find((k) => g[k] !== undefined) || '', v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ t: '', v: src.slice(last) });
  return out;
}

export function pyHi(src: string): string[] {
  const lines: PyToken[][] = [[]];
  pyTokens(src).forEach((tk) => {
    tk.v.split('\n').forEach((part, i) => {
      if (i) lines.push([]);
      if (part) lines[lines.length - 1].push({ t: tk.t, v: part });
    });
  });
  return lines.map((ln) =>
    ln
      .map((k) => (k.t ? `<span class="py-${k.t}">${escHtml(k.v)}</span>` : escHtml(k.v)))
      .join(''),
  );
}

export function parseFocus(spec: unknown): Set<number> | null {
  const s = String(spec == null ? '' : spec).trim();
  if (!s) return null;
  const set = new Set<number>();
  s.split(/[\s,]+/)
    .filter(Boolean)
    .forEach((part) => {
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = +m[1];
        const b = +m[2];
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
      } else if (/^\d+$/.test(part)) set.add(+part);
    });
  return set.size ? set : null;
}

export interface CodeProps {
  body?: unknown;
  lang?: unknown;
  title?: unknown;
  w?: unknown;
  nums?: unknown;
  focus?: unknown;
  accent?: unknown;
}

export function codeMarkup(p: CodeProps): string {
  const src = String(p.body == null ? '' : p.body)
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ');
  const lines = p.lang === 'python' ? pyHi(src) : src.split('\n').map(escHtml);
  const focus = parseFocus(p.focus);
  const gut = String(lines.length).length;
  const body = lines
    .map((h, i) => {
      const n = i + 1;
      const off = focus && !focus.has(n) ? ' cl-off' : '';
      return (
        `<div class="tline cl${off}">` +
        (p.nums ? `<span class="cl-num" style="min-width:${gut}ch">${n}</span>` : '') +
        `<span class="cl-src">${h === '' ? '&#8203;' : h}</span></div>`
      );
    })
    .join('');
  const bar = p.title
    ? `<div class="term-bar"><span class="dot dot-r"></span><span class="dot dot-a"></span><span class="dot dot-g"></span><span class="term-title">${escHtml(p.title)}</span></div>`
    : '';
  return `<div class="codeblock glow" style="width:${+p.w! || 900}px;--stroke:${p.accent || 'var(--phos-green)'}">${bar}<div class="code-body">${body}</div></div>`;
}

export const TK_BOLT =
  '<svg width="24" height="36" viewBox="0 0 24 36" style="display:block"><path d="M14 2 L4 20 h6 l-3 14 L21 14 h-7 z" fill="var(--amber)"/></svg>';
export const TK_CLOCK =
  '<svg width="15" height="15" viewBox="0 0 16 16" style="vertical-align:-2px;margin-right:5px"><circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--amber)" stroke-width="2"/><path d="M8 4.5 V8 L10.5 10" stroke="var(--amber)" stroke-width="2" fill="none"/></svg>';

export function tkCyl(
  p: { w?: unknown; h?: unknown; accent?: unknown; label?: unknown; sub?: unknown },
  opts: { hexes?: boolean; constel?: boolean; bolt?: boolean } = {},
): string {
  const overlay = opts.hexes
    ? '<span class="hexgrid"></span>'
    : opts.constel
      ? `<svg class="constel" viewBox="0 0 100 52" preserveAspectRatio="none">
        <path d="M8 40 L30 18 L55 34 L78 12 L92 30 M30 18 L48 44 L78 12 M55 34 L88 46" stroke="var(--text-dim)" stroke-width="1.2" fill="none" opacity=".7"/>
        ${[[8, 40], [30, 18], [55, 34], [78, 12], [92, 30], [48, 44], [88, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="var(--stroke)"/>`).join('')}
      </svg>`
      : '';
  return `<div class="tk-cyl" style="width:${p.w}px;height:${p.h}px;--stroke:${p.accent}">
    <div class="cbody"></div>${overlay}
    <div class="clabel">${opts.bolt ? TK_BOLT : ''}${p.label ? rich(p.label) : ''}${p.sub ? `<span style="font-size:.72em;color:var(--text-dim);letter-spacing:2px">${p.sub}</span>` : ''}</div>
  </div>`;
}

export function gnIcon(kind: string): string {
  const S = 'fill="none" stroke="currentColor" stroke-width="2"';
  const M: Record<string, string> = {
    gateway: `<path d="M12 3 L21 8 V16 L12 21 L3 16 V8 Z" ${S}/><path d="M3 8 L12 13 L21 8 M12 13 V21" ${S}/>`,
    api: `<path d="M8 6 L3 12 L8 18 M16 6 L21 12 L16 18 M13 4 L11 20" ${S}/>`,
    db: `<ellipse cx="12" cy="6" rx="7" ry="3" ${S}/><path d="M5 6 V18 C5 19.7 8.1 21 12 21 C15.9 21 19 19.7 19 18 V6 M5 12 C5 13.7 8.1 15 12 15 C15.9 15 19 13.7 19 12" ${S}/>`,
    cache: `<path d="M13 2 L5 13 H11 L10 22 L19 9 H13 Z" ${S}/>`,
    queue: `<path d="M3 7 H21 M3 12 H21 M3 17 H15" ${S}/>`,
    worker: `<circle cx="12" cy="12" r="4" ${S}/><path d="M12 2 V6 M12 18 V22 M2 12 H6 M18 12 H22 M5 5 L8 8 M16 16 L19 19 M19 5 L16 8 M8 16 L5 19" ${S}/>`,
    user: `<circle cx="12" cy="8" r="4" ${S}/><path d="M4 21 C4 16 7 14 12 14 C17 14 20 16 20 21" ${S}/>`,
    cdn: `<path d="M6 19 A4.5 4.5 0 1 1 8 10 A5.5 5.5 0 0 1 18 12 A3.5 3.5 0 0 1 17.5 19 Z" ${S}/>`,
    app: `<rect x="3" y="4" width="18" height="16" rx="2" ${S}/><path d="M3 9 H21" ${S}/>`,
    ram: `<rect x="2" y="8" width="20" height="9" rx="1" ${S}/><rect x="6" y="10.5" width="4" height="4" ${S}/><rect x="14" y="10.5" width="4" height="4" ${S}/><path d="M6 17 V21 M12 17 V21 M18 17 V21" ${S}/>`,
    cpu: `<rect x="7" y="7" width="10" height="10" rx="1" ${S}/><rect x="10.5" y="10.5" width="3" height="3" ${S}/><path d="M9 7 V3 M12 7 V3 M15 7 V3 M9 21 V17 M12 21 V17 M15 21 V17 M7 9 H3 M7 12 H3 M7 15 H3 M21 9 H17 M21 12 H17 M21 15 H17" ${S}/>`,
    gpu: `<rect x="2" y="6" width="20" height="11" rx="1" ${S}/><circle cx="9" cy="11.5" r="3" ${S}/><path d="M9 8.5 V11.5 M9 11.5 L11.6 13 M9 11.5 L6.4 13" ${S}/><path d="M6 17 V21 M18 17 V21 M15 11.5 H20" ${S}/>`,
    bw: `<path d="M4 17 A8 8 0 0 1 20 17" ${S}/><path d="M12 17 L16 10" ${S}/><circle cx="12" cy="17" r="1.5" ${S}/><path d="M2 17 H22" ${S}/>`,
    coin: `<ellipse cx="12" cy="6" rx="7" ry="2.5" ${S}/><path d="M5 6 V12 C5 13.4 8.1 14.5 12 14.5 C15.9 14.5 19 13.4 19 12 V6" ${S}/><path d="M5 12 V18 C5 19.4 8.1 20.5 12 20.5 C15.9 20.5 19 19.4 19 18 V12" ${S}/>`,
    card: `<rect x="2" y="5" width="20" height="14" rx="2" ${S}/><path d="M2 10 H22 M6 15 H10" ${S}/>`,
    chartup: `<path d="M3 21 H21" ${S}/><path d="M4 16 L9 11 L13 14 L20 6" ${S}/><path d="M15 6 H20 V11" ${S}/>`,
    chartdown: `<path d="M3 21 H21" ${S}/><path d="M4 8 L9 13 L13 10 L20 18" ${S}/><path d="M15 18 H20 V13" ${S}/>`,
    doc: `<path d="M6 2 H14 L20 8 V22 H6 Z" ${S}/><path d="M14 2 V8 H20" ${S}/><path d="M9 13 H17 M9 17 H17" ${S}/>`,
    calc: `<rect x="5" y="2" width="14" height="20" rx="2" ${S}/><path d="M8 6 H16" ${S}/><path d="M8.5 11.5 V14.5 M7 13 H10 M13.5 11.5 V14.5 M12 13 H15 M8.5 16.5 V19.5 M7 18 H10 M13.5 16.5 V19.5 M12 18 H15" ${S}/>`,
    clock: `<circle cx="12" cy="12" r="9" ${S}/><path d="M12 7 V12 L15.5 13.5" ${S}/>`,
    cal: `<rect x="3" y="5" width="18" height="16" rx="2" ${S}/><path d="M3 10 H21 M8 3 V7 M16 3 V7" ${S}/>`,
    check: `<path d="M4 12 L10 18 L20 6" ${S}/>`,
    x: `<path d="M6 6 L18 18 M18 6 L6 18" ${S}/>`,
    plus: `<path d="M12 5 V19 M5 12 H19" ${S}/>`,
    search: `<circle cx="11" cy="11" r="7" ${S}/><path d="M16.5 16.5 L21 21" ${S}/>`,
    bell: `<path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 19 H4 Z" ${S}/><path d="M10 22 A2.5 2.5 0 0 0 14 22" ${S}/>`,
    mail: `<rect x="3" y="5" width="18" height="14" rx="2" ${S}/><path d="M3 7 L12 13 L21 7" ${S}/>`,
    pin: `<path d="M12 21 C7 15 5 12 5 9 A7 7 0 0 1 19 9 C19 12 17 15 12 21" ${S}/><circle cx="12" cy="9" r="2.5" ${S}/>`,
    star: `<path d="M12 3 L14.7 8.6 L21 9.3 L16.4 13.7 L17.6 20 L12 17 L6.4 20 L7.6 13.7 L3 9.3 L9.3 8.6 Z" ${S}/>`,
    heart: `<path d="M12 20 C6 15 3 12 3 8.8 C3 6 5.2 4 7.8 4 C9.4 4 11 5 12 6.5 C13 5 14.6 4 16.2 4 C18.8 4 21 6 21 8.8 C21 12 18 15 12 20" ${S}/>`,
    lock: `<rect x="5" y="10" width="14" height="10" rx="2" ${S}/><path d="M8 10 V7 A4 4 0 0 1 16 7 V10" ${S}/>`,
    globe: `<circle cx="12" cy="12" r="9" ${S}/><path d="M3 12 H21 M12 3 C8 7 8 17 12 21 C16 17 16 7 12 3" ${S}/>`,
    shield: `<path d="M12 2 L20 6 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V6 Z" ${S}/><path d="M9 12 L11.5 14.5 L15.5 10" ${S}/>`,
    bulb: `<path d="M9 18 H15 M10 21 H14" ${S}/><path d="M12 3 A6 6 0 0 0 6.5 13.5 C7.5 14.5 8 15.5 8 16.5 H16 C16 15.5 16.5 14.5 17.5 13.5 A6 6 0 0 0 12 3" ${S}/>`,
    target: `<circle cx="12" cy="12" r="9" ${S}/><circle cx="12" cy="12" r="5" ${S}/><circle cx="12" cy="12" r="1" ${S}/>`,
    rocket: `<path d="M12 2 C15 5 16 9 15.5 13 L8.5 13 C8 9 9 5 12 2" ${S}/><circle cx="12" cy="9" r="1.5" ${S}/><path d="M8.5 13 L5 18 M15.5 13 L19 18 M9 18 H15" ${S}/>`,
    gear: `<circle cx="12" cy="12" r="3" ${S}/><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M19.1 4.9 L17 7 M7 17 L4.9 19.1" ${S}/>`,
    download: `<path d="M12 3 V16 M7 11 L12 16 L17 11 M4 21 H20" ${S}/>`,
  };
  return M[kind] || M.api;
}

export function fmtTime(s: unknown): string {
  const n = Math.max(0, Math.floor((s as number) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const x = n % 60;
  const p = (v: number): string => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
}

/* theme colors only for point accents — var(--role) or #hex, nothing else */
export function cleanThemeColor(s: unknown): string {
  const v = String(s || '').split(';')[0].trim();
  if (/^var\(--[\w-]+\)$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return '';
}

export function splitPipeLines(s: unknown): string[] {
  return String(s || '')
    .split('\n')
    .flatMap((l) => l.split('|'))
    .map((x) => x.trim());
}

export interface BulletRow {
  t: string;
  bg: string;
  anim: string;
  ac: string;
}

export function bulletRows(p: {
  items?: unknown;
  fills?: unknown;
  anims?: unknown;
  pointacc?: unknown;
  accents?: unknown;
}): BulletRow[] {
  const pts = splitPipeLines(p.items).filter(Boolean);
  const fls = splitPipeLines(p.fills);
  const ans = splitPipeLines(p.anims);
  const acs = splitPipeLines(p.pointacc || p.accents);
  return pts.map((t, i) => ({
    t,
    bg: fls[i] || '',
    anim: ans[i] || 'default',
    ac: acs[i] || '',
  }));
}
