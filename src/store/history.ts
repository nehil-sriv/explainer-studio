import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';

/**
 * Transactional undo/redo — mirrors index.html snap()/undo()/redo()
 * (60-step stack of {comps, edges} snapshots) with gesture transactions:
 *
 *   beginTransaction() — snapshot once, clear redo (pointer down)
 *   ... live updates, no history writes (pointer move)
 *   commitTransaction() — keep the single entry (pointer up)
 *   cancelTransaction() — restore the pre-gesture snapshot
 *
 * Discrete commands use push() (snapshot-before-mutate, one entry).
 * Selection/playback/export state is NEVER snapshotted — history covers
 * the persistent project tree ({comps, edges}) only, like legacy.
 */

export interface HistorySnapshot {
  comps: SceneComponent[];
  edges: Edge[];
}

export const HISTORY_LIMIT = 60;

export interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  /** pre-gesture snapshot while a transaction is open, else null */
  pending: HistorySnapshot | null;
}

export function emptyHistory(): HistoryState {
  return { past: [], future: [], pending: null };
}

function cap(stack: HistorySnapshot[]): HistorySnapshot[] {
  return stack.length > HISTORY_LIMIT
    ? stack.slice(stack.length - HISTORY_LIMIT)
    : stack;
}

export function historyPush(
  h: HistoryState,
  snap: HistorySnapshot,
): HistoryState {
  return { past: cap([...h.past, snap]), future: [], pending: h.pending };
}

export function historyBegin(
  h: HistoryState,
  snap: HistorySnapshot,
): HistoryState {
  // Nested begins collapse into the outer gesture (single undo step).
  if (h.pending) return h;
  return { past: h.past, future: [], pending: snap };
}

export function historyCommit(h: HistoryState): HistoryState {
  if (!h.pending) return h;
  return { past: cap([...h.past, h.pending]), future: [], pending: null };
}

export function historyUndo(
  h: HistoryState,
  current: HistorySnapshot,
): { state: HistoryState; snapshot: HistorySnapshot | null } {
  if (!h.past.length) return { state: h, snapshot: null };
  const snapshot = h.past[h.past.length - 1];
  return {
    state: {
      past: h.past.slice(0, -1),
      future: cap([...h.future, current]),
      pending: null,
    },
    snapshot,
  };
}

export function historyRedo(
  h: HistoryState,
  current: HistorySnapshot,
): { state: HistoryState; snapshot: HistorySnapshot | null } {
  if (!h.future.length) return { state: h, snapshot: null };
  const snapshot = h.future[h.future.length - 1];
  return {
    state: {
      past: cap([...h.past, current]),
      future: h.future.slice(0, -1),
      pending: null,
    },
    snapshot,
  };
}
