import { patchableFields } from '../../domain/edgePatch.js';
import type { Edge } from '../../domain/edge.js';
import type { SceneComponent } from '../../domain/component.js';
import { effProps, isState } from '../../renderer/stateChanges.js';
import { commands } from '../../store/commands.js';
import type { EditorStore } from '../../store/editorStore.js';
import { compLabel } from '../labels.js';

/** "123" → 123, "true" → true, else the raw string. */
function coerceValue(text: string): unknown {
  const t = text.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return +t;
  if (t === 'true') return true;
  if (t === 'false') return false;
  return text;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--ed-border)' }}>
      <div className="es-group">{title}</div>
      {children}
    </div>
  );
}

/** Appear-together grouping + run splitting (position-model runs). */
export function RunSection({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const multi = s.selection.compIds.length > 1;
  const inRun = !!comp.stepId;
  const runSize = inRun
    ? s.project.comps.filter((x) => x.stepId === comp.stepId).length
    : 0;
  const scenes = new Set(
    s.selection.compIds.map((id) => s.project.comps.find((x) => x.id === id)?.sceneId ?? null),
  );
  return (
    <Section title="Step grouping">
      {multi && (
        <>
          <button
            className="es-btn"
            disabled={scenes.size > 1}
            title={scenes.size > 1 ? 'merges stay inside one scene' : 'one Space press reveals all'}
            onClick={() => commands.mergeSteps(s.selection.compIds)}
          >
            ⊞ Appear together
          </button>
          {scenes.size > 1 && <p style={{ fontSize: 11 }}>merges stay inside one scene</p>}
        </>
      )}
      {inRun && (
        <div className="es-row">
          <span style={{ fontSize: 12 }}>Merged ({runSize})</span>
          <button className="es-btn" onClick={() => commands.splitRun(comp.id)}>Split</button>
          <button className="es-btn" onClick={() => commands.moveToNewStep(comp.id)}>New step</button>
        </div>
      )}
      {!multi && !inRun && (
        <p style={{ fontSize: 11, color: 'var(--ed-text-muted)' }}>
          Select 2+ steps for appear-together.
        </p>
      )}
    </Section>
  );
}

/** State-change step editor (target, label, when, status, changes). */
export function StateStepEditor({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const comps = s.project.comps;
  const edges = s.project.edges;
  const target =
    comps.find((x) => x.id === comp.target) ??
    edges.find((x) => x.id === comp.target) ??
    null;
  const isEdgeTarget = !!target && (target as Edge).from !== undefined && (target as SceneComponent).type === undefined;
  const pos = comps.indexOf(comp) + 1;
  const patch = (comp.patch ?? {}) as Record<string, unknown>;
  const fields = patchableFields(target);

  let status = '';
  if (!target) status = '⚫ target missing — this step does nothing';
  else {
    const mPos = isEdgeTarget
      ? Math.max(
          comps.findIndex((x) => x.id === (target as Edge).from),
          comps.findIndex((x) => x.id === (target as Edge).to),
        ) + 1
      : comps.indexOf(target as SceneComponent) + 1;
    const tName = isEdgeTarget ? 'wire' : (target as SceneComponent).type;
    status =
      pos <= mPos
        ? `⚠ fires at step ${pos}, but ${tName} appears at step ${mPos} — move it later`
        : `✓ ${tName} appears at step ${mPos}; fires ${pos - mPos} later`;
  }

  const baseValue = (key: string): unknown => {
    if (!target) return '';
    if (isEdgeTarget) return (target as Record<string, unknown>)[key] ?? '';
    return effProps(comps, target as SceneComponent, comps.indexOf(comp))[key] ?? '';
  };

  const setPatchKey = (key: string, value: unknown) => {
    const next = { ...patch };
    if (value === undefined) delete next[key];
    else next[key] = value;
    commands.updateStatePatch(comp.id, next);
  };

  return (
    <div>
      <h2>State change</h2>
      <p style={{ fontSize: 11 }}>Patches the target in place — no clone, wires follow.</p>
      <div className="es-row">
        <label>Target</label>
        <select
          value={comp.target ?? ''}
          onChange={(e) => commands.setStateTarget(comp.id, e.target.value)}
        >
          {comps.filter((x) => !isState(x)).map((x) => (
            <option key={x.id} value={x.id}>
              {comps.indexOf(x) + 1}. {x.type} · {compLabel(x, comps, edges).slice(0, 20)}
            </option>
          ))}
          {edges.map((e) => (
            <option key={e.id} value={e.id}>wire · {e.from} → {e.to}</option>
          ))}
        </select>
      </div>
      <div className="es-row"><label>Step</label><span>{pos} of {comps.length}</span></div>
      <div className="es-row">
        <button className="es-btn" onClick={() => commands.moveComponentToStep(comp.id, pos - 2)}>−</button>
        <button className="es-btn" onClick={() => commands.moveComponentToStep(comp.id, pos)}>+</button>
        <button className="es-btn" onClick={() => commands.moveComponentToStep(comp.id, comps.length)}>End</button>
      </div>
      <p style={{ fontSize: 11 }}>{status}</p>
      <div className="es-group">Changes</div>
      {!target && <p style={{ fontSize: 11 }}>target missing — pick a target above</p>}
      {target && Object.keys(patch).map((key) => {
        const meta = fields.find((f) => f.key === key) ?? { key, kind: 'text', options: null };
        return (
          <div className="es-row" key={key}>
            <label>{key}</label>
            {meta.kind === 'check' ? (
              <input
                type="checkbox"
                checked={!!patch[key]}
                onChange={(e) => setPatchKey(key, e.target.checked)}
              />
            ) : meta.kind === 'select' && meta.options ? (
              <select
                value={String(patch[key] ?? '')}
                onChange={(e) => setPatchKey(key, e.target.value)}
              >
                {meta.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={meta.kind === 'number' ? 'number' : 'text'}
                value={String(patch[key] ?? '')}
                onChange={(e) => setPatchKey(key, coerceValue(e.target.value))}
              />
            )}
            <button className="es-btn" title={`stop patching ${key}`} onClick={() => setPatchKey(key, undefined)}>✕</button>
          </div>
        );
      })}
      {target && (
        <div className="es-row">
          <label>Add</label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setPatchKey(e.target.value, baseValue(e.target.value));
            }}
          >
            <option value="">+ field…</option>
            {fields.filter((f) => !(f.key in patch)).map((f) => (
              <option key={f.key} value={f.key}>{f.key}</option>
            ))}
          </select>
        </div>
      )}
      {!target && <p style={{ fontSize: 11 }}>Deletion hint: 🗑 removes this step.</p>}
    </div>
  );
}

/** Retire (hides) + scheduled exit (hideWhen) for a story step. */
export function RetireSection({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const comps = s.project.comps;
  const idx = comps.indexOf(comp);
  const hides = new Set(Array.isArray(comp.hides) ? comp.hides : []);
  const earlier = comps.filter(
    (x) => x.id !== comp.id && !isState(x) && comps.indexOf(x) < idx,
  );
  const later = comps.filter(
    (x) => x.id !== comp.id && !isState(x) && comps.indexOf(x) > idx,
  );
  const toggleHide = (id: string) => {
    const next = hides.has(id)
      ? [...hides].filter((x) => x !== id)
      : [...hides, id];
    commands.updateComponent(comp.id, { hides: next.length ? next : undefined } as never);
  };
  return (
    <Section title="Retire & exit">
      <div className="es-group">⊘ retires when this appears</div>
      {!earlier.length && <p style={{ fontSize: 11 }}>nothing earlier to retire</p>}
      {earlier.map((o) => (
        <label key={o.id} style={{ display: 'inline-flex', gap: 4, fontSize: 11, margin: '0 6px 6px 0' }}>
          <input type="checkbox" checked={hides.has(o.id)} onChange={() => toggleHide(o.id)} />
          {comps.indexOf(o) + 1}.{o.type}
        </label>
      ))}
      <div className="es-row">
        <label>🚪 exit</label>
        <select
          value={comp.hideWhen ?? ''}
          onChange={(e) =>
            commands.updateComponent(comp.id, {
              hideWhen: e.target.value || undefined,
            } as never)
          }
        >
          <option value="">Never</option>
          {later.map((o) => (
            <option key={o.id} value={o.id}>
              {comps.indexOf(o) + 1}. {o.type} · {compLabel(o, comps, s.project.edges).slice(0, 16)}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
}
