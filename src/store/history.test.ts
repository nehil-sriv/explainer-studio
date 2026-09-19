import { describe, expect, it } from 'vitest';
import {
  emptyHistory,
  historyBegin,
  historyCommit,
  historyPush,
  historyRedo,
  historyUndo,
  HISTORY_LIMIT,
} from './history.js';

const snap = (n: number) => ({ comps: [{ id: `c${n}`, type: 'x' }], edges: [] });

describe('history transactions', () => {
  it('pushes discrete entries with redo cleared', () => {
    let h = emptyHistory();
    h = historyPush(h, snap(0));
    h = historyPush(h, snap(1));
    expect(h.past.length).toBe(2);
    const r = historyUndo(h, snap(2));
    expect(r.snapshot).toEqual(snap(1));
    expect(r.state.future.length).toBe(1);
    // new edit clears the redo branch (legacy snap() parity)
    const h2 = historyPush(r.state, snap(9));
    expect(h2.future).toEqual([]);
  });

  it('caps the stack at 60 like legacy', () => {
    let h = emptyHistory();
    for (let i = 0; i < 70; i++) h = historyPush(h, snap(i));
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toEqual(snap(10));
  });

  it('gesture transactions collapse to one entry; cancel restores', () => {
    let h = emptyHistory();
    h = historyPush(h, snap(0));
    h = historyBegin(h, snap(1));
    // nested begins collapse into the outer gesture
    h = historyBegin(h, snap(2));
    expect(h.pending).toEqual(snap(1));
    h = historyCommit(h);
    expect(h.past).toEqual([snap(0), snap(1)]);
    // cancel with nothing pending is a no-op
    expect(historyCommit(h)).toBe(h);
  });

  it('undo/redo round-trip snapshots and empty stacks return null', () => {
    const h = emptyHistory();
    expect(historyUndo(h, snap(0)).snapshot).toBeNull();
    expect(historyRedo(h, snap(0)).snapshot).toBeNull();
    let h2 = historyPush(h, snap(0));
    const u = historyUndo(h2, snap(1));
    expect(u.snapshot).toEqual(snap(0));
    h2 = u.state;
    const r = historyRedo(h2, snap(1));
    expect(r.snapshot).toEqual(snap(1));
    expect(r.state.past.length).toBe(1);
    expect(r.state.future).toEqual([]);
  });
});
