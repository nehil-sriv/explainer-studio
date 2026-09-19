import { ProjectSchema, type Project } from './project.js';
import { STATE_TYPE, type SceneComponent } from './component.js';
import type { Edge } from './edge.js';

/**
 * Phase 2 — structural migrations (no REGISTRY dependency).
 *
 * Mirrors index.html `importProject()` beat-for-beat EXCEPT the two
 * registry-dependent passes, which stay in legacy until Phase 3 extracts
 * the component registry:
 * - themeize() (exact-hue → var() roles; needs THEMEIZE_MAP + field list)
 * - backfillComp() (per-type prop defaults; needs REGISTRY knowledge)
 *
 * Everything else here is pure and unit-tested:
 * 1. v2 `beat` ordering → sequence order (stable sort)
 * 2. legacy `scenes` OBJECT map (name → comp[]) → flattened comps
 * 3. `episode.scenes` variant → SCENES array
 * 4. `carry` → `pin`
 * 5. transient strip: beat/_stateAt/_played/revealed/_rw/_rh
 * 6. `emptycanvas` comps → clearBefore inheritance + removal
 * 7. `flowlink` comps → edges[] layer entries + removal
 * 8. exit revalidation: hideWhen must point downstream, else dropped
 * 9. edge pruning: both endpoints must exist
 * 10. holdDefault → seqHoldDefault alias
 */

const TRANSIENT_KEYS = new Set([
  'beat',
  '_stateAt',
  '_played',
  'revealed',
  '_rw',
  '_rh',
]);

export interface ImportResult {
  project: Project;
  /** e.g. 'imported old project → flattened to sequence (12 steps)' */
  note: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function coerceRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function spreadComp(raw: SceneComponent): SceneComponent {
  const o: AnyRecord = { scale: 1, rot: 0, opacity: 1, z: 10, ...raw };
  for (const k of TRANSIENT_KEYS) delete o[k];
  if (o.type === STATE_TYPE) {
    if (!o.props || typeof o.props !== 'object') o.props = {};
    if (!o.patch || typeof o.patch !== 'object') o.patch = {};
  }
  if (o.carry && !o.pin) o.pin = true;
  delete o.carry;
  return o as SceneComponent;
}

let edgeSeq = 0;
function flowlinksToEdges(list: SceneComponent[]): {
  comps: SceneComponent[];
  fresh: Edge[];
} {
  const fresh: Edge[] = [];
  for (const c of list) {
    if (c.type !== 'flowlink') continue;
    const p = coerceRecord(c.props);
    const from = p['from'];
    const to = p['to'];
    if (
      typeof from !== 'string' ||
      typeof to !== 'string' ||
      !list.some((x) => x.id === from) ||
      !list.some((x) => x.id === to)
    )
      continue;
    fresh.push({
      id: `e_mig_${++edgeSeq}`,
      from,
      fromPort: typeof p['fromPort'] === 'string' ? p['fromPort'] : 'auto',
      to,
      toPort: typeof p['toPort'] === 'string' ? p['toPort'] : 'auto',
      preset: 'none',
      label: typeof p['label'] === 'string' ? p['label'] : '',
      caption: '',
      routing: 'smooth',
      branch: 'none',
      weight: 2,
      dir: 'fwd',
      style: p['mode'] === 'pulse' ? 'pulse' : 'dots',
      speed: 1,
      animate: true,
    });
  }
  return { comps: list.filter((c) => c.type !== 'flowlink'), fresh };
}

function migrateEmptyCanvas(list: SceneComponent[]): SceneComponent[] {
  for (let k = list.length - 1; k >= 0; k--) {
    if (list[k] && list[k].type === 'emptycanvas') {
      let nx: SceneComponent | null = null;
      for (let j = k + 1; j < list.length; j++) {
        if (list[j].type !== STATE_TYPE) {
          nx = list[j];
          break;
        }
      }
      if (nx) nx.clearBefore = true;
      list.splice(k, 1);
    }
  }
  return list;
}

/** hideWhen must reference a LATER sequence position, else it is dropped. */
export function revalidateExits(list: SceneComponent[]): SceneComponent[] {
  list.forEach((c, i) => {
    if (c && c.hideWhen) {
      const t = list.findIndex((x) => x && x.id === c.hideWhen);
      if (t < 0 || t <= i) delete c.hideWhen;
    }
  });
  return list;
}

function normalizeScenes(raw: unknown): { id: string; name: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object' && (s as AnyRecord).id)
    .map((s) => ({
      id: String((s as AnyRecord).id),
      name: String((s as AnyRecord).name || 'Scene'),
    }));
}

/**
 * Import any observed project variant into the typed model.
 * Accepts already-parsed JSON (use parseProjectFile for raw text).
 * Never throws on shape problems — coerces with defaults.
 */
export function importProjectFile(data: unknown): ImportResult {
  const parsed = ProjectSchema.safeParse(data);
  const d: AnyRecord = parsed.success ? (parsed.data as AnyRecord) : coerceRecord(data);

  // base comps first (sorted by old beat), then legacy named scenes in order
  const base: { c: SceneComponent; i: number }[] = (
    Array.isArray(d['comps']) ? (d['comps'] as SceneComponent[]) : []
  ).map((c, i) => ({ c, i }));
  base.sort(
    (a, b) =>
      (((a.c as AnyRecord)['beat'] as number) || 0) -
        (((b.c as AnyRecord)['beat'] as number) || 0) || a.i - b.i,
  );
  let comps: SceneComponent[] = base.map(({ c }) => spreadComp(c));

  const scenesRaw = d['scenes'];
  let legacySceneNames: string[] = [];
  if (scenesRaw && typeof scenesRaw === 'object' && !Array.isArray(scenesRaw)) {
    // legacy: scenes as { name: comp[] } object map
    legacySceneNames = Object.keys(scenesRaw);
    for (const n of legacySceneNames) {
      const arr = (scenesRaw as AnyRecord)[n];
      if (Array.isArray(arr)) {
        for (const c of arr as SceneComponent[]) comps.push(spreadComp(c));
      }
    }
  }

  // hold timing aliases
  let seqHoldDefault: number | undefined;
  const seqHoldRaw = d['seqHoldDefault'];
  const holdRaw = d['holdDefault'];
  if (seqHoldRaw != null && isFinite(Number(seqHoldRaw)))
    seqHoldDefault = Number(seqHoldRaw);
  else if (holdRaw != null && isFinite(Number(holdRaw)))
    seqHoldDefault = Number(holdRaw);

  // edges layer (v3+) + legacy flowlink comps → edges
  const fl = flowlinksToEdges(comps);
  comps = fl.comps;
  migrateEmptyCanvas(comps);
  revalidateExits(comps);
  const edges: Edge[] = (
    Array.isArray(d['edges']) ? (d['edges'] as Edge[]) : []
  )
    .concat(fl.fresh)
    .filter(
      (e) =>
        e &&
        comps.some((c) => c.id === e.from) &&
        comps.some((c) => c.id === e.to),
    );

  const beats = d['beats'];
  const note =
    (beats != null && Number(beats) > 1) || legacySceneNames.length
      ? `imported old project → flattened to sequence (${comps.length} steps)`
      : '';

  const scenes = Array.isArray(scenesRaw)
    ? normalizeScenes(scenesRaw)
    : normalizeScenes(d['episode'] && (d['episode'] as AnyRecord)['scenes']);

  const project: Project = {
    version: typeof d['version'] === 'number' ? d['version'] : 1,
    ...(d['scene'] ? { scene: d['scene'] } : {}),
    comps,
    edges,
    ...(scenes.length ? { scenes } : {}),
    ...(d['saved'] ? { saved: d['saved'] } : {}),
    ...(seqHoldDefault != null ? { seqHoldDefault } : {}),
    ...(typeof d['script'] === 'string' ? { script: d['script'] } : {}),
    ...(d['currentSceneName'] ? { currentSceneName: d['currentSceneName'] } : {}),
  };
  // preserve recognized legacy scalars for lossless re-export inspection
  if (d['beats'] != null) (project as AnyRecord)['beats'] = d['beats'];
  if (d['curBeat'] != null) (project as AnyRecord)['curBeat'] = d['curBeat'];
  if (d['beatLabels'] != null) (project as AnyRecord)['beatLabels'] = d['beatLabels'];

  return { project, note };
}

export function parseProjectFile(json: string): ImportResult {
  return importProjectFile(JSON.parse(json));
}

/**
 * Serialize back to the v3 file shape (mirrors index.html btn-save):
 * version 3, draft coerced to bool, runtime transients stripped,
 * optional keys omitted when empty.
 */
export function serializeProject(p: Project): Record<string, unknown> {
  const out: AnyRecord = {
    version: 3,
    scene: p.scene ?? { w: 1920, h: 1080 },
    comps: (p.comps ?? []).map((c) => {
      const o: AnyRecord = { ...c };
      for (const k of TRANSIENT_KEYS) delete o[k];
      delete o['carry'];
      o['draft'] = !!(c as AnyRecord)['draft'];
      return o;
    }),
    edges: p.edges ?? [],
  };
  if (p.scenes?.length) out['scenes'] = p.scenes;
  if (p.saved) out['saved'] = p.saved;
  if (p.seqHoldDefault != null) out['seqHoldDefault'] = p.seqHoldDefault;
  if (p.script) out['script'] = p.script;
  if (p.currentSceneName) out['currentSceneName'] = p.currentSceneName;
  return out;
}
