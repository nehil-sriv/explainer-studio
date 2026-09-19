import * as htmlToImage from 'html-to-image';

/**
 * Live-scene raster adapter (html-to-image, bundled offline-capable).
 * The shell keeps editor chrome outside #scene (selection toolbar,
 * marquee, guides live in #stage-scale); in-scene overlays (handles,
 * guides, marquee art, drop preview, inline editor) carry
 * data-export-hide and are cloaked for the raster, then restored —
 * legacy hideChrome parity.
 */

export interface RasterLib {
  toPng: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<string>;
  toSvg: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<string>;
  toCanvas: (node: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
}

export function cloakExportChrome(scene: HTMLElement): () => void {
  const nodes = [...scene.querySelectorAll<HTMLElement>('[data-export-hide]')];
  const prev = nodes.map((n) => n.style.display);
  nodes.forEach((n) => {
    n.style.display = 'none';
  });
  return () => {
    nodes.forEach((n, i) => {
      n.style.display = prev[i];
    });
  };
}

export function requireScene(): HTMLElement {
  const el = document.getElementById('scene');
  if (!el) throw new Error('scene is not mounted — open the editor canvas first');
  return el as HTMLElement;
}

export async function rasterizePNG(
  scene: HTMLElement,
  pixelRatio = 1,
  lib: RasterLib = htmlToImage as unknown as RasterLib,
): Promise<string> {
  const restore = cloakExportChrome(scene);
  try {
    return await lib.toPng(scene, { pixelRatio });
  } finally {
    restore();
  }
}

export async function rasterizeCanvas(
  scene: HTMLElement,
  pixelRatio = 1,
  lib: RasterLib = htmlToImage as unknown as RasterLib,
): Promise<HTMLCanvasElement> {
  const restore = cloakExportChrome(scene);
  try {
    return await lib.toCanvas(scene, { pixelRatio });
  } finally {
    restore();
  }
}

export async function rasterizeSVG(
  scene: HTMLElement,
  lib: RasterLib = htmlToImage as unknown as RasterLib,
): Promise<string> {
  const restore = cloakExportChrome(scene);
  try {
    return await lib.toSvg(scene, {});
  } finally {
    restore();
  }
}
