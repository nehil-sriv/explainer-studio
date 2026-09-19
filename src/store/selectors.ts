import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';
import { resolveSceneAtStep, type SceneFrame } from '../renderer/visibility.js';
import type { EditorStore } from './editorStore.js';

/**
 * Derived selectors — pure reads over store state. UI subscribes to these,
 * never to raw mutation. The take frame is the Phase 9 resolver:
 * editor preview, popout and recording all consume the same function.
 */

type S = Pick<EditorStore, 'project' | 'selection' | 'playback' | 'prefs' | 'history'>;

export function getComp(s: S, id: string): SceneComponent | undefined {
  return s.project.comps.find((c) => c.id === id);
}

export function getEdge(s: S, id: string): Edge | undefined {
  return s.project.edges.find((e) => e.id === id);
}

export function selectedComps(s: S): SceneComponent[] {
  const wanted = new Set(s.selection.compIds);
  return s.project.comps.filter((c) => wanted.has(c.id));
}

export function sceneComps(s: S, sceneId: string): SceneComponent[] {
  return s.project.comps.filter((c) => c.sceneId === sceneId);
}

/** Current take frame (playback position, scene-scoped when set). */
export function takeFrame(s: S, shown?: number): SceneFrame {
  return resolveSceneAtStep(
    s.project.comps,
    s.project.edges,
    shown ?? s.playback.shown,
    { sceneId: s.playback.sceneId },
  );
}

export function canUndo(s: S): boolean {
  return s.history.past.length > 0;
}

export function canRedo(s: S): boolean {
  return s.history.future.length > 0;
}

export function inTransaction(s: S): boolean {
  return s.history.pending !== null;
}
