/**
 * Canvas background — the recorded backdrop behind the scene.
 *
 * A background is a small declarative record (persisted with the project)
 * that compiles to inline CSS on #scene, so the editor, popout, region
 * capture and html-to-image exports all paint the same backdrop from one
 * source. `theme` defers entirely to the active canvas theme's own
 * --bg-deep / --canvas-texture; every other kind overrides them.
 *
 * Mesh + shader follow Apple's MeshGradient idea (iOS 18 / macOS 15): a grid
 * of colour vertices interpolated across the frame. CSS has no mesh
 * primitive, so each vertex is a soft radial pool layered over a base —
 * the standard, export-safe approximation, and what screen-recorder tools
 * like Screen Movie render as "mesh gradients".
 */

export type BackgroundKind = 'theme' | 'solid' | 'gradient' | 'mesh' | 'shader';

export interface Background {
  kind: BackgroundKind;
  /** solid */
  color?: string;
  /** gradient — two-stop (from/to) or a multi-stop ramp (stops) */
  from?: string;
  to?: string;
  stops?: string[];
  angle?: number;
  /** mesh — vertex colours, laid out on the shared mesh grid */
  mesh?: string[];
  meshBase?: string;
  /** shader — one of the SHADER_PRESETS keys */
  shader?: string;
}

export const DEFAULT_BACKGROUND: Background = { kind: 'theme' };

export interface BackgroundCss {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  animation?: string;
}

/**
 * iOS system colours (UIKit light appearance). Naming the palette after the
 * platform keeps the picker honest: these are the colours Apple ships.
 */
export const SYSTEM_COLORS: { name: string; value: string }[] = [
  { name: 'Red', value: '#FF3B30' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Yellow', value: '#FFCC00' },
  { name: 'Green', value: '#34C759' },
  { name: 'Mint', value: '#00C7BE' },
  { name: 'Teal', value: '#30B0C7' },
  { name: 'Cyan', value: '#32ADE6' },
  { name: 'Blue', value: '#007AFF' },
  { name: 'Indigo', value: '#5856D6' },
  { name: 'Purple', value: '#AF52DE' },
  { name: 'Pink', value: '#FF2D55' },
  { name: 'Brown', value: '#A2845E' },
];

/** Neutral surfaces for when a backdrop should stay out of the way. */
export const NEUTRAL_COLORS: { name: string; value: string }[] = [
  { name: 'Black', value: '#000000' },
  { name: 'Ink', value: '#0E1420' },
  { name: 'Slate', value: '#1C1C1E' },
  { name: 'Graphite', value: '#3A3A3C' },
  { name: 'Gray', value: '#8E8E93' },
  { name: 'White', value: '#FFFFFF' },
];

/**
 * Simple gradients: soft multi-stop ramps built from the system palette,
 * rendered at ~145° like Apple's own app-background gradients.
 */
export const GRADIENT_PRESETS: {
  key: string;
  label: string;
  stops: string[];
  angle: number;
}[] = [
  { key: 'dawn', label: 'Dawn', stops: ['#FFCC00', '#FF9500', '#FF3B30'], angle: 145 },
  { key: 'daylight', label: 'Daylight', stops: ['#32ADE6', '#007AFF', '#5856D6'], angle: 145 },
  { key: 'lagoon', label: 'Lagoon', stops: ['#00C7BE', '#30B0C7', '#007AFF'], angle: 160 },
  { key: 'bloom', label: 'Bloom', stops: ['#FF2D55', '#AF52DE', '#5856D6'], angle: 145 },
  { key: 'dusk', label: 'Dusk', stops: ['#5856D6', '#AF52DE', '#FF2D55'], angle: 200 },
  { key: 'graphite', label: 'Graphite', stops: ['#3A3A3C', '#1C1C1E', '#000000'], angle: 180 },
];

/** Vertex layout for mesh + shader: six pools spread across the frame. */
const MESH_LAYOUT: [number, number][] = [
  [16, 22],
  [84, 16],
  [70, 52],
  [26, 58],
  [50, 90],
  [12, 86],
];

/**
 * Mesh gradients — vivid, many-hue pools. Screen Movie and Apple's
 * MeshGradient demos read as saturated, atmospheric colour fields, not
 * muted single-family ramps.
 */
export const MESH_PRESETS: {
  key: string;
  label: string;
  base: string;
  colors: string[];
}[] = [
  {
    key: 'nebuluxe',
    label: 'Nebuluxe',
    base: '#1b1040',
    colors: ['#4C1D95', '#7C3AED', '#C026D3', '#F472B6', '#6366F1', '#A855F7'],
  },
  {
    key: 'aurorix',
    label: 'Aurorix',
    base: '#04121c',
    colors: ['#22D3EE', '#34D399', '#3B82F6', '#8B5CF6', '#06B6D4', '#14B8A6'],
  },
  {
    key: 'prismal',
    label: 'Prismal',
    base: '#1a0b2e',
    colors: ['#EF4444', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#10B981'],
  },
  {
    key: 'horizon',
    label: 'Horizon',
    base: '#2a0a1e',
    colors: ['#F97316', '#F43F5E', '#EC4899', '#FBBF24', '#FB7185', '#A855F7'],
  },
  {
    key: 'iridescence',
    label: 'Iridescence',
    base: '#0b1020',
    colors: ['#67E8F9', '#A5B4FC', '#F0ABFC', '#FBCFE8', '#7DD3FC', '#C4B5FD'],
  },
  {
    key: 'nocturne',
    label: 'Nocturne',
    base: '#05060a',
    colors: ['#1E293B', '#334155', '#312E81', '#1E1B4B', '#475569', '#0F172A'],
  },
];

/** Animated shaders — the same mesh, drifting. */
export const SHADER_PRESETS: {
  key: string;
  label: string;
  base: string;
  colors: string[];
}[] = [
  {
    key: 'aurora',
    label: 'Aurora',
    base: '#04121c',
    colors: ['#22D3EE', '#34D399', '#3B82F6', '#8B5CF6', '#06B6D4', '#14B8A6'],
  },
  {
    key: 'ember',
    label: 'Ember',
    base: '#170604',
    colors: ['#F97316', '#EF4444', '#F59E0B', '#DC2626', '#FB923C', '#B91C1C'],
  },
  {
    key: 'ion',
    label: 'Ion',
    base: '#05070d',
    colors: ['#0EA5E9', '#38BDF8', '#6366F1', '#22D3EE', '#818CF8', '#0284C7'],
  },
  {
    key: 'bloom',
    label: 'Bloom',
    base: '#140a1e',
    colors: ['#D946EF', '#EC4899', '#A855F7', '#F472B6', '#C026D3', '#8B5CF6'],
  },
];

function meshLayers(colors: string[]): string {
  return colors
    .map((c, i) => {
      const [x, y] = MESH_LAYOUT[i % MESH_LAYOUT.length];
      return `radial-gradient(62% 62% at ${x}% ${y}%, ${c} 0%, transparent 70%)`;
    })
    .join(', ');
}

/** Preview style for a mesh/shader chip — the same layers #scene paints. */
export function meshPreview(colors: string[]): { backgroundColor: string; backgroundImage: string } {
  return {
    backgroundColor: colors[colors.length - 1],
    backgroundImage: meshLayers(colors),
  };
}

export function meshColors(bg: Background | undefined): string[] {
  if (bg?.mesh && bg.mesh.length >= 3) return bg.mesh;
  return MESH_PRESETS[0].colors;
}

export function gradientStops(bg: Background | undefined): string[] {
  if (bg?.stops && bg.stops.length >= 2) return bg.stops;
  return [bg?.from || '#0e1420', bg?.to || '#3dd6f5'];
}

export function shaderPreset(key: string | undefined) {
  return SHADER_PRESETS.find((s) => s.key === key) ?? SHADER_PRESETS[0];
}

/** Compile a background record into scene CSS. `theme` returns {} (defer). */
export function backgroundCss(bg: Background | undefined): BackgroundCss {
  if (!bg || bg.kind === 'theme') return {};

  if (bg.kind === 'solid') {
    return { backgroundColor: bg.color || '#0a0f0a', backgroundImage: 'none' };
  }

  if (bg.kind === 'gradient') {
    const stops = gradientStops(bg);
    const angle = Number.isFinite(bg.angle) ? (bg.angle as number) : 145;
    const ramp = stops
      .map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 100)}%`)
      .join(', ');
    return { backgroundImage: `linear-gradient(${angle}deg, ${ramp})` };
  }

  if (bg.kind === 'mesh') {
    const colors = meshColors(bg);
    return {
      backgroundColor: bg.meshBase || colors[colors.length - 1],
      backgroundImage: meshLayers(colors),
    };
  }

  // shader — the mesh, drifting slowly (CSS motion captures in exports)
  const preset = shaderPreset(bg.shader);
  return {
    backgroundColor: preset.base,
    backgroundImage: meshLayers(preset.colors),
    backgroundSize: '180% 180%',
    animation: 'es-bg-drift 24s ease-in-out infinite alternate',
  };
}

/** True when the background overrides the theme (used by the UI + exports). */
export function hasBackground(bg: Background | undefined): boolean {
  return !!bg && bg.kind !== 'theme';
}
