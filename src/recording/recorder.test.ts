import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import { recorder } from './recorder.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import { AppShell } from '../editor/shell/AppShell.js';

/**
 * The recording flow must do the legacy sequence, not just start a recorder:
 * rewind → recording layout → settle → crop-capture → auto-take → teardown.
 */

class MockRecorder {
  static isTypeSupported = () => true;
  state = 'inactive';
  ondataavailable: ((ev: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start(): void {
    this.state = 'recording';
    this.ondataavailable?.({ data: new Blob(['clip']) });
  }
  stop(): void {
    this.state = 'inactive';
    this.onstop?.();
  }
}

function fakeStream() {
  const stop = vi.fn();
  const track = { stop, addEventListener: vi.fn(), cropTo: vi.fn().mockResolvedValue(undefined) };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
}

const loadTwoComp = () =>
  commands.loadProject({
    scene: { w: 1920, h: 1080 },
    comps: [
      { id: 'a', type: 'title', x: 0, y: 0, props: { text: 'One' } },
      { id: 'b', type: 'svc', x: 400, y: 0, props: { label: 'Two' } },
    ],
    edges: [],
  });

beforeEach(() => {
  vi.stubGlobal('MediaRecorder', MockRecorder);
  vi.stubGlobal('CropTarget', { fromElement: vi.fn().mockResolvedValue({}) });
  vi.stubGlobal('navigator', {
    mediaDevices: { getDisplayMedia: vi.fn().mockResolvedValue(fakeStream()) },
  });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:x'),
    revokeObjectURL: vi.fn(),
  });
  // anchor clicks are no-ops in jsdom but must not throw
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(async () => {
  await recorder.stop();
  commands.stopAuto();
  commands.stopPlayback();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('recording controller (legacy parity)', () => {
  it('rewinds, enters the recording layout, captures, then tears down', async () => {
    loadTwoComp();
    // leave a half-finished preview take behind — REC must start over
    commands.play();
    commands.stepNext();
    commands.stepNext();
    expect(editorStore.getState().playback.shown).toBeGreaterThan(1);

    const scene = document.createElement('div');
    await recorder.start(scene);

    // rewound: the auto take restarted at the first beat
    const pb = editorStore.getState().playback;
    expect(pb.active).toBe(true);
    expect(pb.auto).toBe(true);
    expect(pb.shown).toBe(1);
    // recording layout is on (drives the shell CSS)
    expect(editorStore.getState().exportState.status).toBe('recording');
    expect(recorder.getSnapshot().status).toBe('recording');
    // region capture resolved against the scene element
    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();

    const blob = await recorder.stop();
    expect(blob?.size).toBeGreaterThan(0);
    expect(editorStore.getState().exportState.status).toBe('idle');
    expect(editorStore.getState().playback.active).toBe(false);
    expect(recorder.getSnapshot().status).toBe('idle');
  });

  it('does nothing when there is no story to record', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    vi.stubGlobal('alert', vi.fn());
    await recorder.start(document.createElement('div'));
    expect(recorder.getSnapshot().status).toBe('idle');
    expect(editorStore.getState().exportState.status).toBe('idle');
  });

  it('leaves recording mode when capture is cancelled', async () => {
    loadTwoComp();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
        ),
      },
    });
    await recorder.start(document.createElement('div'));
    expect(recorder.getSnapshot().status).toBe('idle');
    expect(editorStore.getState().exportState.status).toBe('idle');
  });

  it('reports whether the capture was cropped to the scene', async () => {
    loadTwoComp();
    await recorder.start(document.createElement('div'));
    // CropTarget resolved → cropped
    expect(recorder.getSnapshot().cropped).toBe(true);
    await recorder.stop();
  });

  it('puts the shell into the recording layout while rolling', async () => {
    loadTwoComp();
    const { container } = render(createElement(AppShell));
    const root = () => container.querySelector('.es-root')!;
    expect(root().classList.contains('is-recording')).toBe(false);

    await act(async () => {
      await recorder.start(document.createElement('div'));
    });
    expect(root().classList.contains('is-recording')).toBe(true);
    expect(container.querySelector('.es-rechud')).toBeTruthy();

    await act(async () => {
      await recorder.stop();
    });
    expect(root().classList.contains('is-recording')).toBe(false);
  });
});
