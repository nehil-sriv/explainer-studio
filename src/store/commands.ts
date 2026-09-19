import {
  editorStore,
  type AddComponentInput,
  type EditorStore,
  type ExportStatus,
} from './editorStore.js';
import type { Edge } from '../domain/edge.js';
import type { Background } from '../domain/background.js';
import type { SceneComponent } from '../domain/component.js';

/**
 * Command facade — the ONLY entry point UI code uses to mutate the store.
 * Every function delegates to the singleton's actions, so takes, inspector,
 * canvas gestures and (later) React components share one recorded path.
 * Tests exercise isolated stores via createEditorStore() instead.
 */

type Store = Pick<
  EditorStore,
  | 'loadProject'
  | 'newProject'
  | 'addComponent'
  | 'updateComponent'
  | 'updateProps'
  | 'moveComponents'
  | 'setPositions'
  | 'patchComps'
  | 'bringForward'
  | 'sendBackward'
  | 'resizeComponent'
  | 'deleteComponents'
  | 'duplicateComponents'
  | 'moveComponentToStep'
  | 'reorderStep'
  | 'deleteComponents'
  | 'mergeSteps'
  | 'splitRun'
  | 'moveToNewStep'
  | 'addStateStep'
  | 'updateStatePatch'
  | 'setStateTarget'
  | 'addEdge'
  | 'updateEdge'
  | 'deleteEdge'
  | 'addScene'
  | 'renameScene'
  | 'setCompsScene'
  | 'setCanvasSize'
  | 'setCanvasTheme'
  | 'setCanvasBackground'
  | 'setHoldDefault'
  | 'selectComps'
  | 'selectEdge'
  | 'clearSelection'
  | 'play'
  | 'stopPlayback'
  | 'stepNext'
  | 'stepBack'
  | 'jumpTo'
  | 'startAuto'
  | 'stopAuto'
  | 'restoreTake'
  | 'setPlaybackScene'
  | 'setActiveScene'
  | 'setExportStatus'
  | 'undo'
  | 'redo'
  | 'beginTransaction'
  | 'commitTransaction'
  | 'cancelTransaction'
>;

const api = (): Store => editorStore.getState();

export const commands = {
  loadProject: (data: unknown): { note: string } => api().loadProject(data),
  newProject: (): void => api().newProject(),
  addComponent: (input: AddComponentInput): string => api().addComponent(input),
  moveComponents: (ids: string[], dx: number, dy: number): void =>
    api().moveComponents(ids, dx, dy),
  /** Live drag positions — no history inside an open transaction. */
  setPositions: (entries: { id: string; x: number; y: number }[]): void =>
    api().setPositions(entries),
  /** Live field patches (resize/rotate) — no history inside a transaction. */
  patchComps: (entries: { id: string; patch: Partial<SceneComponent> }[]): void =>
    api().patchComps(entries),
  bringForward: (id: string): void => api().bringForward(id),
  sendBackward: (id: string): void => api().sendBackward(id),
  resizeComponent: (id: string, wpx?: number, hpx?: number): void =>
    api().resizeComponent(id, wpx, hpx),
  updateComponent: (id: string, patch: Partial<SceneComponent>): void =>
    api().updateComponent(id, patch),
  updateComponentProps: (id: string, patch: Record<string, unknown>): void =>
    api().updateProps(id, patch),
  moveComponentToStep: (id: string, toIndex: number): void =>
    api().moveComponentToStep(id, toIndex),
  reorderStep: (fromIndex: number, toIndex: number): void =>
    api().reorderStep(fromIndex, toIndex),
  /** Appear-together grouping (null = refused: need 2+ in one scene). */
  mergeSteps: (ids: string[]): string | null => api().mergeSteps(ids),
  splitRun: (id: string): void => api().splitRun(id),
  moveToNewStep: (id: string): void => api().moveToNewStep(id),
  addStateStep: (targetId: string): string | null => api().addStateStep(targetId),
  updateStatePatch: (stateId: string, patch: Record<string, unknown>): void =>
    api().updateStatePatch(stateId, patch),
  setStateTarget: (stateId: string, targetId: string): void =>
    api().setStateTarget(stateId, targetId),
  deleteSelection: (): void => {
    const { selection } = editorStore.getState();
    if (selection.edgeId) api().deleteEdge(selection.edgeId);
    if (selection.compIds.length)
      api().deleteComponents(selection.compIds);
  },
  deleteComponents: (ids: string[]): void => api().deleteComponents(ids),
  duplicateSelection: (): string[] => {
    const { selection } = editorStore.getState();
    return api().duplicateComponents(selection.compIds);
  },
  addEdge: (edge: Partial<Edge> & { from: string; to: string }): string =>
    api().addEdge(edge),
  updateEdge: (id: string, patch: Partial<Edge>): void =>
    api().updateEdge(id, patch),
  deleteEdge: (id: string): void => api().deleteEdge(id),
  addScene: (name?: string): string => api().addScene(name),
  renameScene: (id: string, name: string): void => api().renameScene(id, name),
  setCompsScene: (ids: string[], sceneId: string): void =>
    api().setCompsScene(ids, sceneId),
  setCanvasSize: (w: number, h: number): void => api().setCanvasSize(w, h),
  setCanvasTheme: (key: string): void => api().setCanvasTheme(key),
  setCanvasBackground: (bg: Background | null): void =>
    api().setCanvasBackground(bg),
  // playback
  play: (fromIndex?: number): void => api().play(fromIndex),
  stopPlayback: (): void => api().stopPlayback(),
  stepNext: (): void => api().stepNext(),
  stepBack: (): void => api().stepBack(),
  jumpTo: (index: number): void => api().jumpTo(index),
  /** Timed take on hold timing (stops at the end or via stopAuto). */
  startAuto: (): void => api().startAuto(),
  stopAuto: (): void => api().stopAuto(),
  restoreTake: (snap: {
    active: boolean;
    shown: number;
    maxShown: number;
    revealed: Record<string, number>;
  }): void => api().restoreTake(snap),
  // selection
  selectComps: (ids: string | string[], additive?: boolean): void =>
    api().selectComps(ids, additive),
  selectEdge: (id: string | null): void => api().selectEdge(id),
  clearSelection: (): void => api().clearSelection(),
  // history
  undo: (): void => api().undo(),
  redo: (): void => api().redo(),
  beginTransaction: (): void => api().beginTransaction(),
  commitTransaction: (): void => api().commitTransaction(),
  cancelTransaction: (): void => api().cancelTransaction(),
  setHoldDefault: (v: number): void => api().setHoldDefault(v),
  setActiveScene: (id: string | null): void => api().setActiveScene(id),
  setExportStatus: (status: ExportStatus): void => api().setExportStatus(status),
};
