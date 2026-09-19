import * as htmlToImage from 'html-to-image';
import type { SceneComponent } from '../domain/component.js';
import { compLabel } from '../editor/labels.js';
import {
  cloakExportChrome,
  rasterizePNG,
  rasterizeSVG,
  type RasterLib,
} from './raster.js';

export interface StillDeps {
  lib?: RasterLib;
  download?: (href: string, name: string) => void;
}

/** Anchor download with blob-URL revocation (legacy expDownload parity). */
export function downloadUrl(href: string, name: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  if (href.startsWith('blob:')) {
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  }
}

export function sceneFilename(name: string, ext: string, projectName?: string): string {
  const safe =
    (projectName || name || 'clip').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') ||
    'clip';
  const date = new Date().toISOString().slice(0, 10);
  return `explainer-${safe}-${date}.${ext}`;
}

/** `01-svc-payment-svc.png` (legacy compPngName parity, rich tags stripped). */
export function compPngName(c: SceneComponent, index: number): string {
  const label =
    (typeof compLabel === 'function'
      ? compLabel(c, [], [])
      : String((c.props as Record<string, unknown>)?.['text'] ?? '')) || '';
  const slug = label
    .replace(/\[[^\]]*\]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${String(index + 1).padStart(2, '0')}-${c.type}${slug ? '-' + slug : ''}.png`;
}

/** Full-frame PNG still at 1×/2× (pixelRatio param). */
export async function exportFramePNG(
  scene: HTMLElement,
  opts: StillDeps & { pixelRatio?: number; name?: string; projectName?: string } = {},
): Promise<string> {
  const dataUrl = await rasterizePNG(scene, opts.pixelRatio ?? 1, opts.lib);
  (opts.download ?? downloadUrl)(dataUrl, sceneFilename(opts.name ?? 'frame', 'png', opts.projectName));
  return dataUrl;
}

/** SVG still of the current canvas state. */
export async function exportFrameSVG(
  scene: HTMLElement,
  opts: StillDeps & { name?: string; projectName?: string } = {},
): Promise<string> {
  const dataUrl = await rasterizeSVG(scene, opts.lib);
  (opts.download ?? downloadUrl)(dataUrl, sceneFilename(opts.name ?? 'scene', 'svg', opts.projectName));
  return dataUrl;
}

/**
 * Per-component PNG — isolated raster on a padded transparent stage
 * (legacy mountCompClone parity: 64px headroom so glows survive).
 * Selection wins: pass the comps to export (already resolved by the caller).
 */
export async function exportCompPNG(
  scene: HTMLElement,
  compEl: HTMLElement,
  comp: SceneComponent,
  index: number,
  opts: StillDeps & { lib?: RasterLib } = {},
): Promise<string> {
  const lib = (opts.lib ?? htmlToImage) as unknown as RasterLib;
  const restore = cloakExportChrome(scene);
  const stage = document.createElement('div');
  stage.style.cssText =
    'position:fixed;left:-10000px;top:0;padding:64px;background:transparent;';
  const clone = compEl.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  stage.appendChild(clone);
  document.body.appendChild(stage);
  try {
    const dataUrl = await lib.toPng(stage, {
      pixelRatio: 2,
      backgroundColor: 'rgba(0,0,0,0)',
    });
    (opts.download ?? downloadUrl)(dataUrl, compPngName(comp, index));
    return dataUrl;
  } finally {
    stage.remove();
    restore();
  }
}
