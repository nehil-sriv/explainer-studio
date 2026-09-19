import { useEffect, useRef, useState } from 'react';
import '../../../assets/tokens.css';
import '../../../css/core.css';
import '../../../css/phosphor.css';
import '../../../themes/minimal.css';
import '../../../themes/warm-paper.css';
import '../../../themes/quiet-terminal.css';
import '../../../themes/technical-blue.css';
import '../../../themes/ink-grid.css';
import '../../../themes/editorial.css';
import '../../../themes/neon.css';
import '../../../themes/ember.css';
import '../../../themes/insta.css';
import '../../../themes/studio-black.css';
import '../../../themes/phosphor.css';
import '../../../themes/paper.css';
import '../../../themes/glass.css';
import '../../../themes/brutal.css';
import './canvas.css';
import './entrances.css';
import { REGISTRY } from '../../catalog/registry.js';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import { takeFrame } from '../../store/selectors.js';
import { useEditor } from '../storeHooks.js';
import { CANVAS_THEMES } from '../canvasTheme.js';
import { postPopoutFrame, listenPopoutHello } from '../../popout/sync.js';
import { toCanvasCoords } from './coords.js';
import { boxOf, snapMove, unionBox } from './snapping.js';
import { marqueeSelect, normRect } from './marquee.js';
import { requestExportCancel } from '../../export/cancel.js';
import { TransformHandles } from './Handles.js';
import { SceneView } from './SceneView.js';
import { InlineTextEditor, type EditingSession } from './InlineTextEditor.js';
import { primaryTextField } from './editableFields.js';

const COMP_DND = 'application/x-explainer-comp';

/**
 * Canvas workspace — gestures + chrome around the shared SceneView:
 * drag (snapping guides, Alt bypasses), marquee select, 8-handle
 * resize + rotate, keyboard nudge/duplicate/delete, library drops,
 * inline text editing. Takes paint through the same frame the popout
 * and recording consume.
 */
export function CanvasWorkspace() {
  const s = useEditor((st) => st);
  const wellRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.5);
  const [canvasTheme, setCanvasTheme] = useState('studio-black');
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState<EditingSession | null>(null);
  const dragRef = useRef<{
    ids: string[];
    orig: Map<string, { x: number; y: number }>;
    startClient: { x: number; y: number };
    live: boolean;
    moved: boolean;
  } | null>(null);
  const marqueeRef = useRef<{ x0: number; y0: number; additive: boolean } | null>(null);
  const marqueeMoved = useRef(false);
  const suppressClick = useRef(false);

  const { w, h } = s.project.scene;
  useEffect(() => {
    const el = wellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setFit(Math.min((r.width - 48) / w, (r.height - 48) / h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  // popout mirror: push every frame (project + take state + canvas theme)
  useEffect(() => {
    const push = () => {
      const st = editorStore.getState();
      postPopoutFrame({
        comps: st.project.comps,
        edges: st.project.edges,
        scene: st.project.scene,
        theme: canvasTheme,
        active: st.playback.active,
        shown: st.playback.shown,
        revealed: st.playback.revealed,
      });
    };
    const unsub = editorStore.subscribe(push);
    const unhello = listenPopoutHello(push);
    push();
    return () => {
      unsub();
      unhello();
    };
  }, [canvasTheme]);

  // ---- keyboard: nudge / duplicate / delete / escape ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const st = editorStore.getState();
      const ids = st.selection.compIds;
      if (e.key === 'Escape') {
        if (st.exportState.status === 'exporting') {
          requestExportCancel();
          return;
        }
        if (st.playback.active) commands.stopPlayback();
        else commands.clearSelection();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (ids.length || st.selection.edgeId)) {
        e.preventDefault();
        commands.deleteSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (ids.length) commands.duplicateSelection();
        return;
      }
      if (e.key === ' ') {
        if (st.playback.active) {
          e.preventDefault();
          commands.stepNext();
        }
        return;
      }
      if (e.key.startsWith('Arrow') && ids.length) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        commands.moveComponents(ids, dx, dy);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scenePoint = (clientX: number, clientY: number) => {
    const el = sceneRef.current!;
    const r = el.getBoundingClientRect();
    return toCanvasCoords(clientX, clientY, r, w, h);
  };

  // ---- comp drag ----
  const onCompPointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0 || editing) return;
    e.stopPropagation();
    e.preventDefault();
    const st = editorStore.getState();
    if (st.playback.active) {
      commands.selectComps([id], e.shiftKey);
      return;
    }
    if (e.shiftKey) {
      const has = st.selection.compIds.includes(id);
      commands.selectComps(
        has ? st.selection.compIds.filter((x) => x !== id) : [...st.selection.compIds, id],
      );
    } else if (!st.selection.compIds.includes(id)) {
      commands.selectComps([id]);
    }
    const ids = editorStore.getState().selection.compIds;
    const orig = new Map(
      ids
        .map((cid) => {
          const c = editorStore.getState().project.comps.find((x) => x.id === cid);
          return c ? ([cid, { x: c.x ?? 0, y: c.y ?? 0 }] as const) : null;
        })
        .filter(Boolean) as [string, { x: number; y: number }][],
    );
    dragRef.current = {
      ids,
      orig,
      startClient: { x: e.clientX, y: e.clientY },
      live: false,
      moved: false,
    };
    const move = (ev: PointerEvent) => {
      const dr = dragRef.current;
      const el = sceneRef.current;
      if (!dr || !el) return;
      const screenDx = Math.abs(ev.clientX - dr.startClient.x);
      const screenDy = Math.abs(ev.clientY - dr.startClient.y);
      if (!dr.moved && Math.hypot(screenDx, screenDy) < 3) return;
      dr.moved = true;
      if (!dr.live) {
        dr.live = true;
        commands.beginTransaction();
      }
      const p0 = toCanvasCoords(dr.startClient.x, dr.startClient.y, el.getBoundingClientRect(), w, h);
      const p1 = toCanvasCoords(ev.clientX, ev.clientY, el.getBoundingClientRect(), w, h);
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let g = { v: [] as number[], h: [] as number[] };
      if (!ev.altKey) {
        const cur = editorStore.getState().project.comps;
        const movingBoxes = dr.ids
          .map((cid) => cur.find((x) => x.id === cid))
          .filter(Boolean)
          .map((c) => boxOf({ ...c!, x: dr.orig.get(c!.id)!.x, y: dr.orig.get(c!.id)!.y }));
        const movingSet = new Set(dr.ids);
        const statics = cur
          .filter((c) => !movingSet.has(c.id) && c.type !== 'state' && !c.parked)
          .map((c) => boxOf(c));
        if (movingBoxes.length) {
          const sn = snapMove(unionBox(movingBoxes), statics, { w, h }, dx, dy);
          dx = sn.dx;
          dy = sn.dy;
          g = sn.guides;
        }
      }
      setGuides(g);
      commands.setPositions(
        dr.ids.map((cid) => ({
          id: cid,
          x: Math.round((dr.orig.get(cid)!.x + dx) * 10) / 10,
          y: Math.round((dr.orig.get(cid)!.y + dy) * 10) / 10,
        })),
      );
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (dragRef.current?.live) commands.commitTransaction();
      // a real drag must not fall through to the well's click-to-deselect
      if (dragRef.current?.moved) suppressClick.current = true;
      dragRef.current = null;
      setGuides({ v: [], h: [] });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---- inline text editing (double-click) ----
  const onCompDoubleClick = (e: React.MouseEvent, c: (typeof s.project.comps)[number]) => {
    e.stopPropagation();
    if (s.playback.active || editing) return;
    const field = primaryTextField(c);
    if (!field) return;
    const props = (c.props ?? {}) as Record<string, unknown>;
    setEditing({
      id: c.id,
      field: field.key,
      initial: String(props[field.key] ?? ''),
      multiline: field.multiline,
    });
  };

  const commitEditing = (value: string) => {
    const ses = editing;
    setEditing(null);
    if (ses) commands.updateComponentProps(ses.id, { [ses.field]: value });
  };

  // ---- marquee ----
  const onWellPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const p = scenePoint(e.clientX, e.clientY);
    marqueeRef.current = { x0: p.x, y0: p.y, additive: e.shiftKey };
    marqueeMoved.current = false;
    setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    const move = (ev: PointerEvent) => {
      const m = marqueeRef.current;
      const el = sceneRef.current;
      if (!m || !el) return;
      const r = el.getBoundingClientRect();
      const q = toCanvasCoords(ev.clientX, ev.clientY, r, w, h);
      marqueeMoved.current = true;
      setMarquee({ x0: m.x0, y0: m.y0, x1: q.x, y1: q.y });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const m = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);
      if (m && marqueeMoved.current) {
        const el = sceneRef.current!;
        const r = el.getBoundingClientRect();
        const q = toCanvasCoords(ev.clientX, ev.clientY, r, w, h);
        const ids = marqueeSelect(
          editorStore.getState().project.comps,
          normRect(m.x0, m.y0, q.x, q.y),
        );
        commands.selectComps(ids, m.additive);
        // click fires after pointerup even for drags — swallow it once
        suppressClick.current = true;
      }
      marqueeMoved.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---- library drop ----
  const dropPoint = (e: React.DragEvent) => {
    const r = sceneRef.current!.getBoundingClientRect();
    return toCanvasCoords(e.clientX, e.clientY, r, w, h);
  };

  const frame = s.playback.active ? takeFrame(s, s.playback.shown) : null;
  const visible = frame ? new Set(frame.visibleIds) : null;
  const edgeIds = frame
    ? new Set(frame.edgeIds)
    : new Set(
        s.project.edges
          .filter(
            (e) =>
              s.project.comps.some((c) => c.id === e.from) &&
              e.to &&
              s.project.comps.some((c) => c.id === e.to),
          )
          .map((e) => e.id),
      );
  const selected = new Set(s.selection.compIds);
  const singleSel = s.selection.compIds.length === 1
    ? s.project.comps.find((c) => c.id === s.selection.compIds[0])
    : undefined;
  const editingTarget = editing
    ? s.project.comps.find((c) => c.id === editing.id)
    : undefined;

  return (
    <div
      className="es-canvaswell"
      ref={wellRef}
      onPointerDown={onWellPointerDown}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (!marqueeMoved.current) commands.clearSelection();
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(COMP_DND)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        const p = dropPoint(e);
        setDropPreview({ x: p.x - 110, y: p.y - 60 });
      }}
      onDragLeave={() => setDropPreview(null)}
      onDrop={(e) => {
        const type = e.dataTransfer.getData(COMP_DND);
        setDropPreview(null);
        if (!type || !REGISTRY[type]) return;
        e.preventDefault();
        const p = dropPoint(e);
        commands.addComponent({ type, x: Math.round(p.x - 110), y: Math.round(p.y - 60) });
      }}
      data-testid="canvas-well"
    >
      <select
        aria-label="canvas theme"
        value={canvasTheme}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setCanvasTheme(e.target.value)}
        style={{ position: 'absolute', top: 8, left: 8, zIndex: 5 }}
      >
        {CANVAS_THEMES.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>
      {/* Measured wrapper: CSS scale doesn't change layout size, so the
          wrapper reserves exactly the scaled footprint for true centering. */}
      <div
        data-scene-wrap
        style={{
          width: Math.max(1, Math.round(w * fit)),
          height: Math.max(1, Math.round(h * fit)),
          flex: 'none',
          position: 'relative',
        }}
      >
      <SceneView
        comps={s.project.comps}
        edges={s.project.edges}
        w={w}
        h={h}
        theme={canvasTheme}
        fit={fit}
        active={s.playback.active}
        shown={s.playback.shown}
        revealed={s.playback.revealed}
        visibleIds={visible}
        edgeIds={edgeIds}
        selectedIds={selected}
        interactive
        onCompPointerDown={onCompPointerDown}
        onCompDoubleClick={onCompDoubleClick}
        sceneRef={sceneRef}
        overlay={
          <>
            {guides.v.map((x, i) => (
              <div key={`v${i}`} data-guide="v" data-export-hide style={{ position: 'absolute', left: x, top: 0, width: 1, height: h, background: '#2f7bff', pointerEvents: 'none', zIndex: 998 }} />
            ))}
            {guides.h.map((y, i) => (
              <div key={`h${i}`} data-guide="h" data-export-hide style={{ position: 'absolute', top: y, left: 0, height: 1, width: w, background: '#2f7bff', pointerEvents: 'none', zIndex: 998 }} />
            ))}
            {marquee && (
              <div
                data-marquee
                data-export-hide
                style={{
                  position: 'absolute',
                  left: Math.min(marquee.x0, marquee.x1),
                  top: Math.min(marquee.y0, marquee.y1),
                  width: Math.abs(marquee.x1 - marquee.x0),
                  height: Math.abs(marquee.y1 - marquee.y0),
                  border: '1px solid #2f7bff',
                  background: 'rgba(47,123,255,.12)',
                  pointerEvents: 'none',
                  zIndex: 997,
                }}
              />
            )}
            {dropPreview && (
              <div
                data-drop-preview
                data-export-hide
                style={{
                  position: 'absolute',
                  left: dropPreview.x,
                  top: dropPreview.y,
                  width: 220,
                  height: 120,
                  border: '2px dashed #2f7bff',
                  borderRadius: 8,
                  pointerEvents: 'none',
                  zIndex: 996,
                }}
              />
            )}
            {singleSel && !s.playback.active && !editing && (
              <TransformHandles
                comp={singleSel}
                fit={fit}
                sceneRef={sceneRef}
                noteGestureEnd={() => {
                  suppressClick.current = true;
                }}
              />
            )}
            {editingTarget && editing && (
              <InlineTextEditor
                comp={editingTarget}
                session={editing}
                sceneRef={sceneRef}
                onCommit={commitEditing}
                onCancel={() => setEditing(null)}
              />
            )}
          </>
        }
      />
      </div>
      {s.playback.active && (
        <div className="es-takebar" data-testid="takebar">
          <button className="es-btn" onClick={() => commands.stepBack()}>←</button>
          <span>{s.playback.shown}/{s.project.comps.length}</span>
          <button className="es-btn" onClick={() => commands.stepNext()}>→</button>
          <button className="es-btn" onClick={() => (s.playback.auto ? commands.stopAuto() : commands.startAuto())}>
            {s.playback.auto ? '⏸ Auto' : '⏩ Auto'}
          </button>
          <button className="es-btn" onClick={() => commands.stopPlayback()}>Exit</button>
        </div>
      )}
    </div>
  );
}
