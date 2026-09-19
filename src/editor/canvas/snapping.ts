import { visualBox } from '../../renderer/geometry.js';
import type { SceneComponent } from '../../domain/component.js';

/**
 * Snapping — pure port of the builder's snap behavior (edges/centers of
 * comps + canvas bounds, Alt bypasses at the call site).
 * Works on the UNION bbox of the moving set vs static boxes + canvas.
 */

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
  cx: number;
  cy: number;
}

export function boxOf(c: SceneComponent): Box {
  const b = visualBox(c as never);
  return {
    l: b.cx - b.hw,
    t: b.cy - b.hh,
    r: b.cx + b.hw,
    b: b.cy + b.hh,
    cx: b.cx,
    cy: b.cy,
  };
}

export function unionBox(boxes: Box[]): Box {
  return {
    l: Math.min(...boxes.map((b) => b.l)),
    t: Math.min(...boxes.map((b) => b.t)),
    r: Math.max(...boxes.map((b) => b.r)),
    b: Math.max(...boxes.map((b) => b.b)),
    cx: 0,
    cy: 0,
  };
}

export interface SnapResult {
  dx: number;
  dy: number;
  /** canvas-coord guide lines to paint */
  guides: { v: number[]; h: number[] };
}

function snapAxis(
  movingEdges: [number, number, number],
  statics: number[],
  delta: number,
  threshold: number,
): { delta: number; guides: number[] } {
  let best = 0;
  let guide = -1;
  for (const target of statics) {
    for (const edge of movingEdges) {
      const d = target - (edge + delta);
      if (Math.abs(d) <= threshold && Math.abs(d) > 1e-9) {
        if (guide < 0 || Math.abs(d) < Math.abs(best)) {
          best = d;
          guide = target;
        }
      }
    }
  }
  return { delta: delta + best, guides: guide >= 0 ? [guide] : [] };
}

/**
 * Snap a desired move. moving = union bbox of the dragged set (unmoved);
 * statics = boxes of non-moving comps; canvas bounds add 0/center/max.
 */
export function snapMove(
  moving: Box,
  statics: Box[],
  canvas: { w: number; h: number },
  dx: number,
  dy: number,
  threshold = 8,
): SnapResult {
  const xs = statics.flatMap((b) => [b.l, b.cx, b.r]);
  const ys = statics.flatMap((b) => [b.t, b.cy, b.b]);
  const cx = (moving.l + moving.r) / 2;
  const cy = (moving.t + moving.b) / 2;
  const sx = snapAxis([moving.l, cx, moving.r], [...xs, 0, canvas.w / 2, canvas.w], dx, threshold);
  const sy = snapAxis([moving.t, cy, moving.b], [...ys, 0, canvas.h / 2, canvas.h], dy, threshold);
  return { dx: sx.delta, dy: sy.delta, guides: { v: sx.guides, h: sy.guides } };
}
