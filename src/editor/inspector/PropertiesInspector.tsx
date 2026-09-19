import { useEffect, useId, useRef, useState } from 'react';
import { REGISTRY } from '../../catalog/registry.js';
import { isState, stateSummary } from '../../renderer/stateChanges.js';
import { commands } from '../../store/commands.js';
import { selectedComps } from '../../store/selectors.js';
import type { EditorStore } from '../../store/editorStore.js';
import type { SceneComponent } from '../../domain/component.js';
import type { Edge } from '../../domain/edge.js';
import { useEditor } from '../storeHooks.js';
import { compLabel } from '../labels.js';
import { CURATED_CATALOG, categoryFor, shortSceneName } from '../library/catalog.js';
import { boxOf } from '../canvas/snapping.js';
import { RunSection, StateStepEditor } from './StorySections.js';
import './properties.css';
import {
  downloadUrl,
  exportCompPNG,
} from '../../export/stills.js';
import { requireScene } from '../../export/raster.js';

/**
 * Properties inspector — three tabs matching the approved mock:
 * Content (text + story + entrance + copy-as + duplicate/delete),
 * Style (typography + text color + background + effects + opacity + reset),
 * Layout (position + size + rotation + align + arrange + constraints + lock).
 * Each tab renders ONLY its mock section — no cross-tab duplicates.
 */

const ENTRANCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'type', label: 'Typewriter' },
  { value: 'pa-fade', label: 'Fade in' },
  { value: 'pa-left', label: 'Slide in · left' },
  { value: 'pa-right', label: 'Slide in · right' },
  { value: 'pa-up', label: 'Slide in · up' },
  { value: 'pa-down', label: 'Slide in · down' },
  { value: 'pa-zoom', label: 'Zoom in' },
  { value: 'pa-zoomout', label: 'Zoom out' },
  { value: 'pa-glitchin', label: 'Glitch in' },
];
const EXIT_ANIMS = ['none', 'fade', 'rise', 'fall', 'zoom'];

const FONT_OPTIONS = ['Inter', 'VT323', 'JetBrains Mono', 'Caveat', 'System'];
const WEIGHT_OPTIONS = ['Regular', 'Medium', 'Bold'];
const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left', glyph: '☰' },
  { value: 'center', label: 'Center', glyph: '☷' },
  { value: 'right', label: 'Right', glyph: '☰' },
];

/**
 * Live-edit gesture: opens one undo transaction on the first change and
 * commits it on blur/unmount, so typing repaints the canvas immediately
 * while the whole edit collapses into a single undo step.
 */
function useLiveGesture() {
  const dirty = useRef(false);
  useEffect(
    () => () => {
      if (dirty.current) {
        dirty.current = false;
        commands.commitTransaction();
      }
    },
    [],
  );
  return {
    begin: () => {
      if (!dirty.current) {
        dirty.current = true;
        commands.beginTransaction();
      }
    },
    end: () => {
      if (dirty.current) {
        dirty.current = false;
        commands.commitTransaction();
      }
    },
  };
}

/** Live text/number field — commits on every keystroke (one undo step). */
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
  const gesture = useLiveGesture();
  const id = `es-f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="es-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={draft ?? String(value ?? '')}
        onChange={(e) => {
          gesture.begin();
          setDraft(e.target.value);
          onCommit(e.target.value);
        }}
        onBlur={() => {
          gesture.end();
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="es-properties__section">
      <h3 className="es-properties__section-title">{title}</h3>
      {children}
    </section>
  );
}

function CompHeader({ comp }: { comp: SceneComponent }) {
  const def = REGISTRY[comp.type];
  const category =
    categoryFor(comp.type) ??
    (def?.group ? def.group.charAt(0).toUpperCase() + def.group.slice(1) : 'Custom');
  const title = def?.name || comp.type;
  return (
    <div className="es-properties__component">
      <span className="es-properties__component-icon" aria-hidden>{glyphFor(comp.type)}</span>
      <span>
        <div className="es-properties__component-name">{title}</div>
        <div className="es-properties__component-type">{category} component</div>
      </span>
    </div>
  );
}

function OpacityRow({ comp }: { comp: SceneComponent }) {
  const gesture = useLiveGesture();
  const shown = Math.round((comp.opacity ?? 1) * 100);
  return (
    <div className="es-row">
      <input
        type="range"
        aria-label="Opacity"
        className="es-range"
        min={0}
        max={100}
        value={shown}
        onChange={(e) => {
          gesture.begin();
          commands.updateComponent(comp.id, { opacity: +e.target.value / 100 });
        }}
        onPointerUp={gesture.end}
        onBlur={gesture.end}
      />
      <span style={{ minWidth: 48, textAlign: 'right' }}>{shown}%</span>
    </div>
  );
}

/** Number input with a prefix/suffix adornment (mock X/Y/W/H/° boxes). */
function AffixField({
  prefix,
  suffix,
  value,
  onCommit,
  ariaLabel,
}: {
  prefix?: string;
  suffix?: string;
  value: number | string;
  onCommit: (v: string) => void;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const gesture = useLiveGesture();
  const uid = useId().replace(/\W+/g, '');
  const id = `es-affix-${ariaLabel ?? prefix ?? 'v'}-${suffix ?? ''}-${uid}`;
  return (
    <span className="es-affix" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      {prefix && <span className="es-static">{prefix}</span>}
      <input
        id={id}
        aria-label={ariaLabel ?? prefix ?? 'value'}
        type="number"
        value={draft ?? String(value ?? '')}
        onChange={(e) => {
          gesture.begin();
          setDraft(e.target.value);
          onCommit(e.target.value);
        }}
        onBlur={() => {
          gesture.end();
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        style={{ width: '100%', minWidth: 0 }}
      />
      {suffix && <span className="es-static">{suffix}</span>}
    </span>
  );
}

/* ---------------- Content tab ---------------- */

function StoryGroup({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const comps = s.project.comps;
  const idx = comps.indexOf(comp);
  const scene = s.project.scenes.find((sc) => sc.id === comp.sceneId);
  const states = comps.filter((x) => isState(x) && x.target === comp.id);
  const later = comps.filter(
    (x, i) => x.id !== comp.id && !isState(x) && i > idx,
  );
  return (
    <Section title="Story">
      <div className="es-properties__story">
        <div className="es-row" style={{ marginBottom: 0 }}>
          <span className="es-playicon" aria-hidden>▶</span>
          <span>
            <div className="es-properties__story-title">{shortSceneName(scene?.name) + ' › Step ' + (idx + 1)}</div>
            <div style={{ fontSize: 11, color: 'var(--prop-muted)' }}>
              {compLabel(comp, comps, s.project.edges) || comp.type}
            </div>
          </span>
        </div>
        <div className="es-properties__story-body">
        <div className="es-row" style={{ marginBottom: 0 }}>
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
        <div className="es-row" style={{ marginBottom: 0 }}>
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
        <div className="es-row" style={{ marginBottom: 0 }}>
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
        </div>
      </div>
    </Section>
  );
}

function EntranceGroup({ comp }: { comp: SceneComponent }) {
  const gesture = useLiveGesture();
  return (
    <Section title="Entrance">
      <div className="es-row">
        <select
          aria-label="Entrance"
          value={comp.anim ?? 'none'}
          onChange={(e) => commands.updateComponent(comp.id, { anim: e.target.value })}
          style={{ flex: 2 }}
        >
          {ENTRANCE_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            aria-label="Entrance duration"
            type="number"
            min={0}
            step={0.1}
            value={comp.animDur ?? 0.4}
            onChange={(e) => {
              gesture.begin();
              commands.updateComponent(comp.id, { animDur: Math.max(0, +e.target.value || 0) });
            }}
            onBlur={gesture.end}
            style={{ width: '100%', minWidth: 0 }}
          />
          <span className="es-static">s</span>
        </span>
      </div>
      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--prop-accent)', fontSize: 12 }}>
          Advanced timing
        </summary>
        <div style={{ marginTop: 8 }}>
          <Field label="Delay" type="number" value={comp.animDelay ?? 0} onCommit={(v) => commands.updateComponent(comp.id, { animDelay: Math.max(0, +v || 0) })} />
          <Field label="Hold s" type="number" value={comp.seqHold} onCommit={(v) => commands.updateComponent(comp.id, v === '' ? { seqHold: undefined } as never : { seqHold: +v })} />
          <div className="es-row">
            <label>Exit</label>
            <select
              aria-label="Exit animation"
              value={comp.out ?? 'none'}
              onChange={(e) => commands.updateComponent(comp.id, { out: e.target.value === 'none' ? undefined : e.target.value } as never)}
            >
              {EXIT_ANIMS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </details>
    </Section>
  );
}

function CopyAsGroup({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const [status, setStatus] = useState('');
  const exportPNG = async () => {
    setStatus('rendering PNG…');
    try {
      const el = document.querySelector(`[data-id="${comp.id}"]`) as HTMLElement | null;
      if (!el) throw new Error('component is not on the canvas');
      await exportCompPNG(requireScene(), el, comp, s.project.comps.indexOf(comp), {
        download: downloadUrl,
      });
      setStatus('✔ saved');
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : err}`);
    }
  };
  return (
    <Section title="Copy as">
      <div className="es-properties__copy-grid">
        <button className="es-properties__copy-card" onClick={exportPNG} title="Export this component as a PNG image">
          <span className="es-properties__copy-icon" aria-hidden>🖼</span>
          <span className="es-properties__copy-name">PNG</span>
          <span className="es-properties__copy-subtitle">Component image</span>
        </button>
        <button
          className="es-properties__copy-card"
          title="Video captures the whole scene — use the Export menu for GIF/WebM"
          onClick={() => setStatus('Video captures the full scene — use ⤴ Export for GIF/WebM.')}
        >
          <span className="es-properties__copy-icon" aria-hidden>▶</span>
          <span className="es-properties__copy-name">Video</span>
          <span className="es-properties__copy-subtitle">Scene only</span>
        </button>
      </div>
      {status && <p style={{ fontSize: 11 }}>{status}</p>}
    </Section>
  );
}

function ContentTab({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const def = REGISTRY[comp.type];
  const props = (comp.props ?? {}) as Record<string, unknown>;
  const fts = (def?.fieldTypes ?? {}) as Record<string, string>;
  const opts = (def?.options ?? {}) as Record<string, string[]>;
  return (
    <div>
      <CompHeader comp={comp} />
      <Section title="Text">
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
                  onChange={(e) => commands.updateComponentProps(comp.id, { [f]: e.target.checked })}
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
                  onChange={(e) => commands.updateComponentProps(comp.id, { [f]: e.target.value })}
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
              <PropArea key={`${comp.id}-${f}`} label={f} value={String(v ?? '')} onCommit={(nv) => commands.updateComponentProps(comp.id, { [f]: nv })} />
            );
          }
          if (t === 'number') {
            return <Field key={f} label={f} type="number" value={v as number} onCommit={(nv) => commands.updateComponentProps(comp.id, { [f]: +nv })} />;
          }
          return <Field key={f} label={f} value={v as string} onCommit={(nv) => commands.updateComponentProps(comp.id, { [f]: nv })} />;
        })}
      </Section>
      <StoryGroup s={s} comp={comp} />
      <EntranceGroup comp={comp} />
      <CopyAsGroup s={s} comp={comp} />
      <div className="es-properties__actions">
        <button className="es-btn" onClick={() => commands.duplicateSelection()}>
          ⧉ Duplicate
        </button>
        <button
          className="es-btn es-properties__delete"
          onClick={() => commands.deleteSelection()}
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

/* ---------------- Style tab ---------------- */

const STYLE_KEYS = [
  'font', 'weight', 'fontSize', 'align', 'lineHeight', 'letterSpacing',
  'bgEnabled', 'bg', 'shadowEnabled', 'blur', 'color',
] as const;

function StyleTab({ comp }: { comp: SceneComponent }) {
  const def = REGISTRY[comp.type];
  const props = (comp.props ?? {}) as Record<string, unknown>;
  // Text color is the renderer's tint channel (--ca/--cc/--ct), the same
  // hook the legacy builder exposed as "tint".
  const hasAccent = !!(def && (def.fields ?? []).includes('accent'));
  const accentVal = String(props['color'] ?? '');
  const font = String(props['font'] ?? 'Inter');
  const weight = String(props['weight'] ?? 'Bold');
  const size = (props['fontSize'] as number | undefined) ?? 56;
  const align = String(props['align'] ?? 'left');
  const lineHeight = (props['lineHeight'] as number | undefined) ?? 1.2;
  const letterSpacing = (props['letterSpacing'] as number | undefined) ?? 0;
  const bgOn = !!props['bgEnabled'];
  const shadowOn = !!props['shadowEnabled'];
  const blur = (props['blur'] as number | undefined) ?? 0;

  const setStyle = (patch: Record<string, unknown>) =>
    commands.updateComponentProps(comp.id, patch);

  const resetStyle = () => {
    const fallback = (def?.props as Record<string, unknown> | undefined)?.[
      hasAccent ? 'accent' : 'color'
    ];
    const next: Record<string, unknown> = {};
    for (const k of STYLE_KEYS) next[k] = undefined;
    // clearing via explicit defaults (undefined props fall back to renderer defaults)
    commands.updateComponentProps(comp.id, {
      ...next,
      ...(fallback !== undefined
        ? { [hasAccent ? 'accent' : 'color']: fallback }
        : {}),
    });
    commands.updateComponent(comp.id, { opacity: 1 });
  };

  return (
    <div>
      <CompHeader comp={comp} />
      <Section title="Typography">
        <div className="es-row">
          <label>Font</label>
          <select aria-label="Font" value={font} onChange={(e) => setStyle({ font: e.target.value })}>
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="es-row">
          <label>Weight</label>
          <select aria-label="Weight" value={weight} onChange={(e) => setStyle({ weight: e.target.value })}>
            {WEIGHT_OPTIONS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
        <div className="es-row">
          <label>Size</label>
          <AffixField ariaLabel="Size" suffix="px" value={size} onCommit={(v) => setStyle({ fontSize: Math.max(1, +v || 1) })} />
        </div>
        <div className="es-row">
          <label>Alignment</label>
          <div role="group" aria-label="Alignment">
            {ALIGN_OPTIONS.map((a) => (
              <button
                key={a.value}
                className="es-btn"
                aria-pressed={align === a.value}
                aria-label={`Align ${a.label}`}
                title={a.label}
                onClick={() => setStyle({ align: a.value })}
              >
                {a.glyph}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Line height"
          type="number"
          value={lineHeight}
          onCommit={(v) => setStyle({ lineHeight: +v || 0 })}
        />
        <div className="es-row">
          <label>Letter spacing</label>
          <AffixField ariaLabel="Letter spacing" suffix="px" value={letterSpacing} onCommit={(v) => setStyle({ letterSpacing: +v || 0 })} />
        </div>
      </Section>
      <Section title="Text color">
        <div className="es-row">
          <input
            aria-label="Text color"
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(accentVal) ? accentVal : '#0F172A'}
            onChange={(e) => setStyle({ color: e.target.value })}
            style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'none' }}
          />
          <input
            aria-label="Text color hex"
            type="text"
            value={accentVal}
            onChange={(e) => setStyle({ color: e.target.value })}
            style={{ flex: 1 }}
          />
          <span className="es-static">100%</span>
        </div>
      </Section>
      <Section title="Background">
        <div className="es-row">
          <label>Background</label>
          <span style={{ flex: 1 }} />
          <button
            className={'es-toggle' + (bgOn ? ' on' : '')}
            role="switch"
            aria-checked={bgOn}
            aria-label="Background enabled"
            onClick={() => setStyle({ bgEnabled: !bgOn })}
          />
        </div>
        <div className="es-row">
          <input
            aria-label="Background color"
            type="text"
            value={bgOn ? String(props['bg'] ?? '') : 'None'}
            disabled={!bgOn}
            placeholder="None"
            onChange={(e) => setStyle({ bg: e.target.value })}
          />
        </div>
      </Section>
      <Section title="Effects">
        <div className="es-row">
          <label>Shadow</label>
          <span style={{ flex: 1 }} />
          <button
            className={'es-toggle' + (shadowOn ? ' on' : '')}
            role="switch"
            aria-checked={shadowOn}
            aria-label="Shadow enabled"
            onClick={() => setStyle({ shadowEnabled: !shadowOn })}
          />
        </div>
        <div className="es-row">
          <label>Blur</label>
          <AffixField ariaLabel="Blur" suffix="px" value={blur} onCommit={(v) => setStyle({ blur: Math.max(0, +v || 0) })} />
        </div>
      </Section>
      <Section title="Opacity">
        <OpacityRow comp={comp} />
      </Section>
      <button className="es-btn" style={{ width: '100%' }} onClick={resetStyle}>
        ⟳ Reset style
      </button>
    </div>
  );
}

/* ---------------- Layout tab ---------------- */

function LayoutTab({ s, comp }: { s: EditorStore; comp: SceneComponent }) {
  const box = boxOf(comp);
  const props = (comp.props ?? {}) as Record<string, unknown>;
  const hConstraint = String(props['hConstraint'] ?? 'Left');
  const vConstraint = String(props['vConstraint'] ?? 'Top');
  const [linked, setLinked] = useState(false);
  const w = comp.wpx ?? Math.round(box.r - box.l);
  const h = comp.hpx ?? Math.round(box.b - box.t);

  const setSize = (nw?: number, nh?: number) => {
    let fw = nw ?? w;
    let fh = nh ?? h;
    if (linked && w > 0 && h > 0) {
      if (nw !== undefined && nh === undefined) fh = Math.round((nw / w) * h);
      if (nh !== undefined && nw === undefined) fw = Math.round((nh / h) * w);
    }
    commands.updateComponent(comp.id, {
      wpx: Math.max(20, fw),
      hpx: Math.max(20, fh),
    });
  };

  const alignToCanvas = (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const sw = s.project.scene.w;
    const sh = s.project.scene.h;
    const bw = box.r - box.l;
    const bh = box.b - box.t;
    if (mode === 'left') commands.updateComponent(comp.id, { x: 0 });
    if (mode === 'right') commands.updateComponent(comp.id, { x: sw - bw });
    if (mode === 'centerH') commands.updateComponent(comp.id, { x: Math.round((sw - bw) / 2) });
    if (mode === 'top') commands.updateComponent(comp.id, { y: 0 });
    if (mode === 'bottom') commands.updateComponent(comp.id, { y: sh - bh });
    if (mode === 'centerV') commands.updateComponent(comp.id, { y: Math.round((sh - bh) / 2) });
  };

  const arrangeBtn: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 4px',
    fontSize: 11,
  };

  return (
    <div>
      <CompHeader comp={comp} />
      <Section title="Position">
        <div className="es-row es-layout-pair-row">
          <label className="es-layout-inline-label">X</label>
          <AffixField ariaLabel="X" suffix="px" value={Math.round(comp.x ?? 0)} onCommit={(v) => commands.updateComponent(comp.id, { x: +v || 0 })} />
          <label className="es-layout-inline-label">Y</label>
          <AffixField ariaLabel="Y" suffix="px" value={Math.round(comp.y ?? 0)} onCommit={(v) => commands.updateComponent(comp.id, { y: +v || 0 })} />
        </div>
      </Section>
      <Section title="Size">
        <div className="es-row es-layout-pair-row es-size-row">
          <label className="es-layout-inline-label">W</label>
          <AffixField ariaLabel="W" suffix="px" value={w} onCommit={(v) => setSize(Math.max(20, +v || 20), undefined)} />
          <label className="es-layout-inline-label">H</label>
          <AffixField ariaLabel="H" suffix="px" value={h} onCommit={(v) => setSize(undefined, Math.max(20, +v || 20))} />
          <button
            className="es-btn primary"
            aria-pressed={linked}
            aria-label="Link width and height"
            title="Link width and height"
            onClick={() => setLinked(!linked)}
            style={{ opacity: linked ? 1 : 0.6 }}
          >
            🔗
          </button>
        </div>
      </Section>
      <Section title="Rotation">
        <div className="es-row">
          <AffixField ariaLabel="Rotation" suffix="°" value={comp.rot ?? 0} onCommit={(v) => commands.updateComponent(comp.id, { rot: +v || 0 })} />
        </div>
      </Section>
      <Section title="Align to canvas">
        <div className="es-icon-grid">
          {(
            [
              { m: 'left', icon: '⇤', label: 'Align left' },
              { m: 'centerH', icon: '⇔', label: 'Center horizontally' },
              { m: 'right', icon: '⇥', label: 'Align right' },
              { m: 'top', icon: '⤒', label: 'Align top' },
              { m: 'centerV', icon: '⇕', label: 'Center vertically' },
              { m: 'bottom', icon: '⤓', label: 'Align bottom' },
            ] as const
          ).map((b) => (
            <button key={b.m} className="es-btn" aria-label={b.label} title={b.label} onClick={() => alignToCanvas(b.m)}>
              {b.icon}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Arrange">
        <div className="es-arrange-grid">
          <button className="es-btn" style={arrangeBtn} onClick={() => commands.bringForward(comp.id)}>
            <span aria-hidden>⤒</span>Bring to front
          </button>
          <button className="es-btn" style={arrangeBtn} onClick={() => commands.bringForward(comp.id)}>
            <span aria-hidden>↑</span>Bring forward
          </button>
          <button className="es-btn" style={arrangeBtn} onClick={() => commands.sendBackward(comp.id)}>
            <span aria-hidden>↓</span>Send backward
          </button>
          <button className="es-btn" style={arrangeBtn} onClick={() => commands.sendBackward(comp.id)}>
            <span aria-hidden>⤓</span>Send to back
          </button>
        </div>
      </Section>
      <Section title="Constraints">
        <div className="es-row es-layout-pair-row es-constraint-row">
          <label className="es-layout-inline-label">Horizontal</label>
          <select
            aria-label="Horizontal constraint"
            value={hConstraint}
            onChange={(e) => commands.updateComponentProps(comp.id, { hConstraint: e.target.value })}
          >
            {['Left', 'Center', 'Right', 'Stretch'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <label className="es-layout-inline-label">Vertical</label>
          <select
            aria-label="Vertical constraint"
            value={vConstraint}
            onChange={(e) => commands.updateComponentProps(comp.id, { vConstraint: e.target.value })}
          >
            {['Top', 'Middle', 'Bottom', 'Stretch'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </Section>
      <Section title="Lock">
        <div className="es-row">
          <label>Lock</label>
          <span style={{ flex: 1 }} />
          <button
            className={'es-toggle' + (comp.locked ? ' on' : '')}
            role="switch"
            aria-checked={!!comp.locked}
            aria-label="Lock component"
            onClick={() => commands.updateComponent(comp.id, { locked: !comp.locked } as never)}
          />
        </div>
      </Section>
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
      <div className="es-properties">
        <h2 className="es-properties__header">Properties</h2>
        <div className="es-row"><label>Steps</label><span>{s.project.comps.length}</span></div>
        <Field label="W" type="number" value={s.project.scene.w} onCommit={(v) => commands.setCanvasSize(+v || 1920, s.project.scene.h)} />
        <Field label="H" type="number" value={s.project.scene.h} onCommit={(v) => commands.setCanvasSize(s.project.scene.w, +v || 1080)} />
        <p style={{ color: 'var(--prop-muted)', fontSize: 12 }}>
          Select a component on the canvas or in the Story strip to edit it.
        </p>
      </div>
    );
  }

  if (sel.length > 1) {
    return (
      <div className="es-properties">
        <h2 className="es-properties__header">Properties</h2>
        <p>{sel.length} selected</p>
        <div className="es-row">
          <button className="es-btn" onClick={() => commands.duplicateSelection()}>⧉ Duplicate</button>
          <button className="es-btn" onClick={() => commands.deleteSelection()}>🗑 Delete</button>
        </div>
        <RunSection s={s} comp={sel[0]} />
      </div>
    );
  }

  const edgeId = s.selection.edgeId;
  if (edgeId) {
    const edge = s.project.edges.find((e) => e.id === edgeId);
    if (edge) return <EdgeTab s={s} edge={edge} />;
  }

  const c = sel[0];

  if (isState(c)) {
    return (
      <div className="es-properties">
        <StateStepEditor s={s} comp={c} />
        <div className="es-row">
          <button className="es-btn" onClick={() => commands.deleteSelection()}>🗑 Delete step</button>
        </div>
      </div>
    );
  }

  return (
    <div className="es-properties">
      <h2 className="es-properties__header">Properties</h2>
      <div className="es-tabs es-properties__tabs">
        {(['content', 'style', 'layout'] as const).map((t) => (
          <button
            key={t}
            className={'es-properties__tab' + (tab === t ? ' is-active' : '')}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'content' && <ContentTab s={s} comp={c} />}
      {tab === 'style' && <StyleTab comp={c} />}
      {tab === 'layout' && <LayoutTab s={s} comp={c} />}
    </div>
  );
}

/* ---------------- Edge tab (wire inspector) ---------------- */

const EDGE_PRESETS: [string, string][] = [
  ['none', 'None'],
  ['https', 'HTTPS'],
  ['grpc', 'gRPC'],
  ['sql', 'SQL'],
  ['event', 'Event'],
  ['success', 'Success'],
  ['error', 'Error'],
];

function EdgeTab({ s, edge }: { s: EditorStore; edge: Edge }) {
  const comps = s.project.comps;
  const label = (id: string) => comps.find((c) => c.id === id)?.type ?? id;
  const set = (patch: Partial<Edge>) => commands.updateEdge(edge.id, patch);
  const on = edge.animate !== false;
  return (
    <div className="es-properties">
      <h2 className="es-properties__header">Wire</h2>
      <p style={{ color: 'var(--prop-muted)', fontSize: 12, marginTop: 0 }}>
        {label(edge.from)} → {edge.to ? label(edge.to) : '?'}
      </p>
      <Section title="Label">
        <Field
          label="Text"
          value={edge.label ?? ''}
          onCommit={(v) => set({ label: v })}
        />
        <Field
          label="Caption"
          value={edge.caption ?? ''}
          onCommit={(v) => set({ caption: v })}
        />
      </Section>
      <Section title="Style">
        <div className="es-row">
          <label>Preset</label>
          <select
            aria-label="Preset"
            value={edge.preset ?? 'none'}
            onChange={(e) => set({ preset: e.target.value })}
          >
            {EDGE_PRESETS.map(([v, n]) => (
              <option key={v} value={v}>{n}</option>
            ))}
          </select>
        </div>
        <div className="es-row">
          <label>Routing</label>
          <select
            aria-label="Routing"
            value={edge.routing ?? 'smooth'}
            onChange={(e) => set({ routing: e.target.value })}
          >
            {['smooth', 'step', 'straight', 'curved'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="es-row">
          <label>Branch</label>
          <select
            aria-label="Branch"
            value={edge.branch ?? 'none'}
            onChange={(e) => set({ branch: e.target.value })}
          >
            {['none', 'success', 'error'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="es-row">
          <label>Direction</label>
          <select
            aria-label="Direction"
            value={edge.dir ?? 'fwd'}
            onChange={(e) => set({ dir: e.target.value })}
          >
            {['fwd', 'both', 'bwd'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <Field
          label="Weight"
          type="number"
          value={edge.weight ?? 2}
          onCommit={(v) => set({ weight: Math.max(1, Math.min(5, +v || 2)) })}
        />
        <div className="es-row">
          <label>Animate</label>
          <span style={{ flex: 1 }} />
          <button
            className={'es-toggle' + (on ? ' on' : '')}
            role="switch"
            aria-checked={on}
            aria-label="Animate wire"
            onClick={() => set({ animate: !on })}
          />
        </div>
      </Section>
      <div className="es-properties__actions" style={{ gridTemplateColumns: '1fr' }}>
        <button
          className="es-btn es-properties__delete"
          onClick={() => commands.deleteEdge(edge.id)}
        >
          🗑 Delete wire
        </button>
      </div>
    </div>
  );
}

function PropArea({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const gesture = useLiveGesture();
  const id = `es-f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="es-row">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={draft ?? value}
        onChange={(e) => {
          gesture.begin();
          setDraft(e.target.value);
          onCommit(e.target.value);
        }}
        onBlur={() => {
          gesture.end();
          setDraft(null);
        }}
      />
    </div>
  );
}
