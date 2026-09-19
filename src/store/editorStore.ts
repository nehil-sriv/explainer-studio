import { createStore } from 'zustand/vanilla';
import type { Scene } from '../domain/project.js';
import { STATE_TYPE, type SceneComponent } from '../domain/component.js';
import type { Edge } from '../domain/edge.js';
import { runEnd, runMembers, runStart, seqHoldFor } from '../domain/step.js';import { isStepped, stepTotalFor } from '../catalog/lines.js';
import { isState } from '../renderer/stateChanges.js';
import {
  importProjectFile,
  revalidateExits,
} from '../domain/migrations.js';
import { REGISTRY } from '../catalog/registry.js';
import {
  emptyHistory,
  historyBegin,
  historyCommit,
  historyPush,
  historyRedo,
  historyUndo,
  type HistorySnapshot,
  type HistoryState,
} from './history.js';

/**
 * Phase 4 — central editor store + command layer (MIGRATION_PLAN.md).
 *
 * Rule: UI never mutates the project tree directly — every mutation flows
 * through these actions (or the `commands` facade in commands.ts).
 *
 * Slices:
 * - project: persistent state (the ONLY slice ever serialized)
 * - selection: transient (never serialized, never in history)
 * - playback: take state (never serialized, never in history)
 * - prefs: editor preferences incl. active scene (never serialized)
 * - exportState: export/recording status (never serialized)
 * - history: undo/redo over {comps, edges} snapshots (like legacy snap())
 *
 * Undo/redo is transaction-based: beginTransaction() snapshots once,
 * live updates apply without history writes, commitTransaction() keeps
 * one entry — one continuous gesture = one undo step.
 */

export interface CanvasSize {
  w: number;
  h: number;
}

export interface ProjectState {
  version: number;
  scene: CanvasSize;
  comps: SceneComponent[];
  edges: Edge[];
  scenes: Scene[];
  saved?: unknown[];
  seqHoldDefault?: number;
  script?: string;
  currentSceneName?: string | null;
}

export interface SelectionState {
  compIds: string[];
  edgeId: string | null;
}

export interface PlaybackState {
  active: boolean;
  shown: number;
  maxShown: number;
  sceneId: string | null;
  auto: boolean;
  holdDefault: number;
  /** per-line reveal counters for stepped comps (absent = fully shown) */
  revealed: Record<string, number>;
}

export interface EditorPrefs {
  activeSceneId: string | null;
}

export type ExportStatus = 'idle' | 'exporting' | 'recording';

export interface ExportState {
  status: ExportStatus;
}

/** Legacy-compatible ids: uid() base36-5, edges prefixed 'e'. */
export function createCompId(): string {
  return Math.random().toString(36).slice(2, 7);
}

export function createEdgeId(): string {
  return 'e' + Math.random().toString(36).slice(2, 7);
}

export function createSceneId(): string {
  return 'sc' + Math.random().toString(36).slice(2, 7);
}

/** Merged-run id ('st'+uid, legacy mergeSteps parity). */
export function createRunId(): string {
  return 'st' + Math.random().toString(36).slice(2, 7);
}

function snapshotOf(p: ProjectState): HistorySnapshot {
  return {
    comps: structuredClone(p.comps),
    edges: structuredClone(p.edges),
  };
}

export interface AddComponentInput {
  type: string;
  x?: number;
  y?: number;
  props?: Record<string, unknown>;
  sceneId?: string | null;
  select?: boolean;
}

export interface EditorActions {
  // ---- project ----
  loadProject: (data: unknown) => { note: string };
  /** Fresh empty document (legacy New-project parity, minus library wipe). */
  newProject: () => void;
  addComponent: (input: AddComponentInput) => string;
  updateComponent: (id: string, patch: Partial<SceneComponent>) => void;
  updateProps: (id: string, patch: Record<string, unknown>) => void;
  moveComponents: (ids: string[], dx: number, dy: number) => void;
  setPositions: (entries: { id: string; x: number; y: number }[]) => void;
  /** Live field patches (resize/rotate) — silent inside a transaction. */
  patchComps: (entries: { id: string; patch: Partial<SceneComponent> }[]) => void;
  /** Arrange: lift above everything / drop below everything. */
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  resizeComponent: (id: string, wpx?: number, hpx?: number) => void;
  deleteComponents: (ids: string[]) => void;
  duplicateComponents: (ids: string[]) => string[];
  moveComponentToStep: (id: string, toIndex: number) => void;
  reorderStep: (fromIndex: number, toIndex: number) => void;
  /** Appear-together: shared run id + contiguous placement (null = refused). */
  mergeSteps: (ids: string[]) => string | null;
  /** Splitting clears the whole run — never half. */
  splitRun: (id: string) => void;
  /** Give a comp its own position at the end of the sequence. */
  moveToNewStep: (id: string) => void;
  /** State-change step at the end (patches target from there onward). */
  addStateStep: (targetId: string) => string | null;
  updateStatePatch: (stateId: string, patch: Record<string, unknown>) => void;
  /** Retarget (resets the patch — values belong to the old target). */
  setStateTarget: (stateId: string, targetId: string) => void;
  addEdge: (edge: Partial<Edge> & { from: string; to: string }) => string;
  updateEdge: (id: string, patch: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;
  addScene: (name?: string) => string;
  renameScene: (id: string, name: string) => void;
  setCompsScene: (ids: string[], sceneId: string) => void;
  setCanvasSize: (w: number, h: number) => void;
  setHoldDefault: (v: number) => void;
  // ---- selection ----
  selectComps: (ids: string | string[], additive?: boolean) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;
  // ---- playback (slice only; full take engine migrates in Phase 9) ----
  play: (fromIndex?: number) => void;
  stopPlayback: () => void;
  stepNext: () => void;
  stepBack: () => void;
  jumpTo: (index: number) => void;
  /** Timed take: steps on hold timing until the end (or stopAuto). */
  startAuto: () => void;
  stopAuto: () => void;
  /** Restore a take snapshot wholesale (export walk) — no history. */
  restoreTake: (snap: {
    active: boolean;
    shown: number;
    maxShown: number;
    revealed: Record<string, number>;
  }) => void;
  setPlaybackScene: (id: string | null) => void;
  // ---- prefs / export ----
  setActiveScene: (id: string | null) => void;
  setExportStatus: (status: ExportStatus) => void;
  // ---- history ----
  undo: () => void;
  redo: () => void;
  beginTransaction: () => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
}

export interface EditorStore extends EditorActions {
  project: ProjectState;
  selection: SelectionState;
  playback: PlaybackState;
  prefs: EditorPrefs;
  exportState: ExportState;
  history: HistoryState;
}

function defaultProject(): ProjectState {
  return {
    version: 3,
    scene: { w: 1920, h: 1080 },
    comps: [],
    edges: [],
    scenes: [],
  };
}

const clampIndex = (i: number, len: number): number =>
  Math.max(0, Math.min(len, Math.floor(i)));

/**
 * Opening line counts for a fresh take (legacy seqPlay parity): stepped
 * comps in the opening run open on their first line, not an empty box.
 */
function primeRevealed(
  comps: SceneComponent[],
  shown: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of runMembers(comps, Math.max(0, shown - 1))) {
    if (isStepped(c)) out[c.id] = Math.min(1, stepTotalFor(c));
  }
  return out;
}

export function createEditorStore(seed?: Partial<ProjectState>) {
  // Auto-take timer (per store instance — never serialized, never in history).
  let autoTimer: ReturnType<typeof setTimeout> | null = null;
  const stopTimer = (): void => {
    if (autoTimer !== null) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  };
  /** Advance one auto beat, then schedule the next on hold timing. */
  const autoTick = (
    get: () => EditorStore,
    schedule: (ms: number) => void,
  ): void => {
    const s = get();
    if (!s.playback.active || !s.playback.auto) return;
    const len = s.project.comps.length;
    if (s.playback.shown >= len) {
      stopTimer();
      get().stopPlayback();
      return;
    }
    get().stepNext();
    const t = get();
    if (!t.playback.active) {
      stopTimer();
      return;
    }
    // hold = slowest member of the just-revealed run + its entrance time
    const mem = runMembers(t.project.comps, Math.max(0, t.playback.shown - 1));
    const hold = mem.length
      ? Math.max(...mem.map((c) => seqHoldFor(c, t.playback.holdDefault)))
      : t.playback.holdDefault;
    const anim = mem.length
      ? Math.max(...mem.map((c) => (c.animDelay || 0) + (c.animDur || 0.6)))
      : 0.6;
    stopTimer();
    schedule(Math.round((anim + hold) * 1000));
  };
  const scheduleTick = (ms: number): void => {
    stopTimer();
    autoTimer = setTimeout(() => autoTick(() => api.getState(), scheduleTick), ms);
  };
  const api = createStore<EditorStore>()((set, get) => {
    /** Apply a project mutation; record=true pushes pre-image to history. */
    const applyProject = (
      mutate: (p: ProjectState) => ProjectState,
      record = true,
    ): void => {
      const s = get();
      // Snapshot FIRST: mutators may touch shared comp objects (e.g.
      // revalidateExits deletes stranded hideWhen), and the pre-image must
      // predate any of that — same reason legacy snap()s before editing.
      const pre = record ? snapshotOf(s.project) : null;
      const next = mutate(s.project);
      if (next === s.project) return;
      set({
        project: next,
        history: pre ? historyPush(s.history, pre) : s.history,
      });
    };

    const applySnapshot = (snap: HistorySnapshot): void => {
      set((s) => ({
        project: { ...s.project, comps: snap.comps, edges: snap.edges },
        selection: { compIds: [], edgeId: null },
      }));
    };

    return {
      project: { ...defaultProject(), ...seed },
      selection: { compIds: [], edgeId: null },
      playback: {
        active: false,
        shown: 0,
        maxShown: 0,
        sceneId: null,
        auto: false,
        holdDefault: 1.6,
        revealed: {},
      },
      prefs: { activeSceneId: null },
      exportState: { status: 'idle' },
      history: emptyHistory(),

      // ---- project ----
      loadProject: (data: unknown) => {        const { project, note } = importProjectFile(data);
        stopTimer();
        const scenes = (project.scenes ?? []).map((s) => ({
          id: String(s.id),
          name: String(s.name || 'Scene'),
        }));
        set({
          project: {
            version: 3,
            scene: {
              w: project.scene?.w ?? 1920,
              h: project.scene?.h ?? 1080,
            },
            comps: (project.comps ?? []) as SceneComponent[],
            edges: (project.edges ?? []) as Edge[],
            scenes,
            ...(project.saved ? { saved: project.saved } : {}),
            ...(project.seqHoldDefault != null
              ? { seqHoldDefault: project.seqHoldDefault }
              : {}),
            ...(typeof project.script === 'string'
              ? { script: project.script }
              : {}),
            ...(project.currentSceneName
              ? { currentSceneName: project.currentSceneName }
              : {}),
          },
          selection: { compIds: [], edgeId: null },
          playback: {
            active: false,
            shown: 0,
            maxShown: 0,
            sceneId: null,
            auto: false,
            holdDefault:
              project.seqHoldDefault ?? get().playback.holdDefault,
            revealed: {},
          },
          prefs: {
            activeSceneId: scenes.length ? scenes[scenes.length - 1].id : null,
          },
          history: emptyHistory(),
        });
        return { note };
      },

      newProject: () => {
        stopTimer();
        set({
          project: defaultProject(),
          selection: { compIds: [], edgeId: null },
          playback: {
            active: false,
            shown: 0,
            maxShown: 0,
            sceneId: null,
            auto: false,
            holdDefault: 1.6,
            revealed: {},
          },
          prefs: { activeSceneId: null },
          history: emptyHistory(),
        });
      },

      addComponent: (input: AddComponentInput) => {
        const s = get();
        const id = createCompId();
        const def = REGISTRY[input.type];
        const sceneId =
          input.sceneId !== undefined
            ? input.sceneId
            : (s.prefs.activeSceneId ?? null);
        const comp: SceneComponent = {
          id,
          type: input.type,
          x: input.x ?? 100,
          y: input.y ?? 100,
          scale: 1,
          rot: 0,
          z: s.project.comps.length + 10,
          opacity: 1,
          draft: false,
          fscale: 1,
          // NB: no anim default — resolveAnim() applies the per-type default
          // at render (legacy applyAnimation parity: undefined → default).
          props: structuredClone(
            (def?.props ?? {}) as Record<string, unknown>,
          ),
          ...(input.props ? { props: { ...structuredClone((def?.props ?? {}) as Record<string, unknown>), ...structuredClone(input.props) } } : {}),
          ...(sceneId ? { sceneId } : {}),
        };
        if ((def as { behind?: boolean } | undefined)?.behind) {
          (comp as SceneComponent).z = 1;
        }
        applyProject((p) => ({ ...p, comps: [...p.comps, comp] }));
        if (input.select !== false) {
          set({ selection: { compIds: [id], edgeId: null } });
        }
        return id;
      },

      updateComponent: (id: string, patch: Partial<SceneComponent>) => {
        const { id: _dropId, type: _dropType, ...safe } = patch;
        void _dropId;
        void _dropType;
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((c) =>
            c.id === id ? ({ ...c, ...structuredClone(safe) } as SceneComponent) : c,
          ),
        }));
      },

      updateProps: (id: string, patch: Record<string, unknown>) => {
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((c) =>
            c.id === id
              ? {
                  ...c,
                  props: {
                    ...((c.props ?? {}) as Record<string, unknown>),
                    ...structuredClone(patch),
                  },
                }
              : c,
          ),
        }));
      },

      moveComponents: (ids: string[], dx: number, dy: number) => {
        if (!ids.length || (!dx && !dy)) return;
        const wanted = new Set(ids);
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((c) =>
            wanted.has(c.id)
              ? { ...c, x: (c.x ?? 0) + dx, y: (c.y ?? 0) + dy }
              : c,
          ),
        }));
      },

      setPositions: (entries: { id: string; x: number; y: number }[]) => {
        if (!entries.length) return;
        const inTxn = get().history.pending !== null;
        const byId = new Map(entries.map((e) => [e.id, e]));
        applyProject(
          (p) => ({
            ...p,
            comps: p.comps.map((c) =>
              byId.has(c.id)
                ? { ...c, x: byId.get(c.id)!.x, y: byId.get(c.id)!.y }
                : c,
            ),
          }),
          !inTxn,
        );
      },

      patchComps: (entries: { id: string; patch: Partial<SceneComponent> }[]) => {
        if (!entries.length) return;
        const inTxn = get().history.pending !== null;
        const byId = new Map(entries.map((e) => [e.id, e.patch]));
        applyProject(
          (p) => ({
            ...p,
            comps: p.comps.map((c) =>
              byId.has(c.id) ? ({ ...c, ...byId.get(c.id) } as SceneComponent) : c,
            ),
          }),
          !inTxn,
        );
      },

      bringForward: (id: string) => {
        applyProject((p) => {
          if (!p.comps.some((c) => c.id === id)) return p;
          const max = Math.max(...p.comps.map((c) => c.z ?? 10));
          return {
            ...p,
            comps: p.comps.map((c) => (c.id === id ? { ...c, z: max + 1 } : c)),
          };
        });
      },

      sendBackward: (id: string) => {
        applyProject((p) => {
          if (!p.comps.some((c) => c.id === id)) return p;
          const min = Math.min(...p.comps.map((c) => c.z ?? 10));
          return {
            ...p,
            comps: p.comps.map((c) => (c.id === id ? { ...c, z: min - 1 } : c)),
          };
        });
      },

      resizeComponent: (id: string, wpx?: number, hpx?: number) => {
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((c) => {
            if (c.id !== id) return c;
            const next = { ...c };
            if (wpx !== undefined) next.wpx = wpx;
            if (hpx !== undefined) next.hpx = hpx;
            return next;
          }),
        }));
      },

      deleteComponents: (ids: string[]) => {
        if (!ids.length) return;
        const doomed = new Set(ids);
        applyProject((p) => {
          const comps = p.comps
            .filter((c) => !doomed.has(c.id))
            .map((c) => ({ ...c }));
          const edges = p.edges.filter(
            (e) => !doomed.has(e.from) && !(e.to && doomed.has(e.to)),
          );
          // deleting a comp takes its wires AND state steps aimed at it
          const remaining = comps.filter(
            (c) => !(isState(c) && c.target && doomed.has(c.target)),
          );
          revalidateExits(remaining);
          return { ...p, comps: remaining, edges };
        });
        set((s) => ({
          selection: {
            compIds: s.selection.compIds.filter((x) => !doomed.has(x)),
            edgeId: s.selection.edgeId,
          },
        }));
      },

      duplicateComponents: (ids: string[]) => {
        const s = get();
        const sources = s.project.comps.filter((c) => ids.includes(c.id));
        if (!sources.length) return [];
        const groups = [...new Set(sources.map((c) => c.groupId).filter(Boolean))];
        const groupMap = new Map(groups.map((g) => [g, createCompId()]));
        let anchor = Math.max(
          ...sources.map((c) => s.project.comps.indexOf(c)),
        );
        const clones: SceneComponent[] = sources.map((c) => ({
          ...structuredClone(c),
          id: createCompId(),
          x: (c.x ?? 0) + 32,
          y: (c.y ?? 0) + 32,
          ...(c.groupId
            ? { groupId: groupMap.get(c.groupId as string)! }
            : {}),
        }));
        const cloneIds = clones.map((c) => c.id);
        applyProject((p) => {
          const next = [...p.comps];
          next.splice(anchor + 1, 0, ...clones);
          anchor += 1;
          return { ...p, comps: next };
        });
        set({ selection: { compIds: cloneIds, edgeId: null } });
        return cloneIds;
      },

      moveComponentToStep: (id: string, toIndex: number) => {
        applyProject((p) => {
          const from = p.comps.findIndex((c) => c.id === id);
          if (from < 0) return p;
          const next = p.comps.map((c) => ({ ...c }));
          const [mv] = next.splice(from, 1);
          next.splice(clampIndex(toIndex, next.length), 0, mv);
          revalidateExits(next);
          return { ...p, comps: next };
        });
      },

      mergeSteps: (ids: string[]) => {
        const s = get();
        const picked = ids
          .map((id) => s.project.comps.find((c) => c.id === id))
          .filter(Boolean) as SceneComponent[];
        if (picked.length < 2) return null;
        // merges stay inside one scene — move them together first
        if (new Set(picked.map((c) => c.sceneId ?? null)).size > 1) return null;
        const sid = createRunId();
        const idx = picked
          .map((c) => s.project.comps.indexOf(c))
          .sort((a, b) => a - b);
        const ordered = idx.map((i) => s.project.comps[i]);
        applyProject((p) => {
          const keep = new Set(ordered.map((c) => c.id));
          const next = p.comps
            .filter((c) => !keep.has(c.id))
            .map((c) => ({ ...c }));
          const run = ordered.map((c) => ({ ...c, stepId: sid }));
          next.splice(Math.min(idx[0], next.length), 0, ...run);
          return { ...p, comps: next };
        });
        set((prev) => ({
          playback: { ...prev.playback, active: false, auto: false },
        }));
        return sid;
      },

      splitRun: (id: string) => {
        const s = get();
        const c = s.project.comps.find((x) => x.id === id);
        const sid = c?.stepId;
        if (!sid) return;
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((x) =>
            x.stepId === sid ? { ...x, stepId: undefined } : x,
          ),
        }));
      },

      moveToNewStep: (id: string) => {
        applyProject((p) => {
          const from = p.comps.findIndex((c) => c.id === id);
          if (from < 0) return p;
          const next = p.comps.map((c) => ({ ...c }));
          const [mv] = next.splice(from, 1);
          delete mv.stepId;
          next.push(mv);
          revalidateExits(next);
          return { ...p, comps: next };
        });
      },

      addStateStep: (targetId: string) => {
        const s = get();
        const target =
          s.project.comps.find((c) => c.id === targetId) ??
          s.project.edges.find((e) => e.id === targetId);
        if (!target || (target as SceneComponent).type === STATE_TYPE) return null;
        const id = createCompId();
        const sceneId = (target as SceneComponent).sceneId;
        const step: SceneComponent = {
          id,
          type: STATE_TYPE,
          target: targetId,
          label: '',
          patch: {},
          props: {},
          anim: 'none',
          animDur: 0.5,
          ...(sceneId ? { sceneId } : {}),
        } as SceneComponent;
        applyProject((p) => ({ ...p, comps: [...p.comps, step] }));
        set((prev) => ({
          selection: { compIds: [id], edgeId: null },
          playback: { ...prev.playback, active: false, auto: false },
        }));
        return id;
      },

      updateStatePatch: (stateId: string, patch: Record<string, unknown>) => {
        const s = get();
        const c = s.project.comps.find((x) => x.id === stateId);
        if (!c || !isState(c)) return;
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((x) =>
            x.id === stateId
              ? { ...x, patch: structuredClone(patch) }
              : x,
          ),
        }));
      },

      setStateTarget: (stateId: string, targetId: string) => {
        const s = get();
        const c = s.project.comps.find((x) => x.id === stateId);
        if (!c || !isState(c)) return;
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((x) =>
            x.id === stateId ? { ...x, target: targetId, patch: {} } : x,
          ),
        }));
      },

      reorderStep: (fromIndex: number, toIndex: number) => {
        applyProject((p) => {
          if (
            fromIndex < 0 ||
            fromIndex >= p.comps.length ||
            fromIndex === toIndex
          )
            return p;
          const next = p.comps.map((c) => ({ ...c }));
          const [mv] = next.splice(fromIndex, 1);
          next.splice(clampIndex(toIndex, next.length), 0, mv);
          revalidateExits(next);
          return { ...p, comps: next };
        });
      },

      addEdge: (edge) => {
        const id = edge.id ?? createEdgeId();
        const { id: _dropEdgeId, ...rest } = edge;
        void _dropEdgeId;
        applyProject((p) => ({
          ...p,
          edges: [
            ...p.edges,
            {
              fromPort: 'auto',
              toPort: 'auto',
              preset: 'none',
              routing: 'smooth',
              weight: 2,
              dir: 'fwd',
              style: 'dots',
              animate: true,
              ...structuredClone(rest),
              id,
            } as Edge,
          ],
        }));
        return id;
      },

      updateEdge: (id: string, patch: Partial<Edge>) => {
        const { id: _drop, ...safe } = patch;
        void _drop;
        applyProject((p) => ({
          ...p,
          edges: p.edges.map((e) =>
            e.id === id ? ({ ...e, ...structuredClone(safe) } as Edge) : e,
          ),
        }));
      },

      deleteEdge: (id: string) => {
        applyProject((p) => ({
          ...p,
          edges: p.edges.filter((e) => e.id !== id),
        }));
        set((s) => ({
          selection: {
            compIds: s.selection.compIds,
            edgeId: s.selection.edgeId === id ? null : s.selection.edgeId,
          },
        }));
      },

      addScene: (name?: string) => {
        const id = createSceneId();
        const s = get();
        const label = (name || '').trim() || `Scene ${s.project.scenes.length + 1}`;
        set((prev) => ({
          project: {
            ...prev.project,
            scenes: [...prev.project.scenes, { id, name: label }],
          },
          prefs: { activeSceneId: id },
        }));
        return id;
      },

      renameScene: (id: string, name: string) => {
        set((s) => ({
          project: {
            ...s.project,
            scenes: s.project.scenes.map((sc) =>
              sc.id === id ? { ...sc, name } : sc,
            ),
          },
        }));
      },

      setCompsScene: (ids: string[], sceneId: string) => {
        if (!ids.length) return;
        const wanted = new Set(ids);
        applyProject((p) => ({
          ...p,
          comps: p.comps.map((c) =>
            wanted.has(c.id) ? { ...c, sceneId } : c,
          ),
        }));
      },

      setCanvasSize: (w: number, h: number) => {
        applyProject((p) => ({ ...p, scene: { w, h } }));
      },

      setHoldDefault: (v: number) => {
        if (!isFinite(v) || v < 0) return;
        set((s) => ({
          playback: { ...s.playback, holdDefault: v },
          project: { ...s.project, seqHoldDefault: v },
        }));
      },

      // ---- selection ----
      selectComps: (ids: string | string[], additive?: boolean) => {
        const list = Array.isArray(ids) ? ids : [ids];
        set((s) => ({
          selection: {
            compIds: additive
              ? [...new Set([...s.selection.compIds, ...list])]
              : [...list],
            edgeId: null,
          },
        }));
      },

      selectEdge: (id: string | null) => {
        set({ selection: { compIds: [], edgeId: id } });
      },

      clearSelection: () => {
        set({ selection: { compIds: [], edgeId: null } });
      },

      // ---- playback (takes land on whole beats only — never half a run) ----
      // Stepped comps absorb Space presses line-by-line BEFORE the take
      // advances (legacy seqNext parity); auto takes chain on hold timing.
      play: (fromIndex = 0) => {
        stopTimer();
        const comps = get().project.comps;
        const len = comps.length;
        // smallest whole beat covering `from` (legacy seqPlay parity)
        const shown = fromIndex <= 0 ? 0 : Math.min(runEnd(comps, fromIndex - 1), len);
        set((s) => ({
          playback: {
            ...s.playback,
            active: true,
            auto: false,
            shown,
            maxShown: shown,
            revealed: primeRevealed(comps, shown),
          },
          selection: { compIds: [], edgeId: null },
        }));
      },

      stopPlayback: () => {
        stopTimer();
        set((s) => ({
          playback: { ...s.playback, active: false, auto: false },
        }));
      },

      stepNext: () => {
        const s = get();
        if (!s.playback.active) return;
        const len = s.project.comps.length;
        // stepped line first: deepest visible stepped comp with lines left
        for (let i = Math.min(s.playback.shown, len) - 1; i >= 0; i--) {
          const c = s.project.comps[i];
          if (!isStepped(c)) continue;
          const total = stepTotalFor(c);
          const cur = s.playback.revealed[c.id] ?? total;
          if (cur < total) {
            const revealed = { ...s.playback.revealed, [c.id]: cur + 1 };
            set((p) => ({ playback: { ...p.playback, revealed } }));
            return;
          }
        }
        // past the last step the take ends itself — no Esc needed
        if (s.playback.shown >= len) {
          stopTimer();
          set((p) => ({
            playback: { ...p.playback, active: false, auto: false },
          }));
          return;
        }
        const shown = Math.min(runEnd(s.project.comps, s.playback.shown), len);
        const revealed = { ...s.playback.revealed };
        for (let k = s.playback.shown; k < shown; k++) {
          const c = s.project.comps[k];
          if (c && isStepped(c)) revealed[c.id] = Math.min(1, stepTotalFor(c));
        }
        set((p) => ({
          playback: {
            ...p.playback,
            shown,
            maxShown: Math.max(p.playback.maxShown, shown),
            revealed,
          },
        }));
      },

      stepBack: () => {
        set((s) => {
          if (!s.playback.active) return s;
          // back leaves the whole beat (legacy seqPrev parity)
          const shown = s.playback.shown <= 0 ? 0 : Math.max(0, runStart(s.project.comps, s.playback.shown - 1));
          return { playback: { ...s.playback, shown } };
        });
      },

      jumpTo: (index: number) => {
        const s = get();
        if (!s.playback.active) return;
        // revisit head — jumps never pass what the take has revealed;
        // landing past the old head extends it (legacy seqJump parity)
        if (index > s.playback.maxShown) return;
        const len = s.project.comps.length;
        const shown = Math.min(runEnd(s.project.comps, Math.max(0, index)), len);
        set((p) => ({
          playback: {
            ...p.playback,
            shown,
            maxShown: Math.max(p.playback.maxShown, shown),
          },
        }));
      },

      startAuto: () => {
        const s = get();
        if (!s.project.comps.length) return;
        get().play(0);
        set((p) => ({ playback: { ...p.playback, auto: true } }));
        autoTick(get, scheduleTick);
      },

      stopAuto: () => {
        stopTimer();
        set((s) => ({ playback: { ...s.playback, auto: false } }));
      },

      restoreTake: (snap: {
        active: boolean;
        shown: number;
        maxShown: number;
        revealed: Record<string, number>;
      }) => {
        stopTimer();
        set((s) => ({
          playback: { ...s.playback, auto: false, ...structuredClone(snap) },
        }));
      },

      setPlaybackScene: (id: string | null) => {
        set((s) => ({ playback: { ...s.playback, sceneId: id } }));
      },

      // ---- prefs / export ----
      setActiveScene: (id: string | null) => {
        set({ prefs: { activeSceneId: id } });
      },

      setExportStatus: (status: ExportStatus) => {
        set({ exportState: { status } });
      },

      // ---- history ----
      undo: () => {
        const s = get();
        if (!s.history.past.length) return;
        const { state, snapshot } = historyUndo(
          s.history,
          snapshotOf(s.project),
        );
        if (!snapshot) return;
        set({ history: state });
        applySnapshot(snapshot);
      },

      redo: () => {
        const s = get();
        if (!s.history.future.length) return;
        const { state, snapshot } = historyRedo(
          s.history,
          snapshotOf(s.project),
        );
        if (!snapshot) return;
        set({ history: state });
        applySnapshot(snapshot);
      },

      beginTransaction: () => {
        set((s) => ({
          history: historyBegin(s.history, snapshotOf(s.project)),
        }));
      },

      commitTransaction: () => {
        set((s) => ({ history: historyCommit(s.history) }));
      },

      cancelTransaction: () => {
        const s = get();
        if (!s.history.pending) return;
        const snap = s.history.pending;
        set({ history: { ...s.history, pending: null } });
        applySnapshot(snap);
      },
    };
  });
  return api;
}

/**
 * App singleton (vanilla store — no React dependency; Phase 5 binds it to
 * React. Tests use isolated createEditorStore() instances).
 */
export const editorStore = createEditorStore();
