import { REGISTRY } from '../catalog/registry.js';
import { isStepped, stepTotalFor } from '../catalog/lines.js';
import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';
import { effEdge, effProps, isState } from '../renderer/stateChanges.js';
import { applyLineReveal } from '../renderer/lines.js';
import { edgeColor, edgeGeom } from '../renderer/geometry.js';
import { resolveSceneAtStep } from '../renderer/visibility.js';
import { canvasCssBundle } from './css.js';
import { escHtml } from '../renderer/richText.js';

export interface FrameSpec {
  comps: SceneComponent[];
  edges: Edge[];
  scene: { w: number; h: number };
  theme: string;
  /** sequence positions revealed (take) — null = show all (edit) */
  shown: number | null;
  /** per-line counters for stepped comps (absent = fully shown) */
  revealed?: Record<string, number>;
}

/**
 * Standalone snapshot document — the export truth for stills (PNG/SVG).
 * Settled state only (no entrance animations, no editor chrome): the same
 * resolved frame the editor shows, with state patches + line reveals
 * applied, edges drawn when both endpoints are visible.
 */
export function buildFrameHTML(spec: FrameSpec): string {
  const { comps, edges, scene, theme, shown, revealed = {} } = spec;
  const frame =
    shown === null ? null : resolveSceneAtStep(comps, edges, shown);
  const visible = frame ? new Set(frame.visibleIds) : null;
  const edgeIds = frame
    ? new Set(frame.edgeIds)
    : new Set(
        edges
          .filter(
            (e) =>
              comps.some((c) => c.id === e.from) &&
              e.to &&
              comps.some((c) => c.id === e.to),
          )
          .map((e) => e.id),
      );
  const cutoff = shown ?? 0;
  const lookup = (id: string) => comps.find((c) => c.id === id);

  const compHTML = comps
    .map((c) => {
      if (visible && !visible.has(c.id)) return '';
      if (isState(c)) return '';
      const def = REGISTRY[c.type];
      if (!def) return '';
      const P = effProps(comps, c, cutoff) as Record<string, unknown>;
      let html = def.markup(P as never);
      if (shown !== null && isStepped(c)) {
        html = applyLineReveal(html, revealed[c.id] ?? stepTotalFor(c));
      }
      const style = [
        `left:${c.x ?? 0}px`,
        `top:${c.y ?? 0}px`,
        `z-index:${c.z ?? 10}`,
        `transform:scale(${c.scale ?? 1}) rotate(${c.rot ?? 0}deg)`,
        `opacity:${c.opacity ?? 1}`,
        c.wpx ? `width:${c.wpx}px` : '',
        c.hpx ? `height:${c.hpx}px` : '',
        `--fscale:${c.fscale ?? 1}`,
        `--ks:${c.scale ?? 1}`,
        `--kr:${c.rot ?? 0}deg`,
      ]
        .filter(Boolean)
        .join(';');
      return `<div class="comp" data-id="${escHtml(c.id)}" style="${style}">${html}</div>`;
    })
    .join('');

  const edgeSVG = edges
    .map((e) => {
      if (!edgeIds.has(e.id)) return '';
      const live = effEdge(comps, e, cutoff);
      const G = edgeGeom(lookup, live);
      if (!G) return '';
      const col = edgeColor(live);
      const wgt = Math.max(1, Math.min(5, +(live.weight ?? 2)));
      return `<g data-edge="${escHtml(e.id)}"><path d="${G.d}" fill="none" stroke="${col}" stroke-width="${wgt}"/><polygon points="${G.headEnd}" fill="${col}"/></g>`;
    })
    .join('');

  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>${canvasCssBundle(theme)}</style></head><body>` +
    `<div class="scene" id="scene" data-theme="${escHtml(theme)}" ` +
    `style="width:${scene.w}px;height:${scene.h}px;position:relative;overflow:hidden">` +
    `${compHTML}` +
    `<svg width="${scene.w}" height="${scene.h}" viewBox="0 0 ${scene.w} ${scene.h}" ` +
    `style="position:absolute;inset:0;pointer-events:none">${edgeSVG}</svg>` +
    `</div></body></html>`
  );
}

/** Isolated single-component still (padded transparent stage, legacy parity). */
export function buildCompHTML(
  comp: SceneComponent,
  comps: SceneComponent[],
  theme: string,
  pad = 64,
): string {
  const def = REGISTRY[comp.type];
  const P = (comp.props ?? {}) as Record<string, unknown>;
  const inner = def ? def.markup(P as never) : '';
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>${canvasCssBundle(theme)}</style></head>` +
    `<body style="margin:0;background:transparent"><div id="scene" data-theme="${escHtml(theme)}" ` +
    `style="position:fixed;left:0;top:0;background:transparent">` +
    `<div style="background:transparent;padding:${pad}px">` +
    `<div class="comp" style="position:relative;transform:scale(${comp.scale ?? 1}) rotate(${comp.rot ?? 0}deg);opacity:${comp.opacity ?? 1}">${inner}</div>` +
    `</div></div></body></html>`
  );
}
