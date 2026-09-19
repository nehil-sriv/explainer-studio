import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEditorStore } from './editorStore.js';
import { resolveAnim } from '../catalog/defaultAnims.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('auto takes + stepped reveals', () => {
  it('advances on hold timing and stops at the end', () => {
    const store = createEditorStore();
    store.getState().addComponent({ type: 'caption' });
    store.getState().addComponent({ type: 'caption', props: {} });
    store.getState().updateComponent(
      store.getState().project.comps[1].id,
      { seqHold: 2 },
    );
    store.getState().startAuto();
    expect(store.getState().playback.auto).toBe(true);
    // first beat reveals immediately, then waits anim(0.6) + hold(1.6)
    expect(store.getState().playback.shown).toBe(1);
    vi.advanceTimersByTime(2200);
    expect(store.getState().playback.shown).toBe(2);
    // second beat holds 2s (+0.6 anim)
    vi.advanceTimersByTime(2600);
    expect(store.getState().playback.shown).toBe(2);
    expect(store.getState().playback.active).toBe(false);
    expect(store.getState().playback.auto).toBe(false);
  });

  it('stopAuto halts the chain without exiting the take', () => {
    const store = createEditorStore();
    store.getState().addComponent({ type: 'caption' });
    store.getState().addComponent({ type: 'caption' });
    store.getState().startAuto();
    expect(store.getState().playback.shown).toBe(1);
    store.getState().stopAuto();
    vi.advanceTimersByTime(10000);
    expect(store.getState().playback.shown).toBe(1);
    expect(store.getState().playback.active).toBe(true);
  });

  it('stepped comps absorb Space presses line-by-line first', () => {
    const store = createEditorStore();
    const a = store.getState().addComponent({ type: 'caption' });
    const b = store.getState().addComponent({
      type: 'checklist',
      props: { items: 'one|done\ntwo|never', stepped: true },
    });
    void a;
    store.getState().play();
    expect(store.getState().playback.shown).toBe(0);
    store.getState().stepNext(); // caption
    expect(store.getState().playback.shown).toBe(1);
    store.getState().stepNext(); // checklist opens on its first line
    expect(store.getState().playback.shown).toBe(2);
    expect(store.getState().playback.revealed[b]).toBe(1);
    store.getState().stepNext(); // line 2 — the take does not advance…
    expect(store.getState().playback.revealed[b]).toBe(2);
    expect(store.getState().playback.shown).toBe(2);
    store.getState().stepNext(); // …now the take ends past the last step
    expect(store.getState().playback.active).toBe(false);
  });

  it('new comps leave anim undefined; resolveAnim applies type defaults', () => {
    const store = createEditorStore();
    const id = store.getState().addComponent({ type: 'caption' });
    const c = store.getState().project.comps.find((x) => x.id === id)!;
    expect(c.anim).toBeUndefined();
    expect(resolveAnim(c.type, c.anim)).toBe('pa-up');
    expect(resolveAnim(c.type, 'none')).toBe('none');
  });
});
