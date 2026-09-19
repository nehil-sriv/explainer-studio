/**
 * Canvas CSS bundle for standalone snapshot documents (Phase 10 stills).
 * Backed by src/export/canvasCss.generated.ts (see
 * migration/bundle-canvas-css.mjs) — raw bytes, no bundler magic, so
 * raster/PNG/SVG output carries the exact canvas type everywhere.
 */
import {
  CORE_CSS,
  FONTS_CSS,
  PHOSPHOR_CSS,
  THEME_CSS,
  TOKENS_CSS,
} from './canvasCss.generated.js';

export function themeCss(key: string): string {
  return THEME_CSS[key] ?? '';
}

export function canvasCssBundle(theme: string): string {
  return [TOKENS_CSS, FONTS_CSS, CORE_CSS, PHOSPHOR_CSS, themeCss(theme)].join('\n');
}
