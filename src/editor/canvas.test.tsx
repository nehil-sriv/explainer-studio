import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fireEvent, render, act } from '@testing-library/react';
import { AppShell } from './shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';

/**
 * Pointer/keyboard/drop interaction tests (jsdom). The scene rect is
 * mocked (1920×1080 canvas fitted into 960×540 at offset 100,50 → 0.5×),
 * window pointer events are dispatched manually like real gestures.
 */

const RECT = {
  left: 100,
  top: 50,
  width: 960,
  height: 540,
  right: 1060,
  bottom: 590,
  x: 100,
  y: 50,
  toJSON: () => '',
};

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

/** canvas (cx,cy) → client coords under the mocked rect */
const toClient = (cx: number, cy: number): { clientX: number; clientY: number } => ({
  clientX: 100 + cx * 0.5,
  clientY: 50 + cy * 0.5,
});

function winPointer(type: 'pointermove' | 'pointerup', props: Record<string, unknown>): void {
  act(() => {
    const ev = new window.Event(type, { bubbles: true });
    Object.assign(ev, props);
    window.dispatchEvent(ev);
  });
}

function mockSceneRect(container: HTMLElement): void {
  const scene = container.querySelector('#scene')!;
  vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
}

/** jsdom has no DragEvent — dispatch plain events with assigned fields. */
function dragOn(
  node: Element,
  type: 'dragover' | 'dragleave' | 'drop',
  props: Record<string, unknown>,
): void {
  act(() => {
    const ev = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(ev, props);
    node.dispatchEvent(ev);
  });
}

afterEach(() => {
  commands.stopPlayback();
  vi.restoreAllMocks();
});

describe('canvas sizing', () => {
  it('reserves exactly the scaled footprint for true centering', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const wrap = container.querySelector('[data-scene-wrap]') as HTMLElement;
    // initial fit 0.5 (ResizeObserver stubbed): 1920×1080 → 960×540
    expect(wrap.style.width).toBe('960px');
    expect(wrap.style.height).toBe('540px');
    const scene = container.querySelector('#scene') as HTMLElement;
    expect(scene.style.transformOrigin).toBe('top left');
  });
});

describe('canvas manipulation', () => {
  it('drags a comp through one transaction (snapping off-grid)', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    mockSceneRect(container);
    const before = editorStore.getState().history.past.length;
    const users = container.querySelector('[data-id="users"]')!;
    // grab users center (canvas 200,480) and drag +17/+13 canvas px
    fireEvent.pointerDown(users, { ...toClient(200, 480), button: 0 });
    winPointer('pointermove', toClient(204, 484)); // <3px screen: no drag yet
    expect(editorStore.getState().history.past.length).toBe(before);
    winPointer('pointermove', toClient(217, 493));
    // y snaps 433 → lb top 430 (within threshold): guides prove it mid-gesture
    expect(container.querySelectorAll('[data-guide="h"]').length).toBe(1);
    winPointer('pointerup', toClient(217, 493));
    const c = editorStore.getState().project.comps.find((x) => x.id === 'users')!;
    expect(c.x).toBeCloseTo(107, 0);
    expect(c.y).toBe(430);
    // exactly one undo step for the whole gesture
    expect(editorStore.getState().history.past.length).toBe(before + 1);
    editorStore.getState().undo();
    expect(
      editorStore.getState().project.comps.find((x) => x.id === 'users')!.x,
    ).toBe(90);
  });

  it('marquee-selects intersecting comps', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    mockSceneRect(container);
    const well = container.querySelector('[data-testid="canvas-well"]')!;
    // marquee canvas (50,380)→(660,560) covers users + lb + term1
    // (term1's fallback box overlaps spatially; marquee is spatial)
    fireEvent.pointerDown(well, { ...toClient(50, 380), button: 0 });
    winPointer('pointermove', toClient(660, 560));
    winPointer('pointerup', toClient(660, 560));
    fireEvent.click(well);
    expect(editorStore.getState().selection.compIds).toEqual(['users', 'lb', 'term1']);
  });

  it('keyboard nudges, duplicates and deletes', () => {
    loadFixture();
    render(<AppShell />);
    commands.selectComps(['lb']);
    const x0 = editorStore.getState().project.comps.find((x) => x.id === 'lb')!.x!;
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(
      editorStore.getState().project.comps.find((x) => x.id === 'lb')!.x,
    ).toBe(x0 + 1);
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    expect(
      editorStore.getState().project.comps.find((x) => x.id === 'lb')!.y,
    ).toBe(430 + 10);
    const n0 = editorStore.getState().project.comps.length;
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(editorStore.getState().project.comps.length).toBe(n0 + 1);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(editorStore.getState().project.comps.length).toBe(n0);
  });

  it('resize handle writes wpx in one undo step', () => {
    loadFixture();
    commands.selectComps(['lb']);
    const { container } = render(<AppShell />);
    mockSceneRect(container);
    const before = editorStore.getState().history.past.length;
    const handle = container.querySelector('[data-handle="e"]')!;
    // lb right edge canvas (640,490) → drag +80 canvas px right
    fireEvent.pointerDown(handle, { ...toClient(640, 490), button: 0 });
    winPointer('pointermove', toClient(680, 490));
    winPointer('pointermove', toClient(720, 490));
    winPointer('pointerup', toClient(720, 490));
    const lb = editorStore.getState().project.comps.find((x) => x.id === 'lb')!;
    expect(lb.wpx).toBe(300);
    expect(editorStore.getState().history.past.length).toBe(before + 1);
  });

  it('rotate handle writes rot in one undo step', () => {
    loadFixture();
    commands.selectComps(['lb']);
    const { container } = render(<AppShell />);
    mockSceneRect(container);
    const before = editorStore.getState().history.past.length;
    const handle = container.querySelector('[data-handle="rotate"]')!;
    fireEvent.pointerDown(handle, { ...toClient(530, 398), button: 0 });
    winPointer('pointermove', toClient(590, 430));
    winPointer('pointerup', toClient(590, 430));
    const lb = editorStore.getState().project.comps.find((x) => x.id === 'lb')!;
    expect(lb.rot).not.toBe(0);
    expect(editorStore.getState().history.past.length).toBe(before + 1);
  });

  it('library drop adds at the drop point and selects', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    mockSceneRect(container);
    const n0 = editorStore.getState().project.comps.length;
    const tile = container.querySelector('[data-comp="cache"]')!;
    const dt = {
      types: ['application/x-explainer-comp'],
      data: '' as string,
      setData(_t: string, v: string) {
        this.data = v;
      },
      getData() {
        return this.data;
      },
      dropEffect: '',
    };
    fireEvent.dragStart(tile, { dataTransfer: dt });
    dt.data = 'cache';
    const well = container.querySelector('[data-testid="canvas-well"]')!;
    dragOn(well, 'dragover', { dataTransfer: dt, clientX: 400, clientY: 300 });
    expect(container.querySelector('[data-drop-preview]')).toBeTruthy();
    dragOn(well, 'drop', { dataTransfer: dt, clientX: 400, clientY: 300 });
    const s = editorStore.getState();
    expect(s.project.comps.length).toBe(n0 + 1);
    // drop canvas point: ((400-100)/.5-110, (300-50)/.5-60) = (490,440)
    const added = s.project.comps[s.project.comps.length - 1];
    expect(added.type).toBe('cache');
    expect([added.x, added.y]).toEqual([490, 440]);
    expect(s.selection.compIds).toEqual([added.id]);
  });
});
