import { describe, expect, it } from 'vitest';
import { toCanvasCoords } from './coords.js';
import { boxOf, snapMove, unionBox } from './snapping.js';
import { marqueeSelect, normRect } from './marquee.js';

describe('coords', () => {
  it('divides out the fit scale from the live rect', () => {
    // 1920-wide canvas fitted into 960px → 2 canvas px per screen px
    expect(
      toCanvasCoords(100, 60, { left: 20, top: 10, width: 960, height: 540 }, 1920, 1080),
    ).toEqual({ x: 160, y: 100 });
    // zero-size rect (unmounted) falls back to 1:1
    expect(
      toCanvasCoords(5, 5, { left: 0, top: 0, width: 0, height: 0 }, 1920, 1080),
    ).toEqual({ x: 5, y: 5 });
  });
});

describe('snapping', () => {
  it('snaps moving edges to static edges/centers with guides', () => {
    const moving = { l: 100, t: 100, r: 200, b: 200, cx: 150, cy: 150 };
    const statics = [{ l: 300, t: 300, r: 400, b: 400, cx: 350, cy: 350 }];
    // dx=95 → right edge 295, 5px off static left 300 → snaps +5
    const r = snapMove(moving, statics, { w: 1920, h: 1080 }, 95, 0);
    expect(r.dx).toBe(100);
    expect(r.guides.v).toEqual([300]);
    expect(r.dy).toBe(0);
    expect(r.guides.h).toEqual([]);
    // far away: no snap
    const r2 = snapMove(moving, statics, { w: 1920, h: 1080 }, 10, 10);
    expect(r2.dx).toBe(10);
    expect(r2.guides.v).toEqual([]);
  });

  it('snaps to canvas bounds and center', () => {
    const moving = { l: 100, t: 100, r: 200, b: 200, cx: 150, cy: 150 };
    const r = snapMove(moving, [], { w: 1920, h: 1080 }, -96, -96);
    expect(r.dx).toBe(-100); // left edge → x=0
    expect(r.guides.v).toEqual([0]);
    expect(r.dy).toBe(-100);
    expect(r.guides.h).toEqual([0]);
  });

  it('boxOf/unionBox follow visualBox center math', () => {
    const b = boxOf({ id: 'a', type: 'x', x: 90, y: 70, wpx: 220, hpx: 120, scale: 1, rot: 0 });
    expect(b).toEqual({ l: 90, t: 70, r: 310, b: 190, cx: 200, cy: 130 });
    const u = unionBox([b, { l: 0, t: 0, r: 10, b: 10, cx: 5, cy: 5 }]);
    expect([u.l, u.t, u.r, u.b]).toEqual([0, 0, 310, 190]);
  });
});

describe('marquee', () => {
  const comps = [
    { id: 'a', type: 'svc', x: 0, y: 0 },
    { id: 'b', type: 'svc', x: 500, y: 500 },
    { id: 's', type: 'state', x: 10, y: 10 },
  ];
  it('selects intersecting boxes, excluding state steps', () => {
    expect(marqueeSelect(comps, normRect(0, 0, 300, 300))).toEqual(['a']);
    expect(marqueeSelect(comps, normRect(300, 300, 0, 0))).toEqual(['a']);
    expect(marqueeSelect(comps, normRect(1000, 1000, 1200, 1200))).toEqual([]);
  });
});
