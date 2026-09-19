import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import '../../assets/fonts.css';
import { REGISTRY } from '../../catalog/registry.js';
import { resolveAnim } from '../../catalog/defaultAnims.js';
import { isStepped, stepTotalFor } from '../../catalog/lines.js';
import type { Edge } from '../../domain/edge.js';
import type { SceneComponent } from '../../domain/component.js';
import { runStart } from '../../domain/step.js';
import { effEdge, effProps, isState } from '../../renderer/stateChanges.js';
import { applyLineReveal } from '../../renderer/lines.js';
import { edgeColor, edgeGeom } from '../../renderer/geometry.js';

export interface SceneViewProps {
  comps: SceneComponent[];
  edges: Edge[];
  w: number;
  h: number;
  theme: string;
  fit: number;
  /** take state (inactive = edit/show-all) */
  active: boolean;
  shown: number;
  revealed: Record<string, number>;
  visibleIds: Set<string> | null;
  edgeIds: Set<string> | null;
  selectedIds?: Set<string>;
  interactive?: boolean;
  onCompPointerDown?: (e: React.PointerEvent, id: string) => void;
  onCompDoubleClick?: (e: React.MouseEvent, c: SceneComponent) => void;
  sceneRef?: RefObject<HTMLDivElement | null>;
  /** overlays painted inside the scaled scene (handles, guides, marquee) */
  overlay?: ReactNode;
}

function entranceFor(
  c: SceneComponent,
  armed: boolean,
): CSSProperties {
  if (!armed) return {};
  const anim = resolveAnim(c.type, c.anim);
  if (!anim || anim === 'none' || anim === 'type') return {};
  const dur = c.animDur || 0.6;
  // delay skipped mid-take: takes start on the Space press (legacy parity)
  return { animation: `${anim} ${dur}s cubic-bezier(.2,.7,.3,1) 0s backwards` };
}

/**
 * Shared scene renderer — editor canvas, popout and (later) export
 * snapshots all paint through here from one resolved frame. Entrances
 * replay exactly like legacy re-arming: only the run revealed by the
 * latest advance animates (tracked across renders, reset when the take
 * stops).
 */
export function SceneView(props: SceneViewProps) {
  const {
    comps, edges, w, h, theme, fit, active, shown, revealed,
    visibleIds, edgeIds, selectedIds, interactive,
    onCompPointerDown, onCompDoubleClick, sceneRef, overlay,
  } = props;

  const track = useRef({ prev: -1, lastAdvanced: -1 });
  if (!active) {
    track.current.prev = -1;
    track.current.lastAdvanced = -1;
  } else if (shown !== track.current.prev) {
    if (shown > track.current.prev) {
      track.current.lastAdvanced = runStart(comps, Math.max(0, shown - 1));
    }
    track.current.prev = shown;
  }
  const armedRun =
    active && shown > 0 ? runStart(comps, Math.max(0, shown - 1)) : -2;
  const cutoff = active ? shown : 0;
  const lookup = (id: string) => comps.find((c) => c.id === id);

  return (
    <div
      className="scene es-stage"
      id="scene"
      ref={sceneRef}
      data-theme={theme}
      data-testid="scene"
      style={
        {
          width: w,
          height: h,
          transform: `scale(${fit})`,
          transformOrigin: 'top left',
          flex: 'none',
          '--scene-w': `${w}px`,
          '--scene-h': `${h}px`,
        } as CSSProperties
      }
      onClick={(e) => e.stopPropagation()}
    >
      {comps.map((c, i) => {
        if (active && visibleIds && !visibleIds.has(c.id)) return null;
        if (isState(c)) return null;
        const def = REGISTRY[c.type];
        if (!def) return null;
        const P = effProps(comps, c, cutoff) as Record<string, unknown>;
        let html = def.markup(P as never);
        if (active && isStepped(c)) {
          const total = stepTotalFor(c);
          html = applyLineReveal(html, revealed[c.id] ?? total);
        }
        const armed =
          track.current.lastAdvanced === armedRun && i >= armedRun && i < shown;
        return (
          <div
            key={c.id}
            className={'comp' + (selectedIds?.has(c.id) ? ' es-sel' : '')}
            data-id={c.id}
            data-seq={i}
            style={
              {
                left: c.x,
                top: c.y,
                zIndex: c.z,
                transform: `scale(${c.scale ?? 1}) rotate(${c.rot ?? 0}deg)`,
                opacity: c.opacity ?? 1,
                touchAction: interactive ? 'none' : undefined,
                ...(c.wpx ? { width: c.wpx } : {}),
                ...(c.hpx ? { height: c.hpx } : {}),
                '--fscale': c.fscale ?? 1,
                // entrance keyframes end here — sampled frames land on the transform
                '--ks': c.scale ?? 1,
                '--kr': `${c.rot ?? 0}deg`,
                ...entranceFor(c, armed),
              } as CSSProperties
            }
            onPointerDown={interactive && onCompPointerDown ? (e) => onCompPointerDown(e, c.id) : undefined}
            onDoubleClick={interactive && onCompDoubleClick ? (e) => onCompDoubleClick(e, c) : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
      <svg className="es-edges" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {edges.map((e) => {
          if (edgeIds && !edgeIds.has(e.id)) return null;
          const live = effEdge(comps, e, cutoff);
          const G = edgeGeom(lookup, live);
          if (!G) return null;
          const col = edgeColor(live);
          const wgt = Math.max(1, Math.min(5, +(live.weight ?? 2)));
          return (
            <g key={e.id} data-edge={e.id}>
              <path d={G.d} fill="none" stroke={col} strokeWidth={wgt} />
              <polygon points={G.headEnd} fill={col} />
            </g>
          );
        })}
      </svg>
      {overlay}
    </div>
  );
}
