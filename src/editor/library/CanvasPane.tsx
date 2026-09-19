import { useState } from 'react';
import { commands } from '../../store/commands.js';
import { useEditor } from '../storeHooks.js';
import { CANVAS_THEMES, themeSwatch } from '../canvasTheme.js';
import {
  DEFAULT_BACKGROUND,
  GRADIENT_PRESETS,
  MESH_PRESETS,
  NEUTRAL_COLORS,
  SHADER_PRESETS,
  SYSTEM_COLORS,
  gradientStops,
  meshPreview,
  type Background,
} from '../../domain/background.js';

/**
 * Canvas settings — the first thing you set, so it lives first in the rail.
 * Size presets, a live theme gallery, and the backdrop editor.
 *
 * Every preview is painted from the SAME values the recorder uses: theme
 * chips read the theme's own role values (generated from themes/*.css), and
 * background chips run the same compiler as #scene. No parallel palette.
 */

const SIZE_PRESETS: { key: string; label: string; sub: string; w: number; h: number }[] = [
  { key: 'landscape', label: 'Landscape', sub: '16:9 · YouTube', w: 1920, h: 1080 },
  { key: 'portrait', label: 'Portrait', sub: '9:16 · Shorts', w: 1080, h: 1920 },
  { key: 'square', label: 'Square', sub: '1:1 · Feed', w: 1080, h: 1080 },
  { key: 'thumb', label: 'Thumbnail', sub: '16:9 · 720p', w: 1280, h: 720 },
];

/** A miniature of the real theme, painted from its own role values. */
function ThemeChip({
  themeKey,
  label,
  active,
  onClick,
}: {
  themeKey: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const t = themeSwatch(themeKey);
  return (
    <button
      type="button"
      className={'es-bg-chip es-theme-chip' + (active ? ' is-active' : '')}
      data-theme-chip={themeKey}
      title={label}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="es-bg-chip-preview es-theme-preview" style={t.preview}>
        {/* the theme's own display + body faces, so type is part of the pick */}
        <span
          className="es-theme-ink"
          style={{ color: t['--text-primary'], fontFamily: t['--font-display'] }}
        >
          Aa
        </span>
        <span
          className="es-theme-body"
          style={{ color: t['--text-dim'], fontFamily: t['--font-body'] }}
        >
          aA
        </span>
        <span className="es-theme-dots">
          <i style={{ background: t['--phos-green'] }} />
          <i style={{ background: t['--amber'] }} />
          <i style={{ background: t['--cyan-dim'] }} />
        </span>
      </span>
      <span className="es-bg-chip-label">{label}</span>
    </button>
  );
}

/**
 * iOS segmented control — one choice among closely related options.
 * Text-only labels, title case, equal widths (HIG › Segmented controls).
 */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="es-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const normHex = (v: string | undefined) => (v || '').toUpperCase();

/** A circular colour well, iOS swatch style. */
function Swatch({
  name,
  value,
  active,
  onPick,
}: {
  name: string;
  value: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={'es-swatch' + (active ? ' is-active' : '')}
      style={{ background: value }}
      title={name}
      aria-label={name}
      aria-pressed={active}
      onClick={onPick}
    />
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="es-row">
      <label>{label}</label>
      <input
        type="color"
        aria-label={label}
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 40, height: 32, padding: 0, border: 'none', background: 'none', flex: 'none' }}
      />
      <input
        type="text"
        aria-label={`${label} hex`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

/** The exact ramp backgroundCss compiles — previews can't drift. */
function rampPreview(stops: string[], angle: number): React.CSSProperties {
  const ramp = stops
    .map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 100)}%`)
    .join(', ');
  return { backgroundImage: `linear-gradient(${angle}deg, ${ramp})` };
}

/** Background family. Mesh lives under Gradient (it is one), per Screen Movie. */
const BG_KINDS = [
  { value: 'theme' as const, label: 'Theme' },
  { value: 'solid' as const, label: 'Color' },
  { value: 'gradient' as const, label: 'Gradient' },
  { value: 'shader' as const, label: 'Shader' },
];

export function CanvasPane() {
  const scene = useEditor((s) => s.project.scene);
  const theme = useEditor((s) => s.project.theme) ?? 'studio-black';
  const background = useEditor((s) => s.project.background) ?? DEFAULT_BACKGROUND;
  const [customW, setCustomW] = useState(String(scene.w));
  const [customH, setCustomH] = useState(String(scene.h));

  const bg = background;
  const setBg = (patch: Partial<Background>) =>
    commands.setCanvasBackground({ ...bg, ...patch });
  const setKind = (kind: Background['kind']) =>
    commands.setCanvasBackground({ ...bg, kind });
  // Mesh reports as Gradient in the control (it is a gradient style).
  const family = bg.kind === 'mesh' ? 'gradient' : bg.kind;

  const activePreset = SIZE_PRESETS.find((p) => p.w === scene.w && p.h === scene.h);
  const ratio = (scene.w / scene.h).toFixed(2);

  return (
    <div className="es-canvas-pane">
      {/* ---- size ---- */}
      <div className="es-group-head"><span className="t">Canvas size</span></div>
      <div className="es-size-readout es-readout">
        {scene.w} × {scene.h}
        <span className="es-size-ratio">{ratio}:1</span>
      </div>
      <div className="es-bg-grid es-size-grid">
        {SIZE_PRESETS.map((p) => {
          const on = activePreset?.key === p.key;
          return (
            <button
              key={p.key}
              type="button"
              className={'es-bg-chip es-size-chip' + (on ? ' is-active' : '')}
              aria-pressed={on}
              title={`${p.w} × ${p.h}`}
              onClick={() => {
                commands.setCanvasSize(p.w, p.h);
                setCustomW(String(p.w));
                setCustomH(String(p.h));
              }}
            >
              <span
                className={'es-size-glyph' + (p.w > p.h ? ' landscape' : p.h > p.w ? ' portrait' : ' square')}
              />
              <span className="es-bg-chip-label">{p.label}</span>
              <span className="es-bg-chip-sub">{p.sub}</span>
            </button>
          );
        })}
      </div>
      <div className="es-row es-size-custom">
        <label>Custom</label>
        <input
          type="number"
          aria-label="Canvas width"
          value={customW}
          min={200}
          step={10}
          onChange={(e) => setCustomW(e.target.value)}
          onBlur={() => commands.setCanvasSize(+customW || 1920, +customH || 1080)}
        />
        <span className="es-static">×</span>
        <input
          type="number"
          aria-label="Canvas height"
          value={customH}
          min={200}
          step={10}
          onChange={(e) => setCustomH(e.target.value)}
          onBlur={() => commands.setCanvasSize(+customW || 1920, +customH || 1080)}
        />
      </div>

      {/* ---- background (themes live under the Theme segment) ---- */}
      <div className="es-group-head"><span className="t">Background</span></div>
      <Segmented
        label="Background style"
        value={family}
        options={BG_KINDS}
        onChange={(k) => {
          if (k === 'theme' || k === 'solid') setKind(k);
          else if (k === 'shader')
            setBg({ kind: 'shader', shader: bg.shader || SHADER_PRESETS[0].key });
          else setBg({ kind: 'gradient', stops: gradientStops(bg), angle: bg.angle ?? 145 });
        }}
      />

      {bg.kind === 'theme' && (
        <div className="es-bg-panel">
          <p className="es-pane-hint">
            Sets the whole scene's type, colour and furniture — and its backdrop.
          </p>
          <div className="es-bg-grid">
            {CANVAS_THEMES.map((t) => (
              <ThemeChip
                key={t.key}
                themeKey={t.key}
                label={t.label}
                active={theme === t.key}
                onClick={() => commands.setCanvasTheme(t.key)}
              />
            ))}
          </div>
          <p className="es-pane-hint es-bg-current-hint">
            Following the theme. Pick Color, Gradient or Shader to override the backdrop.
          </p>
        </div>
      )}

      {bg.kind === 'solid' && (
        <div className="es-bg-panel">
          <div className="es-swatches">
            {SYSTEM_COLORS.map((c) => (
              <Swatch
                key={c.value}
                name={c.name}
                value={c.value}
                active={normHex(bg.color) === c.value.toUpperCase()}
                onPick={() => setBg({ color: c.value })}
              />
            ))}
          </div>
          <div className="es-swatches es-swatches-neutral">
            {NEUTRAL_COLORS.map((c) => (
              <Swatch
                key={c.value}
                name={c.name}
                value={c.value}
                active={normHex(bg.color) === c.value.toUpperCase()}
                onPick={() => setBg({ color: c.value })}
              />
            ))}
          </div>
          <ColorField
            label="Custom"
            value={bg.color || '#0e1420'}
            onChange={(v) => setBg({ color: v })}
          />
        </div>
      )}

      {family === 'gradient' && (
        <div className="es-bg-panel">
          <p className="es-bg-subhead">Simple</p>
          <div className="es-bg-grid es-grad-grid">
            {GRADIENT_PRESETS.map((g) => {
              const on = bg.kind === 'gradient' && (bg.stops ?? [])[0] === g.stops[0];
              return (
                <button
                  key={g.key}
                  type="button"
                  className={'es-grad-chip' + (on ? ' is-active' : '')}
                  title={`${g.label} gradient`}
                  aria-pressed={on}
                  onClick={() => setBg({ kind: 'gradient', stops: g.stops, angle: g.angle })}
                >
                  <span className="es-grad-preview" style={rampPreview(g.stops, g.angle)} />
                  <span className="es-bg-chip-label">{g.label}</span>
                </button>
              );
            })}
          </div>

          <div className="es-row">
            <label>Angle</label>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              aria-label="Gradient angle"
              value={bg.angle ?? 145}
              onChange={(e) => setBg({ kind: 'gradient', angle: +e.target.value })}
            />
            <span className="es-static es-readout">{bg.angle ?? 145}°</span>
          </div>

          <p className="es-bg-subhead">Mesh</p>
          <p className="es-pane-hint">Colour fields blended across the frame — the Screen Movie look.</p>
          <div className="es-bg-grid es-grad-grid">
            {MESH_PRESETS.map((m) => {
              const on = bg.kind === 'mesh' && (bg.mesh ?? [])[0] === m.colors[0];
              return (
                <button
                  key={m.key}
                  type="button"
                  className={'es-grad-chip' + (on ? ' is-active' : '')}
                  title={`${m.label} mesh`}
                  aria-pressed={on}
                  onClick={() =>
                    setBg({ kind: 'mesh', mesh: m.colors, meshBase: m.base })
                  }
                >
                  <span className="es-grad-preview" style={meshPreview(m.colors)} />
                  <span className="es-bg-chip-label">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {family === 'shader' && (
        <div className="es-bg-panel">
          <p className="es-pane-hint">Living mesh gradients — they drift slowly, and record that way.</p>
          <div className="es-bg-grid es-grad-grid">
            {SHADER_PRESETS.map((s) => {
              const on = (bg.shader || 'aurora') === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={'es-grad-chip' + (on ? ' is-active' : '')}
                  title={`${s.label} shader`}
                  aria-pressed={on}
                  onClick={() => setBg({ kind: 'shader', shader: s.key })}
                >
                  <span className="es-grad-preview" style={meshPreview(s.colors)} />
                  <span className="es-bg-chip-label">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
