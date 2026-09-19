import { useState } from 'react';
import { REGISTRY } from '../../catalog/registry.js';
import { isState, stateSummary } from '../../renderer/stateChanges.js';
import { commands } from '../../store/commands.js';
import { selectedComps } from '../../store/selectors.js';
import type { EditorStore } from '../../store/editorStore.js';
import type { SceneComponent } from '../../domain/component.js';
import { useEditor } from '../storeHooks.js';
import { compLabel } from '../labels.js';
import { CURATED_CATALOG, categoryFor, shortSceneName } from '../library/catalog.js';
import { boxOf } from '../canvas/snapping.js';
import { RetireSection, RunSection, StateStepEditor } from './StorySections.js';
import {
  downloadUrl,
  exportCompPNG,
  exportFramePNG,
  exportFrameSVG,
} from '../../export/stills.js';
import { requireScene } from '../../export/raster.js';

const MOTION_ANIMS = [
  'none', 'type', 'pa-fade', 'pa-left', 'pa-right', 'pa-up', 'pa-down',
  'pa-zoom', 'pa-zoomout', 'pa-glitchin',
];
const EXIT_ANIMS = ['none', 'fade', 'rise', 'fall', 'zoom'];

/** Commit-on-blur text/number field (each commit = one undo entry). */
function Field({
  label,
  value,
  type = 'text',
  onCommit,
}: {
  label: string;
  value: string | number | undefined;
  type?: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = `es-f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="es-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={draft ?? String(value ?? '')}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== String(value ?? '')) onCommit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

function glyphFor(type: string): string {
  for (const g of CURATED_CATALOG) {
    const t = g.tiles.find((t) => t.type === type);
    if (t) return t.glyph;
  }
  return type.charAt(0).toUpperCase();
}

function OpacityRow({ comp }: { comp: SceneComponent }) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = Math.round(((draft ?? comp.opacity ?? 1) as number) * 100);
  return (
    <div className="es-row">
      <label>Opacity</label>
      <input
        type="range"
        className="es-range"
        min={0}
        max={100}
        value={shown}
        onChange={(e) => setDraft(+e.target.value / 100)}
        onPointerUp={() => {
          if (draft !== null) {
            commands.updateComponent(comp.id, { opacity: draft });
            setDraft(null);
          }
        }}
        onBlur={() => {
          if (draft !== null) {
            commands.updateComponent(comp.id, { opacity: draft });
            setDraft(null);
          }
        }}
      />
      <span style={{ minWidth: 38, textAlign: 'right' }}>{shown}%</span>
    </div>
  );
}

const ACCENT_PRESETS = [
  { name: 'Default', value: '' },
  { name: 'Healthy', value: 'var(--phos-green)' },
  { name: 'Warning', value: 'var(--amber)' },
  { name: 'Failure', value: 'var(--alert-red)' },
  { name: 'Data', value: 'var(--cyan-dim)' },
];

const ROLE_HEX: Record<string, string> = {
  'var(--phos-green)': '#39FF7A',
  'var(--amber)': '#FFB000',
  'var(--alert-red)': '#FF5555',
  'var(--cyan-dim)': '#57C7C0',
  'var(--text-dim)': '#5C8A66',
  'var(--text-primary)': '#D3FFDE',
};

function dotHex(v: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return ROLE_HEX[v] ?? '#888888';
}

/** Number input with a prefix/suffix adornment (mock X/Y/W/H/° boxes). */
function AffixField({
  prefix,
  suffix,
  value,
  onCommit,
}: {
  prefix?: string;
  suffix?: string;
  value: number | string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = `es-affix-${prefix ?? 'v'}-${suffix ?? ''}`;
  return (
    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      {prefix && <span style={{ color: 'var(--ed-text-muted)', fontSize: 11 }}>{prefix}</span>}
      <input
        id={id}
        type="number"
        value={draft ?? String(value ?? '')}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== String(value ?? '')) onCommit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        style={{ width: '100%', minWidth: 0 }}
      />
      {suffix && <span style={{ color: 'var(--ed-text-muted)', fontSize: 11 }}>{suffix}</span>}
    </span>
  );
}

const labelStash = new Map<string, string>();

/** Show/hide a text prop (empty string = hidden; previous value restored). */
function LabelToggle({
  comp,
  fieldKey,
  label,
}: {
  comp: SceneComponent;
  fieldKey: string;
  label: string;
}) {
  const props = (comp.props ?? {}) as Record<string, unknown>;
  const cur = String(props[fieldKey] ?? '');
  const on = cur !== '';
  const stashKey = `${comp.id}:${fieldKey}`;
  return (
    <div className="es-row">
      <label>{label}</label>
      <input
        type="text"
        value={cur}
        onChange={(e) => commands.updateComponentProps(comp.id, { [fieldKey]: e.target.value })}
      />
      <button
        className={'es-toggle' + (on ? ' on' : '')}
        role="switch"
        aria-checked={on}
        aria-label={`${label} visible`}
        title={on ? `hide ${label.toLowerCase()}` : `show ${label.toLowerCase()}`}
        onClick={() => {
          if (on) {
            labelStash.set(stashKey, cur);
            commands.updateComponentProps(comp.id, { [fieldKey]: '' });
          } else {
            commands.updateComponentProps(comp.id, {
              [fieldKey]: labelStash.get(stashKey) ?? cur,
            });
          }
        }}
      />
    </div>
  );
}

function labelKeyOf(comp: SceneComponent): string | null {
  const props = (comp.props ?? {}) as Record<string, unknown>;
  return ['label', 'name', 'title', 'text'].find((k) => k in props) ?? null;
}

function LayoutTab({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const comps = s.project.comps;
  const idx = comps.indexOf(comp);
  const scene = s.project.scenes.find((sc) => sc.id === comp.sceneId);
  const box = boxOf(comp);
  const def = REGISTRY[comp.type];
  const category = categoryFor(comp.type) ?? (def?.group ? def.group.charAt(0).toUpperCase() + def.group.slice(1) : 'Custom');
  const accentKey =
    def && (def.fields ?? []).includes('accent') ? 'accent' : 'color';
  const canAccent =
    def && ((def.fields ?? []).includes('accent') || (def.fields ?? []).includes('color'));
  const accentVal = String(((comp.props ?? {}) as Record<string, unknown>)[accentKey] ?? '');
  const accentPreset = ACCENT_PRESETS.find((p) => p.value === accentVal)?.value
    ?? (accentVal ? 'custom' : '');
  const states = comps.filter((x) => isState(x) && x.target === comp.id);
  const later = comps.filter(
    (x, i) => x.id !== comp.id && !isState(x) && i > idx,
  );
  const labelKey = labelKeyOf(comp);
  const subKey = 'sub' in ((comp.props ?? {}) as Record<string, unknown>) ? 'sub' : null;
  const lookOpts = (def?.options as Record<string, string[]> | undefined)?.['look'] ?? null;
  const fields = def?.fields ?? [];
  const hasFillPair = fields.includes('fill') && fields.includes('border');
  return (
    <div>
      <div className="es-group-head"><span className="t">Story</span></div>
      <div className="es-row">
        <span className="es-playicon">▶</span>
        <span>
          <div style={{ fontWeight: 700 }}>{shortSceneName(scene?.name) + ' › Step ' + (idx + 1)}</div>
          <div style={{ fontSize: 11, color: 'var(--ed-text-muted)' }}>
            {compLabel(comp, comps, s.project.edges) || comp.type}
          </div>
        </span>
      </div>
      <div className="es-row">
        <label>Appears</label>
        <select
          aria-label="Appears step"
          value={idx + 1}
          onChange={(e) => commands.moveComponentToStep(comp.id, +e.target.value - 1)}
        >
          {comps.map((_, n) => (
            <option key={n} value={n + 1}>Step {n + 1}</option>
          ))}
        </select>
      </div>
      <div className="es-row">
        <label>Changes</label>
        <select
          aria-label="Changes"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__add__') commands.addStateStep(comp.id);
            else if (v) commands.selectComps([v]);
            e.target.value = '';
          }}
        >
          <option value="">
            {states.length ? `${states.length} change${states.length === 1 ? '' : 's'}` : 'Never'}
          </option>
          {states.map((st) => (
            <option key={st.id} value={st.id}>⚠ {stateSummary(st).slice(0, 28)}</option>
          ))}
          <option value="__add__">＋ Add state change…</option>
        </select>
      </div>
      <div className="es-row">
        <label>Exits</label>
        <select
          aria-label="Exits"
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
              Step {comps.indexOf(o) + 1} · {o.type}
            </option>
          ))}
        </select>
      </div>
      <div className="es-group-head"><span className="t">Arrange</span></div>
      <div className="es-row">
        <button className="es-btn" onClick={() => commands.sendBackward(comp.id)}>⇤ Send backward</button>
        <button className="es-btn" onClick={() => commands.bringForward(comp.id)}>Bring forward ⇥</button>
      </div>
      <div className="es-comp-head">
        <span className="glyph">{glyphFor(comp.type)}</span>
        <span>
          <div>{compLabel(comp, comps, s.project.edges) || comp.type}</div>
          <div className="sub">{category} component</div>
        </span>
      </div>
      <div className="es-row">
        <label>Position</label>
        <AffixField prefix="X" value={Math.round(comp.x ?? 0)} onCommit={(v) => commands.updateComponent(comp.id, { x: +v || 0 })} />
        <AffixField prefix="Y" value={Math.round(comp.y ?? 0)} onCommit={(v) => commands.updateComponent(comp.id, { y: +v || 0 })} />
      </div>
      <div className="es-row">
        <label>Size</label>
        <AffixField prefix="W" value={comp.wpx ?? Math.round(box.r - box.l)} onCommit={(v) => commands.updateComponent(comp.id, { wpx: Math.max(20, +v || 20) })} />
        <AffixField prefix="H" value={comp.hpx ?? Math.round(box.b - box.t)} onCommit={(v) => commands.updateComponent(comp.id, { hpx: Math.max(20, +v || 20) })} />
      </div>
      <div className="es-row">
        <label>Rotation</label>
        <AffixField suffix="°" value={comp.rot ?? 0} onCommit={(v) => commands.updateComponent(comp.id, { rot: +v || 0 })} />
      </div>
      <div className="es-group-head"><span className="t">Appearance</span></div>
      <div className="es-row">
        <label>Style</label>
        {lookOpts ? (
          <select
            value={String(((comp.props ?? {}) as Record<string, unknown>)['look'] ?? lookOpts[0])}
            onChange={(e) => commands.updateComponentProps(comp.id, { look: e.target.value })}
          >
            {lookOpts.map((o) => (
              <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
            ))}
          </select>
        ) : hasFillPair ? (
          <select
            value={((comp.props ?? {}) as Record<string, unknown>)['fill'] ? 'filled' : 'outline'}
            onChange={(e) =>
              commands.updateComponentProps(comp.id,
                e.target.value === 'filled' ? { fill: true, border: false } : { fill: false, border: true })
            }
          >
            <option value="filled">Filled</option>
            <option value="outline">Outline</option>
          </select>
        ) : (
          <select value="filled" disabled title="Style is fixed for this component">
            <option value="filled">Filled</option>
          </select>
        )}
      </div>
      {canAccent && (
        <div className="es-row">
          <label>Color</label>
          <span style={{ color: dotHex(accentVal), fontSize: 14 }}>●</span>
          <select
            value={accentPreset}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'custom' || v === accentVal) return;
              if (!v) {
                const fallback = (def?.props as Record<string, unknown> | undefined)?.[accentKey];
                commands.updateComponentProps(comp.id, { [accentKey]: fallback ?? '' });
              } else {
                commands.updateComponentProps(comp.id, { [accentKey]: v });
              }
            }}
          >
            {ACCENT_PRESETS.map((p) => (
              <option key={p.name} value={p.value}>{p.name}</option>
            ))}
            {accentPreset === 'custom' && <option value="custom">Custom…</option>}
          </select>
        </div>
      )}
      <div className="es-row">
        <label>Stroke</label>
        <span className="es-static">1</span>
        {canAccent ? (
          <>
            <span style={{ color: dotHex(accentVal), fontSize: 14 }}>●</span>
            <input
              type="text"
              value={accentVal}
              onChange={(e) => commands.updateComponentProps(comp.id, { [accentKey]: e.target.value })}
            />
          </>
        ) : (
          <span className="es-static">{accentVal || '—'}</span>
        )}
        <span className="es-static">100%</span>
      </div>
      <OpacityRow comp={comp} />
      {labelKey && <LabelToggle comp={comp} fieldKey={labelKey} label="Label" />}
      {subKey && <LabelToggle comp={comp} fieldKey={subKey} label="Sublabel" />}
      <div className="es-row es-flags-row">
        <span title="clear screen before this step">🧹</span>
        <input
          type="checkbox"
          checked={!!comp.clearBefore}
          onChange={(e) => commands.updateComponent(comp.id, { clearBefore: e.target.checked || undefined } as never)}
        />
        <span style={{ color: 'var(--ed-text-muted)', fontSize: 12 }}>Clear</span>
        <span title="pin through clears" style={{ marginLeft: 12 }}>📌</span>
        <input
          type="checkbox"
          checked={!!comp.pin}
          onChange={(e) => commands.updateComponent(comp.id, { pin: e.target.checked || undefined } as never)}
        />
        <span style={{ color: 'var(--ed-text-muted)', fontSize: 12 }}>Pin</span>
      </div>
      <ExportGroup s={s} comp={comp} />
    </div>
  );
}

function MotionGroup({ comp }: { comp: SceneComponent }) {
  return (
    <>
      <div className="es-group-head"><span className="t">Motion</span></div>
      <div className="es-row">
        <label>Entrance</label>
        <select
          value={comp.anim ?? 'none'}
          onChange={(e) => commands.updateComponent(comp.id, { anim: e.target.value })}
        >
          {MOTION_ANIMS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <Field label="Duration" type="number" value={comp.animDur ?? 0.6} onCommit={(v) => commands.updateComponent(comp.id, { animDur: Math.max(0, +v || 0) })} />
      <Field label="Delay" type="number" value={comp.animDelay ?? 0} onCommit={(v) => commands.updateComponent(comp.id, { animDelay: Math.max(0, +v || 0) })} />
      <Field label="Hold s" type="number" value={comp.seqHold} onCommit={(v) => commands.updateComponent(comp.id, v === '' ? { seqHold: undefined } as never : { seqHold: +v })} />
      <div className="es-row">
        <label>Exit</label>
        <select
          value={comp.out ?? 'none'}
          onChange={(e) => commands.updateComponent(comp.id, { out: e.target.value === 'none' ? undefined : e.target.value } as never)}
        >
          {EXIT_ANIMS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function AppearanceGroup({ comp }: { comp: SceneComponent }) {
  const def = REGISTRY[comp.type];
  const canAccent =
    def && ((def.fields ?? []).includes('accent') || (def.fields ?? []).includes('color'));
  const accentKey =
    def && (def.fields ?? []).includes('accent') ? 'accent' : 'color';
  const accentVal = String(((comp.props ?? {}) as Record<string, unknown>)[accentKey] ?? '');
  return (
    <>
      <div className="es-group-head"><span className="t">Appearance</span></div>
      {canAccent && (
        <div className="es-row">
          <label>Color</label>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(accentVal) ? accentVal : '#888888'}
            onChange={(e) => commands.updateComponentProps(comp.id, { [accentKey]: e.target.value })}
          />
          <input
            type="text"
            value={accentVal}
            onChange={(e) => commands.updateComponentProps(comp.id, { [accentKey]: e.target.value })}
          />
        </div>
      )}
      <OpacityRow comp={comp} />
    </>
  );
}

function StyleTab({ comp }: { comp: SceneComponent }) {
  return (
    <div>
      <AppearanceGroup comp={comp} />
      <MotionGroup comp={comp} />
    </div>
  );
}

function ExportGroup({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const [status, setStatus] = useState('');
  const go = async (label: string, fn: () => Promise<unknown>) => {
    setStatus(label);
    try {
      await fn();
      setStatus('✔ saved');
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : err}`);
    }
  };
  return (
    <div>
      <div className="es-group-head"><span className="t">Export</span></div>
      <div className="es-row">
        <button
          className="es-btn"
          onClick={() =>
            go('rendering PNG…', () =>
              exportFramePNG(requireScene(), { pixelRatio: 2, download: downloadUrl }),
            )
          }
        >
          PNG still
        </button>
        <button
          className="es-btn"
          onClick={() =>
            go('rendering SVG…', () =>
              exportFrameSVG(requireScene(), { download: downloadUrl }),
            )
          }
        >
          SVG still
        </button>
      </div>
      <div className="es-row">
        <button
          className="es-btn"
          onClick={() =>
            go('rendering component…', async () => {
              const el = document.querySelector(`[data-id="${comp.id}"]`) as HTMLElement | null;
              if (!el) throw new Error('component is not on the canvas');
              await exportCompPNG(requireScene(), el, comp, s.project.comps.indexOf(comp), {
                download: downloadUrl,
              });
            })
          }
        >
          Component PNG
        </button>
      </div>
      {status && <p style={{ fontSize: 11 }}>{status}</p>}
      <p style={{ fontSize: 11, color: 'var(--ed-text-muted)' }}>
        Full takes (GIF/WebM) live in the ⤴ Export menu.
      </p>
    </div>
  );
}

/** Properties inspector — three tabs: Content / Style / Layout. */
export function PropertiesInspector() {
  const s = useEditor((st) => st);
  const sel = selectedComps(s);
  const [tab, setTab] = useState<'content' | 'style' | 'layout'>('content');

  if (!sel.length) {
    return (
      <div>
        <h2>Properties</h2>
        <div className="es-row"><label>Steps</label><span>{s.project.comps.length}</span></div>
        <Field label="W" type="number" value={s.project.scene.w} onCommit={(v) => commands.setCanvasSize(+v || 1920, s.project.scene.h)} />
        <Field label="H" type="number" value={s.project.scene.h} onCommit={(v) => commands.setCanvasSize(s.project.scene.w, +v || 1080)} />
        <p style={{ color: 'var(--ed-text-muted)', fontSize: 12 }}>
          Select a component on the canvas or in the Story strip to edit it.
        </p>
      </div>
    );
  }

  if (sel.length > 1) {
    return (
      <div>
        <h2>Properties</h2>
        <p>{sel.length} selected</p>
        <div className="es-row">
          <button className="es-btn" onClick={() => commands.duplicateSelection()}>⧉ Duplicate</button>
          <button className="es-btn" onClick={() => commands.deleteSelection()}>🗑 Delete</button>
        </div>
        <RunSection s={s} comp={sel[0]} />
      </div>
    );
  }

  const c = sel[0];

  if (isState(c)) {
    return (
      <div>
        <StateStepEditor s={s} comp={c} />
        <div className="es-row">
          <button className="es-btn" onClick={() => commands.deleteSelection()}>🗑 Delete step</button>
        </div>
      </div>
    );
  }

  const def = REGISTRY[c.type];
  const props = (c.props ?? {}) as Record<string, unknown>;
  const fts = (def?.fieldTypes ?? {}) as Record<string, string>;
  const opts = (def?.options ?? {}) as Record<string, string[]>;

  return (
    <div>
      <h2>Properties</h2>
      <div className="es-tabs">
        {(['content', 'style', 'layout'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'layout' && <LayoutTab s={s} comp={c} />}
      {tab === 'style' && <StyleTab comp={c} />}
      {tab === 'content' && (
        <div>
          {(def?.fields ?? []).map((f) => {
            const t = fts[f];
            const v = props[f];
            if (t === 'check') {
              return (
                <div className="es-row" key={f}>
                  <label>{f}</label>
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={(e) => commands.updateComponentProps(c.id, { [f]: e.target.checked })}
                  />
                </div>
              );
            }
            if (t === 'select' && opts[f]) {
              return (
                <div className="es-row" key={f}>
                  <label>{f}</label>
                  <select
                    value={String(v ?? '')}
                    onChange={(e) => commands.updateComponentProps(c.id, { [f]: e.target.value })}
                  >
                    {opts[f].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              );
            }
            if (t === 'textarea' || t === 'code') {
              return (
                <PropArea key={`${c.id}-${f}`} label={f} value={String(v ?? '')} onCommit={(nv) => commands.updateComponentProps(c.id, { [f]: nv })} />
              );
            }
            if (t === 'number') {
              return <Field key={f} label={f} type="number" value={v as number} onCommit={(nv) => commands.updateComponentProps(c.id, { [f]: +nv })} />;
            }
            return <Field key={f} label={f} value={v as string} onCommit={(nv) => commands.updateComponentProps(c.id, { [f]: nv })} />;
          })}
          <div className="es-row">
            <button className="es-btn" onClick={() => commands.duplicateSelection()}>⧉</button>
            <button className="es-btn" onClick={() => commands.deleteSelection()}>🗑</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PropArea({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = `es-f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="es-row">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== value) onCommit(draft);
          setDraft(null);
        }}
      />
    </div>
  );
}
