import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';
import { measuredSize } from './measured.js';

/**
 * Canvas geometry — pure extraction of index.html visualBox / rotPt /
 * portsOf / portById / nearestPort / edgeRoute / edgeGeom.
 *
 * Functions take explicit comp records (and a lookup fn for edges) instead
 * of reading the `comps` global. _rw/_rh are live-measured sizes; wpx/hpx
 * explicit sizes; 220×120 fallback matches legacy.
 */

export interface VisualBox {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  rot: number;
}

export function visualBox(c: Pick<
  SceneComponent,
  'x' | 'y' | 'scale' | 'rot' | 'wpx' | 'hpx'
> & { id?: string; _rw?: number; _rh?: number }): VisualBox {
  // measured > runtime cache > explicit box > legacy 220×120 fallback
  const m = measuredSize(c.id);
  const w = m?.w || c._rw || c.wpx || 220;
  const h = m?.h || c._rh || c.hpx || 120;
  const s = c.scale || 1;
  return {
    cx: (c.x ?? 0) + w / 2,
    cy: (c.y ?? 0) + h / 2,
    hw: (w * s) / 2,
    hh: (h * s) / 2,
    rot: ((c.rot || 0) * Math.PI) / 180,
  };
}

export function rotPt(
  dx: number,
  dy: number,
  rot: number,
): { x: number; y: number } {
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  return { x: dx * cs - dy * sn, y: dx * sn + dy * cs };
}

export interface Port {
  id: string;
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export function portsOf(
  c: Parameters<typeof visualBox>[0],
): Port[] {
  const b = visualBox(c);
  return (
    [
      ['top', 0, -1],
      ['right', 1, 0],
      ['bottom', 0, 1],
      ['left', -1, 0],
    ] as const
  ).map(([id, ox, oy]) => {
    const o = rotPt(ox * b.hw, oy * b.hh, b.rot);
    const n = rotPt(ox, oy, b.rot);
    return { id, x: b.cx + o.x, y: b.cy + o.y, nx: n.x, ny: n.y };
  });
}

export function portById(
  c: Parameters<typeof visualBox>[0],
  pid: string | undefined,
): Port | null {
  if (!pid || pid === 'auto') return null;
  return portsOf(c).find((p) => p.id === pid) || null;
}

export function nearestPort(
  c: Parameters<typeof visualBox>[0],
  tx: number,
  ty: number,
): Port {
  let best: Port | null = null;
  let bd = Infinity;
  portsOf(c).forEach((p) => {
    const d = (p.x - tx) * (p.x - tx) + (p.y - ty) * (p.y - ty);
    if (d < bd) {
      bd = d;
      best = p;
    }
  });
  return best!;
}

export interface RoutedPath {
  d: string;
  joints: [number, number][] | null;
  stx: number;
  sty: number;
  etx: number;
  ety: number;
}

/** Route S→E. Points carry port normals. Returns path + tangents + joints. */
export function edgeRoute(
  S: { x: number; y: number; nx: number; ny: number },
  E: { x: number; y: number; nx: number; ny: number },
  routing: string | undefined,
): RoutedPath {
  const L = (v: number): number => +v.toFixed(1);
  let d = '';
  let joints: [number, number][] | null = null;
  let stx = 0;
  let sty = 0;
  let etx = 0;
  let ety = 0;
  if (routing === 'straight') {
    d = `M ${L(S.x)} ${L(S.y)} L ${L(E.x)} ${L(E.y)}`;
    stx = E.x - S.x;
    sty = E.y - S.y;
    etx = stx;
    ety = sty;
  } else if (routing === 'step') {
    if (Math.abs(S.nx) > 0.5) {
      const mx = (S.x + E.x) / 2;
      d = `M ${L(S.x)} ${L(S.y)} H ${L(mx)} V ${L(E.y)} H ${L(E.x)}`;
      joints = [
        [mx, S.y],
        [mx, E.y],
      ];
      stx = mx - S.x;
      sty = 0;
      etx = E.x - mx;
      ety = 0;
    } else {
      const my = (S.y + E.y) / 2;
      d = `M ${L(S.x)} ${L(S.y)} V ${L(my)} H ${L(E.x)} V ${L(E.y)}`;
      joints = [
        [S.x, my],
        [E.x, my],
      ];
      stx = 0;
      sty = my - S.y;
      etx = 0;
      ety = E.y - my;
    }
  } else if (routing === 'curved') {
    const dx = E.x - S.x;
    const dy = E.y - S.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = 70;
    const cx = (S.x + E.x) / 2 + (-dy / len) * bow;
    const cy = (S.y + E.y) / 2 + (dx / len) * bow;
    d = `M ${L(S.x)} ${L(S.y)} Q ${L(cx)} ${L(cy)} ${L(E.x)} ${L(E.y)}`;
    stx = cx - S.x;
    sty = cy - S.y;
    etx = E.x - cx;
    ety = E.y - cy;
  } else {
    // smooth: cubic along port normals
    const dist = Math.hypot(E.x - S.x, E.y - S.y);
    const k = Math.max(40, Math.min(280, dist * 0.4));
    const c1x = S.x + S.nx * k;
    const c1y = S.y + S.ny * k;
    const c2x = E.x + E.nx * k;
    const c2y = E.y + E.ny * k;
    d = `M ${L(S.x)} ${L(S.y)} C ${L(c1x)} ${L(c1y)}, ${L(c2x)} ${L(c2y)}, ${L(E.x)} ${L(E.y)}`;
    stx = c1x - S.x;
    sty = c1y - S.y;
    etx = E.x - c2x;
    ety = E.y - c2y;
  }
  const n1 = Math.hypot(stx, sty) || 1;
  const n2 = Math.hypot(etx, ety) || 1;
  return { d, joints, stx: stx / n1, sty: sty / n1, etx: etx / n2, ety: ety / n2 };
}

export interface EdgeGeom extends RoutedPath {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  headEnd: string;
  headStart: string;
}

export type CompLookup = (id: string) => SceneComponent | undefined;

/** Absolute-scene-coords wire geometry (overlay svg spans the canvas). */
export function edgeGeom(
  lookup: CompLookup,
  e: Edge,
  rev = false,
): EdgeGeom | null {
  const A = lookup(e.from);
  const B = e.to ? lookup(e.to) : undefined;
  if (!A || !B || A.id === B.id || A.parked || B.parked) return null;
  const ba = visualBox(A as Parameters<typeof visualBox>[0]);
  const bb = visualBox(B as Parameters<typeof visualBox>[0]);
  const pa =
    portById(A as Parameters<typeof visualBox>[0], e.fromPort) ||
    nearestPort(A as Parameters<typeof visualBox>[0], bb.cx, bb.cy);
  const pb =
    portById(B as Parameters<typeof visualBox>[0], e.toPort) ||
    nearestPort(B as Parameters<typeof visualBox>[0], pa.x, pa.y);
  let S = { x: pa.x, y: pa.y, nx: pa.nx, ny: pa.ny };
  let E = { x: pb.x, y: pb.y, nx: pb.nx, ny: pb.ny };
  if (rev) {
    const t = S;
    S = E;
    E = t;
  }
  if (Math.hypot(E.x - S.x, E.y - S.y) < 10) return null;
  const r = edgeRoute(S, E, e.routing || 'smooth');
  const L = (v: number): number => +v.toFixed(1);
  const head = (ex: number, ey: number, hx: number, hy: number): string =>
    `${L(ex)},${L(ey)} ${L(ex - hx * 16 - hy * 7)},${L(ey - hy * 16 + hx * 7)} ${L(ex - hx * 16 + hy * 7)},${L(ey - hy * 16 - hx * 7)}`;
  return {
    ...r,
    sx: S.x,
    sy: S.y,
    ex: E.x,
    ey: E.y,
    headEnd: head(E.x, E.y, r.etx, r.ety),
    headStart: head(S.x, S.y, -r.stx, -r.sty),
  };
}

export const EDGE_PRESETS: Record<string, { label: string; color: string | null }> = {
  none: { label: '', color: null },
  https: { label: 'HTTPS', color: 'var(--cyan-dim)' },
  http: { label: 'HTTP', color: 'var(--cyan-dim)' },
  grpc: { label: 'gRPC', color: 'var(--text-primary)' },
  sql: { label: 'SQL', color: 'var(--amber)' },
  event: { label: 'Event', color: 'var(--cyan-dim)' },
  success: { label: 'Success', color: 'var(--phos-green)' },
  error: { label: 'Error', color: 'var(--alert-red)' },
};

/**
 * Wire color. Legacy reads live theme hexes via getComputedStyle;
 * here the theme lookup is injected (default: identity fallback) so the
 * function stays pure and testable. Snapshot/export paths pass their own.
 */
export function edgeColor(
  e: Pick<Edge, 'branch' | 'preset'> & { accent?: unknown },
  resolveTheme: (role: string, fallback: string) => string = (_r, fb) => fb,
): string {
  if (e.branch === 'success') return resolveTheme('--phos-green', '#39FF7A');
  if (e.branch === 'error') return resolveTheme('--alert-red', '#FF5555');
  const res = (v: unknown): string => {
    const m = String(v || '').match(/^(?:var\()?(--[\w-]+)\)?$/);
    return m ? resolveTheme(m[1], String(v)) : String(v || '');
  };
  const p = EDGE_PRESETS[e.preset || 'none'];
  if (p && p.color) return res(p.color);
  if (e.accent) return res(e.accent);
  return resolveTheme('--phos-green', '#39FF7A');
}

export function edgeWireText(e: Pick<Edge, 'caption' | 'preset'>): string {
  return (e.caption || '').trim() || EDGE_PRESETS[e.preset || 'none']?.label || '';
}
