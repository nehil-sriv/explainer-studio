import type { SceneComponent } from '../../domain/component.js';
import { isState } from '../../renderer/stateChanges.js';
import { boxOf, type Box } from './snapping.js';

/** Normalized marquee rect (canvas coords, l<t/r<b ordering). */
export function normRect(x0: number, y0: number, x1: number, y1: number): Box {
  return {
    l: Math.min(x0, x1),
    t: Math.min(y0, y1),
    r: Math.max(x0, x1),
    b: Math.max(y0, y1),
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
  };
}

function overlaps(a: Box, b: Box): boolean {
  return a.l <= b.r && a.r >= b.l && a.t <= b.b && a.b >= b.t;
}

/** Ids intersecting the marquee (invisible steps — state/parked — excluded). */
export function marqueeSelect(comps: SceneComponent[], rect: Box): string[] {
  return comps
    .filter((c) => !isState(c) && !c.parked && overlaps(boxOf(c), rect))
    .map((c) => c.id);
}
