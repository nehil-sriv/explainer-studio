import { useRef } from 'react';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import type { SceneComponent } from '../../domain/component.js';
import { boxOf } from './snapping.js';
import { toCanvasCoords } from './coords.js';

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

/**
 * Single-selection transform handles: 8 resize + 1 rotate.
 * Resize writes wpx/hpx (legacy E/S-handle parity); rotate writes rot.
 * All live updates run inside one transaction → one undo step.
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
    handle?: ResizeHandleId;
    startW: number;
    startH: number;
    startClient: { x: number; y: number };
  } | null>(null);

  const box = boxOf(comp);
  const s = comp.scale || 1;
  const startW = comp.wpx ?? (box.r - box.l) / s;
  const startH = comp.hpx ?? (box.b - box.t) / s;
  const k = 1 / Math.max(fit, 1e-6);

  const begin = (
    e: React.PointerEvent,
    kind: 'resize' | 'rotate',
    handle?: ResizeHandleId,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    commands.beginTransaction();
    session.current = {
      kind,
      handle,
      startW,
      startH,
      startClient: { x: e.clientX, y: e.clientY },
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
        const cx = (box.l + box.r) / 2;
        const cy = (box.t + box.b) / 2;
        const ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        commands.patchComps([{ id: comp.id, patch: { rot: Math.round(ang) } }]);
        return;
      }
      const a = toCanvasCoords(ev.clientX, ev.clientY, rect, w, h);
      const b = toCanvasCoords(ses.startClient.x, ses.startClient.y, rect, w, h);
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const hd = ses.handle!;
      const dw = hd.includes('e') ? dx : hd.includes('w') ? -dx : 0;
      const dh = hd.includes('s') ? dy : hd.includes('n') ? -dy : 0;
      const patch: Record<string, number> = {};
      if (dw !== 0) patch['wpx'] = Math.max(20, Math.round(ses.startW + dw));
      if (dh !== 0) patch['hpx'] = Math.max(20, Math.round(ses.startH + dh));
      if (Object.keys(patch).length)
        commands.patchComps([{ id: comp.id, patch }]);
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

  const dot = (left: number, top: number, cursor: string, key: string, hd?: ResizeHandleId) => (
    <div
      key={key}
      data-handle={hd ?? 'rotate'}
      data-export-hide
      onPointerDown={(e) => begin(e, hd ? 'resize' : 'rotate', hd)}
      style={{
        position: 'absolute',
        left,
        top,
        width: 12,
        height: 12,
        borderRadius: hd ? 3 : '50%',
        background: '#2f7bff',
        border: '2px solid #fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.5)',
        cursor,
        transform: `translate(-50%,-50%) scale(${k})`,
        zIndex: 999,
      }}
    />
  );

  const cx = (box.l + box.r) / 2;
  const cy = (box.t + box.b) / 2;
  return (
    <>
      {dot(box.l, box.t, HANDLE_CURSORS.nw, 'nw', 'nw')}
      {dot(cx, box.t, HANDLE_CURSORS.n, 'n', 'n')}
      {dot(box.r, box.t, HANDLE_CURSORS.ne, 'ne', 'ne')}
      {dot(box.r, cy, HANDLE_CURSORS.e, 'e', 'e')}
      {dot(box.r, box.b, HANDLE_CURSORS.se, 'se', 'se')}
      {dot(cx, box.b, HANDLE_CURSORS.s, 's', 's')}
      {dot(box.l, box.b, HANDLE_CURSORS.sw, 'sw', 'sw')}
      {dot(box.l, cy, HANDLE_CURSORS.w, 'w', 'w')}
      {dot(cx, box.t - 32, 'grab', 'rot')}
    </>
  );
}
