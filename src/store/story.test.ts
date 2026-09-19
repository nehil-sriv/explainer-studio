import { describe, expect, it } from 'vitest';
import { createEditorStore } from './editorStore.js';
import {
  runBoundaries,
  runCount,
  runEnd,
  runIndexOf,
  runMembers,
  runStart,
} from '../domain/step.js';
import { takeFrame } from './selectors.js';

describe('run helpers', () => {
  const comps = [
    { id: 'a', type: 'x' },
    { id: 'b', type: 'x', stepId: 'st1' },
    { id: 'c', type: 'x', stepId: 'st1' },
    { id: 'd', type: 'x' },
    { id: 'e', type: 'x', stepId: 'st2' },
  ];
  it('computes whole-beat boundaries (legacy parity)', () => {
    expect(runStart(comps, 2)).toBe(1);
    expect(runEnd(comps, 1)).toBe(3);
    expect(runEnd(comps, 0)).toBe(1);
    expect(runEnd(comps, 4)).toBe(5);
    expect(runStart(comps, 0)).toBe(0);
    expect(runBoundaries(comps)).toEqual([0, 1, 3, 4]);
    expect(runCount(comps)).toBe(4);
    expect(runIndexOf(comps, 2)).toBe(1);
    expect(runMembers(comps, 2).map((c) => c.id)).toEqual(['b', 'c']);
  });
});

describe('story commands', () => {
  function three() {
    const store = createEditorStore();
    const a = store.getState().addComponent({ type: 'caption' });
    const b = store.getState().addComponent({ type: 'caption' });
    const c = store.getState().addComponent({ type: 'caption' });
    return { store, a, b, c };
  }

  it('mergeSteps groups + compacts; one Space reveals the run', () => {
    const { store, a, b, c } = three();
    const sid = store.getState().mergeSteps([a, c]);
    expect(sid).toMatch(/^st/);
    const order = store.getState().project.comps.map((x) => x.id);
    expect(order).toEqual([a, c, b]); // compacted at min index
    expect(
      store.getState().project.comps.filter((x) => x.stepId === sid).length,
    ).toBe(2);
    store.getState().play();
    store.getState().stepNext();
    expect(store.getState().playback.shown).toBe(2);
    const f = takeFrame(store.getState());
    expect(f.visibleIds).toEqual([a, c]);
    store.getState().stepBack();
    expect(store.getState().playback.shown).toBe(0);
  });

  it('merge refuses singletons and cross-scene picks', () => {
    const { store, a, b } = three();
    expect(store.getState().mergeSteps([a])).toBeNull();
    const sc = store.getState().addScene('Other');
    store.getState().setCompsScene([b], sc);
    expect(store.getState().mergeSteps([a, b])).toBeNull();
    expect(store.getState().history.past.length).toBe(4); // 3 adds + scene
  });

  it('splitRun clears the whole run; moveToNewStep isolates at the end', () => {
    const { store, a, b } = three();
    store.getState().mergeSteps([a, b]);
    store.getState().splitRun(a);
    expect(
      store.getState().project.comps.every((x) => !x.stepId),
    ).toBe(true);
    store.getState().mergeSteps([a, b]);
    store.getState().moveToNewStep(a);
    const order = store.getState().project.comps.map((x) => x.id);
    expect(order[order.length - 1]).toBe(a);
    const comp = store.getState().project.comps.find((x) => x.id === a)!;
    expect(comp.stepId).toBeUndefined();
    // b keeps its (now single) stepId harmlessly — runEnd(b)===own end
    expect(runEnd(store.getState().project.comps, 0)).toBe(1);
  });

  it('addStateStep lands at the end, patches apply, undo removes', () => {
    const { store, a } = three();
    const sid = store.getState().addStateStep(a)!;
    expect(sid).toBeTruthy();
    const comps = store.getState().project.comps;
    expect(comps[comps.length - 1].id).toBe(sid);
    expect(store.getState().selection.compIds).toEqual([sid]);
    // refuses state-on-state and ghosts
    expect(store.getState().addStateStep(sid)).toBeNull();
    expect(store.getState().addStateStep('ghost')).toBeNull();
    store.getState().updateStatePatch(sid, { text: 'late news' });
    store.getState().play();
    for (let i = 0; i < 4; i++) store.getState().stepNext();
    const f = takeFrame(store.getState());
    expect(f.visibleIds).not.toContain(sid); // state steps draw nothing
    store.getState().stopPlayback();
    store.getState().undo(); // patch
    store.getState().undo(); // the step itself
    expect(
      store.getState().project.comps.some((x) => x.id === sid),
    ).toBe(false);
  });

  it('jumps clamp to visited ground; takes end past the last step', () => {
    const { store } = three();
    store.getState().play();
    store.getState().stepNext();
    store.getState().jumpTo(99);
    expect(store.getState().playback.shown).toBe(1);
    store.getState().jumpTo(0);
    // jump lands runEnd(i) (legacy seqJump parity) — first beat, not blank
    expect(store.getState().playback.shown).toBe(1);
    store.getState().play(3); // smallest whole beat covering index 2
    expect(store.getState().playback.shown).toBe(3);
    store.getState().stepNext();
    expect(store.getState().playback.active).toBe(false);
  });
});
