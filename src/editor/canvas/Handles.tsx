import { useRef } from 'react';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import type { SceneComponent } from '../../domain/component.js';
import { boxOf } from './snapping.js';
import { toCanvasCoords } from './coords.js';
import { edgeRoute, portsOf } from '../../renderer/geometry.js';

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSORS: Record<ResizeHandleId, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/** Position of each handle as a percentage of the selection frame. */
const HANDLE_POS: Record<ResizeHandleId, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  e: { left: '100%', top: '50%' },
  se: { left: '100%', top: '100%' },
  s: { left: '50%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
};

/** Handle direction: -1 = top/left edge, 1 = bottom/right edge, 0 = centre. */
const HANDLE_DIR: Record<ResizeHandleId, { ox: -1 | 0 | 1; oy: -1 | 0 | 1 }> = {
  nw: { ox: -1, oy: -1 },
  n: { ox: 0, oy: -1 },
  ne: { ox: 1, oy: -1 },
  e: { ox: 1, oy: 0 },
  se: { ox: 1, oy: 1 },
  s: { ox: 0, oy: 1 },
  sw: { ox: -1, oy: 1 },
  w: { ox: -1, oy: 0 },
};

const MIN_SCALE = 0.05;
const MAX_SCALE = 20;
const MIN_BOX = 20;

/** Corner handles scale uniformly; edge handles resize one axis. */
const CORNER_HANDLES: ResizeHandleId[] = ['nw', 'ne', 'se', 'sw'];
const EDGE_HANDLES: ResizeHandleId[] = ['n', 'e', 's', 'w'];

function isCorner(hd: ResizeHandleId): boolean {
  return CORNER_HANDLES.includes(hd);
}

/** Border strips make the whole frame edge draggable (width/height resize). */
const EDGE_STRIPS: { hd: ResizeHandleId; style: React.CSSProperties }[] = [
  { hd: 'n', style: { left: 0, right: 0, top: 0, height: 10, transform: 'translateY(-50%)' } },
  { hd: 's', style: { left: 0, right: 0, bottom: 0, height: 10, transform: 'translateY(50%)' } },
  { hd: 'w', style: { top: 0, bottom: 0, left: 0, width: 10, transform: 'translateX(-50%)' } },
  { hd: 'e', style: { top: 0, bottom: 0, right: 0, width: 10, transform: 'translateX(50%)' } },
];

export type PortId = 'top' | 'right' | 'bottom' | 'left';

/**
 * Connection ports — four 🔗 dots on the selected component's measured box.
 * Dragging one starts a wire: CanvasWorkspace owns the preview + target
 * resolution and commits the edge on release.
 */
export function PortHandles({
  comp,
  fit,
  onStartConnect,
}: {
  comp: SceneComponent;
  fit: number;
  onStartConnect: (e: React.PointerEvent, port: PortId) => void;
}) {
  const box = boxOf(comp);
  const k = 1 / Math.max(fit, 1e-6);
  const pos: Record<PortId, { left: number; top: number }> = {
    top: { left: box.cx, top: box.t },
    right: { left: box.r, top: box.cy },
    bottom: { left: box.cx, top: box.b },
    left: { left: box.l, top: box.cy },
  };
  return (
    <>
      {(Object.keys(pos) as PortId[]).map((pid) => (
        <div
          key={pid}
          data-port={pid}
          data-export-hide
          title={`drag from ${pid} to another component to link`}
          onPointerDown={(e) => onStartConnect(e, pid)}
          style={{
            position: 'absolute',
            left: pos[pid].left,
            top: pos[pid].top,
            width: 20,
            height: 20,
            display: 'grid',
            placeItems: 'center',
            cursor: 'crosshair',
            transform: `translate(-50%,-50%) scale(${k})`,
            pointerEvents: 'auto',
            zIndex: 1001,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#0a1120',
              border: '2px solid #2f7bff',
              boxShadow: '0 1px 4px rgba(0,0,0,.5)',
            }}
          />
        </div>
      ))}
    </>
  );
}

export interface ConnectDrag {
  from: string;
  fromPort: PortId;
  x: number;
  y: number;
  targetId: string | null;
  targetPort: PortId | null;
}

/** Resolve which component (and nearest port) a canvas point lands on. */
export function targetAt(
  comps: SceneComponent[],
  x: number,
  y: number,
  excludeId: string,
): { comp: SceneComponent; port: PortId } | null {
  const hit = comps
    .filter((c) => c.id !== excludeId && c.type !== 'state' && !c.parked)
    .reverse()
    .find((c) => {
      const b = boxOf(c);
      return x >= b.l && x <= b.r && y >= b.t && y <= b.b;
    });
  if (!hit) return null;
  let best: PortId = 'top';
  let bd = Infinity;
  for (const p of portsOf(hit)) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = p.id as PortId;
    }
  }
  return { comp: hit, port: best };
}

export function connectPreviewPath(
  from: SceneComponent,
  fromPort: PortId,
  x: number,
  y: number,
  target: SceneComponent | null,
  targetPort: PortId | null,
): { d: string; sx: number; sy: number; ex: number; ey: number } {
  const p0 = portsOf(from).find((p) => p.id === fromPort) ?? portsOf(from)[0];
  let ex = x;
  let ey = y;
  let enx = 0;
  let eny = 0;
  if (target && targetPort) {
    const tp = portsOf(target).find((p) => p.id === targetPort);
    if (tp) {
      ex = tp.x;
      ey = tp.y;
      enx = tp.nx;
      eny = tp.ny;
    }
  }
  const r = edgeRoute(
    { x: p0.x, y: p0.y, nx: p0.nx, ny: p0.ny },
    { x: ex, y: ey, nx: enx, ny: eny },
    'smooth',
  );
  return { d: r.d, sx: p0.x, sy: p0.y, ex, ey };
}

/**
 * Single-selection transform handles: 8 resize + 1 rotate.
 *
 * Resize scales the whole component uniformly (so text, padding and inner
 * graphics grow together) while the opposite corner/edge stays pinned. The
 * drag is measured against the component's own axes, so it stays exact when
 * the component is already scaled or rotated. One gesture = one undo step.
 */
export function TransformHandles({
  comp,
  fit,
  sceneRef,
  noteGestureEnd,
}: {
  comp: SceneComponent;
  fit: number;
  sceneRef: React.RefObject<HTMLDivElement | null>;
  noteGestureEnd: () => void;
}) {
  const session = useRef<{
    kind: 'resize' | 'rotate';
    corner: boolean;
    anchor: { x: number; y: number };
    center: { x: number; y: number };
    /** local axes unit vectors (scene space) */
    ux: number;
    uy: number;
    vx: number;
    vy: number;
    dir: { ox: -1 | 0 | 1; oy: -1 | 0 | 1 };
    startScale: number;
    startW: number;
    startH: number;
    /** visual box at gesture start (includes scale) */
    vw0: number;
    vh0: number;
    /** which channel each axis writes (house numeric props win over wpx/hpx) */
    chanW: 'prop' | 'size' | 'box';
    chanH: 'prop' | 'size' | 'box';
    /** pointer position at gesture start, in local axis units from anchor */
    du0: number;
    dv0: number;
  } | null>(null);

  const box = boxOf(comp);
  const rot = comp.rot ?? 0;
  const k = 1 / Math.max(fit, 1e-6);

  const begin = (
    e: React.PointerEvent,
    kind: 'resize' | 'rotate',
    handle?: ResizeHandleId,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    commands.beginTransaction();
    const c0 =
      editorStore.getState().project.comps.find((c) => c.id === comp.id) ?? comp;
    const fresh = boxOf(c0);
    const s0 = c0.scale || 1;
    const vw0 = fresh.r - fresh.l;
    const vh0 = fresh.b - fresh.t;
    const w0 = vw0 / s0;
    const h0 = vh0 / s0;
    const center = { x: fresh.cx, y: fresh.cy };
    const rad = ((c0.rot ?? 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hd = handle ?? 'se';
    const dir = HANDLE_DIR[hd];
    const corner = isCorner(hd);
    // local axes in scene space (u = width axis, v = height axis)
    const ux = cos;
    const uy = sin;
    const vx = -sin;
    const vy = cos;
    // dragged corner offset from the centre (local, visual units)
    const hx = (dir.ox * vw0) / 2;
    const hy = (dir.oy * vh0) / 2;
    // anchor = opposite corner/edge (scene coords), stays pinned all gesture
    const anchor = {
      x: center.x + (-hx * cos - -hy * sin),
      y: center.y + (-hx * sin + -hy * cos),
    };
    const props = (c0.props ?? {}) as Record<string, unknown>;
    const hasW = typeof props.w === 'number';
    const hasH = typeof props.h === 'number';
    const hasSize = !hasW && !hasH && typeof props.size === 'number';
    const chanW: 'prop' | 'size' | 'box' = hasW ? 'prop' : hasSize ? 'size' : 'box';
    const chanH: 'prop' | 'size' | 'box' = hasH ? 'prop' : hasSize ? 'size' : 'box';
    // pointer position at gesture start, in local axis units from the anchor
    const sceneEl = sceneRef.current;
    const startPt = sceneEl
      ? toCanvasCoords(
          e.clientX,
          e.clientY,
          sceneEl.getBoundingClientRect(),
          editorStore.getState().project.scene.w,
          editorStore.getState().project.scene.h,
        )
      : { x: anchor.x, y: anchor.y };
    const sdx0 = startPt.x - anchor.x;
    const sdy0 = startPt.y - anchor.y;
    const du0 = sdx0 * ux + sdy0 * uy;
    const dv0 = sdx0 * vx + sdy0 * vy;
    // promote an auto-sized component onto its measured box so the first
    // drag continues from the visible size instead of jumping
    if (!corner) {
      if (hd === 'e' || hd === 'w') {
        if (chanW === 'box' && c0.wpx == null) {
          commands.patchComps([{ id: comp.id, patch: { wpx: Math.round(w0) } }]);
        }
      } else {
        if (chanH === 'box' && c0.hpx == null) {
          commands.patchComps([{ id: comp.id, patch: { hpx: Math.round(h0) } }]);
        }
      }
    }
    session.current = {
      kind,
      corner,
      anchor,
      center,
      ux,
      uy,
      vx,
      vy,
      dir,
      startScale: s0,
      startW: w0,
      startH: h0,
      vw0,
      vh0,
      chanW,
      chanH,
      du0,
      dv0,
    };

    const writeAxis = (
      axis: 'w' | 'h',
      value: number,
      chan: 'prop' | 'size' | 'box',
    ) => {
      const key = chan === 'prop' ? (axis === 'w' ? 'w' : 'h') : chan === 'size' ? 'size' : axis === 'w' ? 'wpx' : 'hpx';
      if (chan === 'box') {
        commands.patchComps([{ id: comp.id, patch: { [key]: value } }]);
      } else {
        commands.updateComponentProps(comp.id, { [key]: value });
      }
    };

    const move = (ev: PointerEvent) => {
      const el = sceneRef.current;
      const ses = session.current;
      if (!el || !ses) return;
      const rect = el.getBoundingClientRect();
      const w = editorStore.getState().project.scene.w;
      const h = editorStore.getState().project.scene.h;
      if (ses.kind === 'rotate') {
        const p = toCanvasCoords(ev.clientX, ev.clientY, rect, w, h);
        const ang =
          (Math.atan2(p.y - ses.center.y, p.x - ses.center.x) * 180) / Math.PI + 90;
        commands.patchComps([{ id: comp.id, patch: { rot: Math.round(ang) } }]);
        return;
      }
      const p = toCanvasCoords(ev.clientX, ev.clientY, rect, w, h);
      const sdx = p.x - ses.anchor.x;
      const sdy = p.y - ses.anchor.y;
      // project the anchor→pointer vector onto local axes (visual units)
      const du = sdx * ses.ux + sdy * ses.uy;
      const dv = sdx * ses.vx + sdy * ses.vy;

      if (ses.corner) {
        // uniform scale about the opposite corner
        const d0u = ses.dir.ox * ses.vw0;
        const d0v = ses.dir.oy * ses.vh0;
        const denom = d0u * d0u + d0v * d0v;
        let ratio = denom ? (du * d0u + dv * d0v) / denom : 1;
        if (!Number.isFinite(ratio) || ratio <= 0) ratio = 0.001;
        const scale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, ses.startScale * ratio),
        );
        const kk = scale / ses.startScale;
        const cx = ses.anchor.x + (ses.center.x - ses.anchor.x) * kk;
        const cy = ses.anchor.y + (ses.center.y - ses.anchor.y) * kk;
        commands.patchComps([
          {
            id: comp.id,
            patch: {
              scale: Math.round(scale * 1000) / 1000,
              x: Math.round(cx - ses.startW / 2),
              y: Math.round(cy - ses.startH / 2),
            },
          },
        ]);
        return;
      }

      // axis resize: one dimension changes, the opposite edge stays pinned.
      // delta is measured from the grab point so the edge tracks the cursor.
      const sc = ses.startScale;
      let nw = ses.startW;
      let nh = ses.startH;
      // centre shift (visual units) along the axis being resized
      let ox = 0;
      let oy = 0;
      if (ses.dir.ox !== 0) {
        const dw = ((du - ses.du0) * ses.dir.ox) / sc;
        nw = Math.max(MIN_BOX, Math.round(ses.startW + dw));
        const off = ((nw - ses.startW) / 2) * ses.dir.ox;
        ox = off * ses.ux;
        oy = off * ses.uy;
        writeAxis('w', nw, ses.chanW);
      } else {
        const dh = ((dv - ses.dv0) * ses.dir.oy) / sc;
        nh = Math.max(MIN_BOX, Math.round(ses.startH + dh));
        const off = ((nh - ses.startH) / 2) * ses.dir.oy;
        ox = off * ses.vx;
        oy = off * ses.vy;
        writeAxis('h', nh, ses.chanH);
      }
      const cx = ses.center.x + ox * sc;
      const cy = ses.center.y + oy * sc;
      commands.patchComps([
        {
          id: comp.id,
          patch: {
            x: Math.round(cx - nw / 2),
            y: Math.round(cy - nh / 2),
          },
        },
      ]);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      session.current = null;
      commands.commitTransaction();
      noteGestureEnd();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const dot = (hd: ResizeHandleId) => {
    const pos = HANDLE_POS[hd];
    const corner = isCorner(hd);
    return (
      <div
        key={hd}
        data-handle={hd}
        data-export-hide
        onPointerDown={(e) => begin(e, 'resize', hd)}
        title={corner ? 'drag to scale' : hd === 'e' || hd === 'w' ? 'drag to set width' : 'drag to set height'}
        style={{
          position: 'absolute',
          left: pos.left,
          top: pos.top,
          width: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          cursor: HANDLE_CURSORS[hd],
          transform: `translate(-50%,-50%) scale(${k})`,
          pointerEvents: 'auto',
        }}
      >
        <span
          style={{
            width: corner ? 10 : 8,
            height: corner ? 10 : 8,
            borderRadius: corner ? 3 : 2,
            background: corner ? '#2f7bff' : '#f59e0b',
            border: '2px solid #fff',
            boxShadow: '0 1px 4px rgba(0,0,0,.5)',
          }}
        />
      </div>
    );
  };

  /** Full-edge grab strips: hover anywhere on the border to resize that axis. */
  const strip = (hd: ResizeHandleId, style: React.CSSProperties) => (
    <div
      key={`strip-${hd}`}
      data-handle-strip={hd}
      data-export-hide
      onPointerDown={(e) => begin(e, 'resize', hd)}
      title={hd === 'e' || hd === 'w' ? 'drag to set width' : 'drag to set height'}
      style={{
        position: 'absolute',
        cursor: HANDLE_CURSORS[hd],
        pointerEvents: 'auto',
        ...style,
      }}
    />
  );

  // Canvas-space frame: the scene already applies the fit scale, so the frame
  // uses the raw visual box (w·scale). Only the dots counter-scale.
  const frameW = box.r - box.l;
  const frameH = box.b - box.t;

  return (
    <div
      data-selection-frame
      data-export-hide
      style={{
        position: 'absolute',
        left: box.cx,
        top: box.cy,
        width: frameW,
        height: frameH,
        transform: `translate(-50%,-50%) rotate(${rot}deg)`,
        transformOrigin: 'center',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `${k}px solid #2f7bff`,
          pointerEvents: 'none',
        }}
      />
      {EDGE_STRIPS.map(({ hd, style }) => strip(hd, style))}
      {(Object.keys(HANDLE_POS) as ResizeHandleId[]).map(dot)}
      <div
        data-handle="rotate"
        data-export-hide
        onPointerDown={(e) => begin(e, 'rotate')}
        title="rotate"
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: 24,
          height: 24,
          marginTop: -30 * k,
          display: 'grid',
          placeItems: 'center',
          cursor: 'grab',
          transform: `translate(-50%,-50%) scale(${k})`,
          pointerEvents: 'auto',
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#2f7bff',
            border: '2px solid #fff',
            boxShadow: '0 1px 4px rgba(0,0,0,.5)',
          }}
        />
      </div>
    </div>
  );
}
