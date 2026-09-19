import type { SceneComponent } from '../domain/component.js';

/**
 * Inspector style bridge — maps the generic Style/Layout props written by
 * the properties panel onto the rendered `.comp` wrapper.
 *
 * Components keep owning their internal typography (the three-voice system),
 * so overrides are applied as wrapper-scoped custom properties plus class
 * flags. `styleOverrides.css` turns the flags into descendant rules and only
 * when the user actually set that field — an untouched component renders
 * byte-identical to before.
 *
 * Color/background mirror the legacy renderCanvas contract (`--ca/--cc/--ct`
 * from `props.color`, `--cbg` from `props.bg`) so tint/background follow the
 * active canvas theme exactly like the builder did.
 */

const FONT_STACKS: Record<string, string> = {
  Inter: 'var(--font-body)',
  VT323: 'var(--font-display)',
  'JetBrains Mono': 'var(--font-data)',
  Caveat: 'var(--font-hand)',
  System: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

const FONT_WEIGHTS: Record<string, string> = {
  Regular: '400',
  Medium: '500',
  Bold: '700',
};

export interface CompPaint {
  /** class flags consumed by styleOverrides.css */
  classes: string[];
  /** wrapper CSS custom properties (colors, scale, override channels) */
  vars: Record<string, string>;
  /** wrapper inline styles (inherited where the component allows it) */
  style: Record<string, string | number>;
}

function asNumber(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

/** Resolve the inspector's generic style props for one component. */
export function compPaint(
  c: SceneComponent,
  props: Record<string, unknown>,
): CompPaint {
  const classes: string[] = [];
  const vars: Record<string, string> = {};
  const style: Record<string, string | number> = {};

  // text color / tint — legacy tint contract (wins wherever a component
  // consumes --ca/--cc/--ct); inline color covers inheritance-based text.
  const color = asString(props.color);
  if (color) {
    vars['--ca'] = color;
    vars['--cc'] = color;
    vars['--ct'] = color;
    style.color = color;
  }

  // background — --cbg is the legacy channel; the explicit switch also
  // paints the wrapper box so components that never read --cbg respond.
  const bg = asString(props.bg);
  if (bg) {
    vars['--cbg'] = bg;
    if (props.bgEnabled) {
      vars['--es-bg'] = bg;
      classes.push('es-so-bg');
    }
  }

  const font = asString(props.font);
  if (font && FONT_STACKS[font]) {
    vars['--es-font'] = FONT_STACKS[font];
    classes.push('es-so-font');
  }

  const weight = asString(props.weight);
  if (weight && FONT_WEIGHTS[weight]) {
    vars['--es-weight'] = FONT_WEIGHTS[weight];
    classes.push('es-so-weight');
  }

  const size = asNumber(props.fontSize);
  if (size !== undefined) {
    vars['--es-size'] = `${Math.max(1, size)}px`;
    classes.push('es-so-size');
  }

  const align = asString(props.align);
  if (align) {
    vars['--es-align'] = align;
    classes.push('es-so-align');
  }

  const lineHeight = asNumber(props.lineHeight);
  if (lineHeight !== undefined) {
    vars['--es-lh'] = String(lineHeight);
    classes.push('es-so-lh');
  }

  const letterSpacing = asNumber(props.letterSpacing);
  if (letterSpacing !== undefined) {
    vars['--es-ls'] = `${letterSpacing}px`;
    classes.push('es-so-ls');
  }

  const filters: string[] = [];
  const blur = asNumber(props.blur);
  if (props.shadowEnabled) filters.push('drop-shadow(0 14px 34px rgba(0, 0, 0, 0.45))');
  if (blur) filters.push(`blur(${Math.max(0, blur)}px)`);
  if (filters.length) {
    vars['--es-filter'] = filters.join(' ');
    classes.push('es-so-effects');
  }

  // explicit box size: stretch child SVGs like legacy renderCanvas did
  if (c.wpx) classes.push('es-has-w');
  if (c.hpx) classes.push('es-has-h');

  return { classes, vars, style };
}
