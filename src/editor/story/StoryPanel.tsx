import { useState } from 'react';
import '../canvas/canvas.css';
import { REGISTRY } from '../../catalog/registry.js';
import { runMembers } from '../../domain/step.js';
import type { SceneComponent } from '../../domain/component.js';
import { commands } from '../../store/commands.js';
import type { EditorStore } from '../../store/editorStore.js';
import { useEditor } from '../storeHooks.js';
import { compLabel } from '../labels.js';
import { RetireSection, RunSection } from '../inspector/StorySections.js';

const STEP_DND = 'application/x-story-step';

/** Mini scene preview — static base-props markup, scaled to card width. */
function ScenePreview({ s, sceneId }: { s: EditorStore; sceneId: string | null }) {
  const { w, h } = s.project.scene;
  const scale = 296 / w;
  const comps = s.project.comps.filter(
    (c) => (c.sceneId ?? null) === sceneId && c.type !== 'state' && REGISTRY[c.type],
  );
  if (!comps.length) return null;
  return (
    <div
      data-scene-preview={sceneId ?? 'unassigned'}
      style={{
        width: '100%',
        aspectRatio: `${w} / ${h}`,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--ed-canvas-well)',
        borderRadius: 6,
        marginBottom: 6,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {comps.map((c) => {
          const P = (c.props ?? {}) as Record<string, unknown>;
          return (
            <div
              key={c.id}
              className="comp"
              style={{
                left: c.x,
                top: c.y,
                zIndex: c.z,
                transform: `scale(${c.scale ?? 1}) rotate(${c.rot ?? 0}deg)`,
                opacity: c.opacity ?? 1,
              }}
              dangerouslySetInnerHTML={{ __html: REGISTRY[c.type].markup(P as never) }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Checklist items as numbered rows (Scene 2 in the mock). */
function ChecklistRows({ comp }: { comp: SceneComponent }) {
  const p = (comp.props ?? {}) as Record<string, unknown>;
  const items = String(p['items'] ?? '')
    .split('\n')
    .map((l) => l.split('|')[0].trim().replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean);
  if (!items.length) return null;
  return (
    <div style={{ margin: '2px 0 4px 26px' }}>
      {items.map((t, i) => (
        <div key={i} className="es-checkline">
          <span className="n">{i + 1}</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

function StepRow({
  s,
  comp,
  index,
  number,
  expanded,
  onToggleExpand,
  dropBefore,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
}: {
  s: EditorStore;
  comp: SceneComponent;
  index: number;
  number: number;
  expanded: boolean;
  onToggleExpand: () => void;
  dropBefore: boolean;
  onDragStartRow: (e: React.DragEvent) => void;
  onDragOverRow: (e: React.DragEvent) => void;
  onDropRow: (e: React.DragEvent) => void;
}) {
  const sel = s.selection.compIds.includes(comp.id);
  const next = s.playback.active && index === s.playback.shown;
  const flags = `${comp.clearBefore ? '🧹' : ''}${comp.pin ? '📌' : ''}${comp.type === 'state' ? '⚠' : ''}${comp.stepId ? '⊞' : ''}`;
  const run = comp.stepId ? runMembers(s.project.comps, index) : [];
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={'es-step' + (sel ? ' sel' : '') + (next ? ' next' : '')}
        data-seq={index}
        draggable
        onDragStart={onDragStartRow}
        onDragOver={onDragOverRow}
        onDrop={onDropRow}
        style={dropBefore ? { borderTop: '2px solid var(--ed-accent)' } : undefined}
        onClick={() => commands.selectComps([comp.id])}
      >
        <button
          className="mini"
          title={expanded ? 'collapse' : 'expand'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <span className="n">{number}</span>
        <span className="lbl">
          {compLabel(comp, s.project.comps, s.project.edges) || comp.type}{' '}
          <span className="es-flags">{flags}</span>
        </span>
        <button
          className="mini"
          title="clear screen before this step"
          onClick={(e) => {
            e.stopPropagation();
            commands.updateComponent(comp.id, { clearBefore: !comp.clearBefore || undefined } as never);
          }}
        >🧹</button>
        <button
          className="mini"
          title="pin through clears"
          onClick={(e) => {
            e.stopPropagation();
            commands.updateComponent(comp.id, { pin: !comp.pin || undefined } as never);
          }}
        >📌</button>
        <button
          className="mini"
          title="move earlier"
          onClick={(e) => { e.stopPropagation(); commands.reorderStep(index, index - 1); }}
        >↑</button>
        <button
          className="mini"
          title="move later"
          onClick={(e) => { e.stopPropagation(); commands.reorderStep(index, index + 1); }}
        >↓</button>
        <button
          className="mini"
          title="remove step"
          onClick={(e) => { e.stopPropagation(); commands.deleteComponents([comp.id]); }}
        >✕</button>
      </div>
      {comp.type === 'checklist' && <ChecklistRows comp={comp} />}
      {expanded && (
        <div data-expanded={comp.id} style={{ padding: '2px 6px 8px 26px' }}>
          <div className="es-group-head"><span className="t">Components in this step</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {(run.length > 1 ? run : [comp]).map((m) => (
              <button
                key={m.id}
                className="es-btn"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => commands.selectComps([m.id])}
              >
                {m.type} · {compLabel(m, s.project.comps, s.project.edges).slice(0, 14) || '—'}
              </button>
            ))}
          </div>
          <button
            className="es-btn"
            style={{ fontSize: 11, marginBottom: 4 }}
            onClick={() => commands.moveToNewStep(comp.id)}
          >
            ＋ Move to new step
          </button>
          <RunSection s={s} comp={comp} />
          {comp.type !== 'state' && <RetireSection s={s} comp={comp} />}
        </div>
      )}
    </div>
  );
}

/** Story strip: scene cards with steps (select, reorder, expand). */
export function StoryPanel() {
  const s = useEditor((st) => st);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const startRowDrag = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData(STEP_DND, id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const overRow = (e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes(STEP_DND)) return;
    e.preventDefault();
    setDropIndex(index);
  };
  const dropRow = (e: React.DragEvent, index: number) => {
    const id = e.dataTransfer.getData(STEP_DND);
    setDropIndex(null);
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    const from = s.project.comps.findIndex((c) => c.id === id);
    if (from < 0 || from === index) return;
    commands.moveComponentToStep(id, from < index ? index - 1 : index);
  };

  const sceneIds = s.project.scenes.map((sc) => sc.id);
  const isUnassigned = (c: { sceneId?: string | null }) =>
    !c.sceneId || !sceneIds.includes(c.sceneId);
  const groups: { key: string; title: string; sub: string }[] = [
    ...s.project.scenes.map((sc) => ({
      key: sc.id,
      title: sc.name ?? 'Scene',
      sub: `${s.project.comps.filter((c) => c.sceneId === sc.id).length} steps`,
    })),
  ];
  const unassigned = s.project.comps.filter(isUnassigned);
  if (unassigned.length) {
    groups.push({
      key: '__none__',
      title: s.project.scenes.length ? 'Unassigned' : 'Scene 1',
      sub: `${unassigned.length} steps`,
    });
  }

  return (
    <>
      {groups.map((g) => {
        const sid = g.key === '__none__' ? null : g.key;
        const members = s.project.comps
          .map((c, i) => ({ c, i }))
          .filter(({ c }) =>
            g.key === '__none__' ? isUnassigned(c) : c.sceneId === g.key,
          );
        return (
          <div
            key={g.key}
            className={'es-scene' + (s.prefs.activeSceneId === sid ? ' active' : '')}
            data-scene={g.key}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(STEP_DND)) return;
              e.preventDefault();
              setDropIndex(s.project.comps.length);
            }}
            onDrop={(e) => {
              const id = e.dataTransfer.getData(STEP_DND);
              setDropIndex(null);
              if (!id) return;
              e.preventDefault();
              commands.moveComponentToStep(id, s.project.comps.length);
            }}
          >
            <h3>{g.title}</h3>
            <p className="sub">{g.sub}</p>
            <ScenePreview s={s} sceneId={sid} />
            {members.map(({ c, i }, n) => (
              <StepRow
                key={c.id}
                s={s}
                comp={c}
                index={i}
                number={n + 1}
                expanded={expanded === c.id}
                onToggleExpand={() => setExpanded((cur) => (cur === c.id ? null : c.id))}
                dropBefore={dropIndex === i}
                onDragStartRow={(e) => startRowDrag(e, c.id)}
                onDragOverRow={(e) => overRow(e, i)}
                onDropRow={(e) => dropRow(e, i)}
              />
            ))}
            <button
              className="es-btn"
              style={{ marginTop: 6 }}
              onClick={() => {
                if (sid) commands.setActiveScene(sid);
              }}
              title="new components land in this scene"
            >
              + Add step
            </button>
          </div>
        );
      })}
      <button
        className="es-addscene"
        onClick={() => commands.addScene()}
        title="continue your story"
      >
        <span className="plus">+</span>
        <span>Add scene</span>
        <span style={{ fontSize: 11 }}>Continue your story</span>
      </button>
    </>
  );
}
