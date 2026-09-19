import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createEditorStore } from './editorStore.js';
import { serializeProject } from '../domain/migrations.js';
import {
  canRedo,
  canUndo,
  getComp,
  inTransaction,
  sceneComps,
  selectedComps,
  takeFrame,
} from './selectors.js';

function fixtureData(): unknown {
  return JSON.parse(
    readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'),
  );
}

describe('commands', () => {
  it('addComponent appends with defaults, registry props and selection', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'svc', x: 10, y: 20 });
    const c = getComp(store.getState(), id)!;
    expect(c.type).toBe('svc');
    expect(c.x).toBe(10);
    expect(c.z).toBe(10);
    expect((c.props as Record<string, unknown>)['name']).toBe('payment-svc');
    expect(store.getState().selection.compIds).toEqual([id]);
    expect(canUndo(store.getState())).toBe(true);
  });

  it('discrete edits undo/redo exactly and never record selection', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'caption' });
    store.getState().updateProps(id, { text: 'hi' });
    store.getState().selectComps([id]);
    store.getState().play();
    expect(store.getState().history.past.length).toBe(2);
    store.getState().undo();
    expect((getComp(store.getState(), id)?.props as Record<string, unknown>)['text']).not.toBe('hi');
    // undo clears selection like legacy (selId=null on undo)
    expect(store.getState().selection.compIds).toEqual([]);
    store.getState().redo();
    expect((getComp(store.getState(), id)?.props as Record<string, unknown>)['text']).toBe('hi');
    expect(canRedo(store.getState())).toBe(false);
  });

  it('one continuous gesture creates one undo step', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'svc', x: 0, y: 0 });
    const base = store.getState().history.past.length;
    expect(inTransaction(store.getState())).toBe(false);
    store.getState().beginTransaction();
    expect(inTransaction(store.getState())).toBe(true);
    for (let i = 1; i <= 10; i++)
      store.getState().setPositions([{ id, x: i * 10, y: i * 5 }]);
    // live updates land without history writes
    expect(store.getState().history.past.length).toBe(base);
    expect(getComp(store.getState(), id)?.x).toBe(100);
    store.getState().commitTransaction();
    expect(store.getState().history.past.length).toBe(base + 1);
    store.getState().undo();
    expect(getComp(store.getState(), id)?.x).toBe(0);
    store.getState().redo();
    expect(getComp(store.getState(), id)?.x).toBe(100);
  });

  it('cancelTransaction restores the pre-gesture snapshot', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'svc', x: 0, y: 0 });
    const base = store.getState().history.past.length;
    store.getState().beginTransaction();
    store.getState().setPositions([{ id, x: 999, y: 999 }]);
    store.getState().cancelTransaction();
    expect(getComp(store.getState(), id)?.x).toBe(0);
    expect(store.getState().history.past.length).toBe(base);
    expect(inTransaction(store.getState())).toBe(false);
  });

  it('delete cascades to wires and aimed state steps', () => {
    const store = createEditorStore();
    store.getState().loadProject(fixtureData());
    expect(store.getState().project.edges.length).toBe(3);
    store.getState().deleteComponents(['db']);
    const s = store.getState();
    expect(getComp(s, 'db')).toBeUndefined();
    // state step aimed at db goes with it; edges touching db are pruned
    expect(getComp(s, 'db-fail-patch')).toBeUndefined();
    expect(s.project.edges.map((e) => e.id)).toEqual(['e-users-lb', 'e-lb-app']);
  });

  it('duplicate clones with fresh ids, offset and shared group', () => {
    const store = createEditorStore();
    const a = store.getState().addComponent({ type: 'svc', x: 0, y: 0 });
    const b = store.getState().addComponent({ type: 'svc', x: 50, y: 50 });
    store.getState().updateComponent(a, { groupId: 'g1' });
    store.getState().updateComponent(b, { groupId: 'g1' });
    const clones = store.getState().duplicateComponents([a, b]);
    expect(clones.length).toBe(2);
    expect(new Set(clones).size).toBe(2);
    const s = store.getState();
    expect(getComp(s, clones[0])?.x).toBe(32);
    // one new shared group, not one per clone
    expect(getComp(s, clones[0])?.groupId).toBe(getComp(s, clones[1])?.groupId);
    expect(getComp(s, clones[0])?.groupId).not.toBe('g1');
    expect(s.selection.compIds).toEqual(clones);
  });

  it('reorder clamps and keeps the exit rule (stranded hideWhen drops)', () => {
    const store = createEditorStore();
    store.getState().loadProject(fixtureData());
    // alert1.hideWhen=err-msg (index 8); move alert1 after it → rule drops it
    store.getState().moveComponentToStep('alert1', 99);
    const order = store.getState().project.comps.map((c) => c.id);
    expect(order[order.length - 1]).toBe('alert1');
    expect(getComp(store.getState(), 'alert1')?.hideWhen).toBeUndefined();
    store.getState().undo();
    expect(getComp(store.getState(), 'alert1')?.hideWhen).toBe('err-msg');
  });

  it('updateComponent cannot rewrite identity; edges CRUD round-trips', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'svc' });
    store.getState().updateComponent(id, { id: 'hax', type: 'hax' } as never);
    expect(getComp(store.getState(), id)?.type).toBe('svc');
    const other = store.getState().addComponent({ type: 'svc' });
    const eid = store.getState().addEdge({ from: id, to: other });
    expect(eid.startsWith('e')).toBe(true);
    store.getState().updateEdge(eid, { weight: 5 });
    expect(store.getState().project.edges.find((e) => e.id === eid)?.weight).toBe(5);
    store.getState().selectEdge(eid);
    store.getState().deleteEdge(eid);
    expect(store.getState().project.edges).toEqual([]);
    expect(store.getState().selection.edgeId).toBeNull();
  });

  it('scenes: add/select/move; loadProject resets transient slices', () => {
    const store = createEditorStore();
    const sc = store.getState().addScene('Intro');
    expect(store.getState().prefs.activeSceneId).toBe(sc);
    const id = store.getState().addComponent({ type: 'caption' });
    expect(getComp(store.getState(), id)?.sceneId).toBe(sc);
    expect(sceneComps(store.getState(), sc).length).toBe(1);
    store.getState().renameScene(sc, 'Hook');
    expect(store.getState().project.scenes[0].name).toBe('Hook');
    store.getState().play();
    store.getState().selectComps([id]);
    store.getState().loadProject(fixtureData());
    const s = store.getState();
    expect(s.selection.compIds).toEqual([]);
    expect(s.playback.active).toBe(false);
    expect(s.history.past).toEqual([]);
    expect(s.project.comps.length).toBe(11);
  });

  it('playback navigates and clamps to visited ground', () => {
    const store = createEditorStore();
    store.getState().loadProject(fixtureData());
    store.getState().play();
    store.getState().stepNext();
    store.getState().stepNext();
    expect(store.getState().playback.shown).toBe(2);
    store.getState().jumpTo(99);
    expect(store.getState().playback.shown).toBe(2);
    store.getState().stepBack();
    expect(store.getState().playback.shown).toBe(1);
    store.getState().stopPlayback();
    expect(store.getState().playback.active).toBe(false);
  });

  it('takeFrame selector agrees with the visibility resolver', () => {
    const store = createEditorStore();
    store.getState().loadProject(fixtureData());
    store.getState().play();
    for (let i = 0; i < 4; i++) store.getState().stepNext();
    const f = takeFrame(store.getState());
    expect(f.visibleIds).toEqual(['title1', 'users', 'lb', 'app1']);
    expect(selectedComps(store.getState())).toEqual([]);
  });

  it('serialization carries project only — never transient slices', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'svc', x: 5, y: 6 });
    store.getState().selectComps([id]);
    store.getState().play();
    store.getState().stepNext();
    const out = JSON.stringify(serializeProject(store.getState().project as never));
    expect(out).toContain('"x":5');
    for (const k of ['selection', 'playback', 'history', 'compIds', 'maxShown'])
      expect(out).not.toContain(k);
  });

  it('setHoldDefault validates; canvas size is outside undo scope', () => {
    const store = createEditorStore();
    store.getState().setHoldDefault(-1);
    expect(store.getState().playback.holdDefault).toBe(1.6);
    store.getState().setHoldDefault(2.5);
    expect(store.getState().project.seqHoldDefault).toBe(2.5);
    // legacy parity: snap() covers {comps, edges} only — canvas settings
    // are not gesture-tracked, so undo leaves them in place.
    store.getState().setCanvasSize(1080, 1920);
    expect(store.getState().project.scene).toEqual({ w: 1080, h: 1920 });
    store.getState().undo();
    expect(store.getState().project.scene).toEqual({ w: 1080, h: 1920 });
  });
});
