import { useEffect, useRef, useState } from 'react';
import type { SceneComponent } from '../../domain/component.js';
import { boxOf } from './snapping.js';

export interface EditingSession {
  id: string;
  field: string;
  initial: string;
  multiline: boolean;
}

/** Copy the rendered text style so the overlay matches the canvas text. */
function readTextStyle(compId: string, scene: HTMLElement | null): React.CSSProperties {
  const fallback: React.CSSProperties = { fontSize: 16, lineHeight: 1.5 };
  try {
    if (!scene) return fallback;
    const node = scene.querySelector(`[data-id="${compId}"]`);
    const probe =
      (node?.querySelector('b, span, div, p') as HTMLElement | null) ?? (node as HTMLElement | null);
    if (!probe || typeof getComputedStyle === 'undefined') return fallback;
    const cs = getComputedStyle(probe);
    const out: React.CSSProperties = {};
    if (cs.fontSize && cs.fontSize !== '') out.fontSize = cs.fontSize;
    if (cs.fontFamily && cs.fontFamily !== '') out.fontFamily = cs.fontFamily;
    if (cs.lineHeight && cs.lineHeight !== '') out.lineHeight = cs.lineHeight;
    if (cs.textAlign && cs.textAlign !== '') out.textAlign = cs.textAlign as never;
    if (cs.color && cs.color !== '') out.color = cs.color;
    if (cs.fontWeight && cs.fontWeight !== '') out.fontWeight = cs.fontWeight as never;
    return { ...fallback, ...out };
  } catch {
    return fallback;
  }
}

/**
 * Temporary in-place text editor — an overlay positioned over the rendered
 * text, never a permanent contenteditable scene node. Contract:
 * single click selects · double click edits · Enter commits a short label ·
 * Shift+Enter inserts a line break (multiline) · Ctrl/Cmd+Enter commits
 * multiline · Escape cancels · click outside commits. One commit = one
 * undo entry (single updateProps call at commit time).
 */
export function InlineTextEditor({
  comp,
  session,
  sceneRef,
  onCommit,
  onCancel,
}: {
  comp: SceneComponent;
  session: EditingSession;
  sceneRef: React.RefObject<HTMLDivElement | null>;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(session.initial);
  const valueRef = useRef(value);
  valueRef.current = value;
  const boxRef = useRef(boxOf(comp));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    el?.focus();
    if (el && !session.multiline && 'select' in el) (el as HTMLInputElement).select();
  }, [session.multiline]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const overlay = inputRef.current;
      const t = e.target as Node | null;
      // real browsers always target an Element; non-Node targets (e.g.
      // synthetic dispatches) count as outside.
      if (overlay && (!(t instanceof Node) || !overlay.contains(t)))
        onCommit(valueRef.current);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [onCommit]);

  const box = boxRef.current;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: box.l,
    top: box.t,
    width: Math.max(60, box.r - box.l),
    minHeight: Math.max(24, box.b - box.t),
    zIndex: 1000,
    background: 'rgba(10,17,32,.92)',
    border: '2px solid #2f7bff',
    borderRadius: 6,
    padding: 4,
    margin: 0,
    resize: 'none',
    overflow: 'hidden',
    ...readTextStyle(comp.id, sceneRef.current),
  };

  const commit = () => {
    if (value !== session.initial) onCommit(value);
    else onCancel();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && !session.multiline) {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commit();
    }
  };

  if (!session.multiline) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        data-inline-editor
        data-export-hide
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={style}
      />
    );
  }
  return (
    <textarea
      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
      data-inline-editor
      data-export-hide
      value={value}
      rows={Math.max(2, session.initial.split('\n').length)}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={style}
    />
  );
}
