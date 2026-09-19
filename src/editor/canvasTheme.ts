/** Canvas theme picker mirror (themes/manifest.js is the source of truth;
 *  duplicated here so the shell never executes legacy scripts). */
import { THEME_VARS } from './themeVars.generated.js';

export const CANVAS_THEMES = [
  { key: 'minimal', label: 'Minimal' },
  { key: 'warm-paper', label: 'Warm Paper' },
  { key: 'quiet-terminal', label: 'Quiet Terminal' },
  { key: 'technical-blue', label: 'Technical Blue' },
  { key: 'ink-grid', label: 'Ink Grid' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'neon', label: 'Neon' },
  { key: 'ember', label: 'Ember' },
  { key: 'insta', label: 'Insta' },
  { key: 'studio-black', label: 'Studio Black' },
  { key: 'phosphor', label: 'Phosphor' },
  { key: 'paper', label: 'Paper' },
  { key: 'glass', label: 'Glass' },
  { key: 'brutal', label: 'Brutal' },
];

const ROLES = [
  'bg-deep',
  'panel',
  'text-primary',
  'text-dim',
  'phos-green',
  'amber',
  'cyan-dim',
  'alert-red',
  'canvas-texture',
  'canvas-texture-size',
  'font-display',
  'font-body',
  'font-data',
  'font-hand',
] as const;

export interface ThemeSwatch {
  '--bg-deep': string;
  '--panel': string;
  '--text-primary': string;
  '--text-dim': string;
  '--phos-green': string;
  '--amber': string;
  '--cyan-dim': string;
  '--alert-red': string;
  '--canvas-texture': string;
  '--canvas-texture-size': string;
  '--font-display': string;
  '--font-body': string;
  '--font-data': string;
  '--font-hand': string;
  /** ready-to-use preview style: real surface + real texture */
  preview: React.CSSProperties;
}

const cache = new Map<string, ThemeSwatch>();

/**
 * Read a theme's real role values out of the generated theme CSS and turn
 * them into an inline style. Preview chips and the recorded scene therefore
 * share one source — no parallel preview palette to drift.
 */
export function themeSwatch(key: string): ThemeSwatch {
  const hit = cache.get(key);
  if (hit) return hit;
  const vars: Record<string, string> = THEME_VARS[key] ?? {};
  const fallback: Record<string, string> = {
    'bg-deep': '#0a0f0a',
    panel: '#101710',
    'text-primary': '#d3ffde',
    'text-dim': '#5c8a66',
    'phos-green': '#39ff7a',
    amber: '#ffb000',
    'cyan-dim': '#57c7c0',
    'alert-red': '#ff5555',
    'font-display': "'Fraunces', Georgia, serif",
    'font-body': "'Inter', system-ui, sans-serif",
    'font-data': "'JetBrains Mono', ui-monospace, monospace",
    'font-hand': "'Caveat', cursive",
  };
  const out = {} as ThemeSwatch;
  const rec = out as unknown as Record<string, string>;
  for (const role of ROLES) {
    rec[`--${role}`] = vars[role] || fallback[role] || '';
  }
  if (!out['--canvas-texture']) out['--canvas-texture'] = 'none';
  if (!out['--canvas-texture-size']) out['--canvas-texture-size'] = 'auto';
  out.preview = {
    backgroundColor: out['--bg-deep'],
    backgroundImage: out['--canvas-texture'] === 'none' ? undefined : out['--canvas-texture'],
    backgroundSize: out['--canvas-texture-size'],
  };
  cache.set(key, out);
  return out;
}
