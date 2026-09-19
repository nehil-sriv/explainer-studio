import { describe, expect, it, vi } from 'vitest';
import {
  collectFrames,
  encodeGif,
  gifWorkerScript,
  planGifFrames,
  type GifEncoder,
} from './gif.js';
import {
  linesSettled,
  planVideoStates,
  renderTakeVideo,
  videoBitrate,
} from './video.js';

function stubGif(seen: {
  frames: { delay: number }[];
  opts: Record<string, unknown> | null;
  progress: number[];
}): GifEncoder {
  return {
    addFrame: (_cv, opts) => {
      seen.frames.push({ delay: opts.delay });
    },
    on: (ev, cb) => {
      if (ev === 'progress') {
        seen.progress.push(0.5);
        (cb as (p: number) => void)(0.5);
      }
      if (ev === 'finished') {
        setTimeout(() => (cb as (b: Blob) => void)(new Blob(['gif'])), 0);
      }
    },
    render: () => {},
    abort: () => {},
  };
}

describe('gif export', () => {
  it('plans ~8fps live captures, clamped 2–96', () => {
    expect(planGifFrames(3000)).toBe(24);
    expect(planGifFrames(500)).toBe(4);
    expect(planGifFrames(100)).toBe(2);
    expect(planGifFrames(20000)).toBe(96);
  });

  it('collects live frames with progress + cancel', async () => {
    const seen: number[] = [];
    const frames = await collectFrames({
      totalMs: 500,
      rasterizeOne: async () => ({}) as HTMLCanvasElement,
      sleep: async () => {},
      onProgress: (d, n) => seen.push(d / n),
      isCancelled: undefined,
    });
    expect(frames.length).toBe(4);
    expect(frames[0].delayMs).toBe(125);
    expect(seen[seen.length - 1]).toBe(1);
    let calls = 0;
    const cut = await collectFrames({
      totalMs: 3000,
      rasterizeOne: async () => ({}) as HTMLCanvasElement,
      sleep: async () => {},
      isCancelled: () => ++calls > 2,
    });
    expect(cut.length).toBe(2);
  });

  it('encodes with legacy params, clamped delays, progress', async () => {
    const seen = { frames: [] as { delay: number }[], opts: null as null | Record<string, unknown>, progress: [] as number[] };
    const blob = await encodeGif({
      frames: [{ canvas: {} as HTMLCanvasElement, delayMs: 5 }],
      width: 960,
      height: 540,
      background: '#0A0F0A',
      workerScript: 'blob:worker',
      gifFactory: (opts) => {
        seen.opts = opts;
        return stubGif(seen);
      },
      onProgress: (p) => seen.progress.push(p),
      watchdogMs: 0,
    });
    expect(seen.opts).toMatchObject({ workers: 2, quality: 9, width: 960, height: 540, repeat: 0 });
    expect(seen.frames[0].delay).toBe(100); // clamped up
    expect(seen.progress.length).toBeGreaterThan(0);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects on encoder stall after watchdog silence', async () => {
    let now = 0;
    await expect(
      encodeGif({
        frames: [],
        width: 10,
        height: 10,
        background: '#000',
        workerScript: 'blob:worker',
        gifFactory: () => ({
          addFrame: () => {},
          on: () => {},
          render: () => {},
          abort: () => {},
        }),
        watchdogMs: 1000,
        watchdogEveryMs: 20,
        now: () => (now += 5000),
      }),
    ).rejects.toThrow(/stalled/);
  });

  it('fetches the worker once, falls back to CDN', async () => {
    const url = await gifWorkerScript({
      fetchFn: (async () => ({ ok: true, text: async () => 'worker-src' })) as unknown as typeof fetch,
      createObjectURL: () => 'blob:worker-1',
    });
    expect(url).toBe('blob:worker-1');
    const fallback = await gifWorkerScript({
      fetchFn: (async () => {
        throw new Error('offline');
      }) as unknown as typeof fetch,
    });
    expect(fallback).toContain('gif.worker.js');
  });
});

describe('video export', () => {
  const comps = [
    { id: 'a', type: 'caption', props: {} },
    { id: 'b', type: 'caption', props: {}, stepId: 'st1' },
    { id: 'c', type: 'caption', props: {}, stepId: 'st1' },
  ];

  it('plans blank + 3 settled frames per run boundary', () => {
    // ends are boundary starts (legacy parity): [0, 1, 3] + finale at n
    const states = planVideoStates(comps, 1.6);
    expect(states).toEqual([
      { shown: 0, durMs: 700 },
      { shown: 1, durMs: 300 },
      { shown: 1, durMs: 300 },
      { shown: 1, durMs: 1600 },
      { shown: 3, durMs: 300 },
      { shown: 3, durMs: 300 },
      { shown: 3, durMs: 1600 },
    ]);
    expect(planVideoStates([], 1.6)).toEqual([]);
    expect(videoBitrate(1920, 1080, 30)).toBeLessThanOrEqual(50e6);
    expect(videoBitrate(320, 200, 30)).toBe(8e6);
  });

  it('linesSettled detects unfinished stepped lines', () => {
    const stepped = {
      id: 's',
      type: 'checklist',
      props: { items: 'a|done\nb|never', stepped: true },
    };
    // absent counters mean fully shown (settled); partial counts do not
    expect(linesSettled({ comps: [stepped], edges: [], shown: 1, revealed: {} })).toBe(true);
    expect(
      linesSettled({ comps: [stepped], edges: [], shown: 1, revealed: { s: 1 } }),
    ).toBe(false);
    expect(
      linesSettled({ comps: [stepped], edges: [], shown: 1, revealed: { s: 2 } }),
    ).toBe(true);
    expect(linesSettled({ comps: [stepped], edges: [], shown: 0, revealed: {} })).toBe(true);
  });

  it('drives states through the sink and downloads the movie', async () => {
    const drawn: number[] = [];
    const progress: [number, number][] = [];
    const stop = vi.fn();
    const sink = {
      canvas: {},
      ctx: { drawImage: (cv: unknown) => drawn.push((cv as { n: number }).n) },
      stream: { getTracks: () => [{ stop }] },
    };
    let n = 0;
    const downloads: [string, string][] = [];
    const blob = await renderTakeVideo({
      states: [
        { shown: 0, durMs: 10 },
        { shown: 1, durMs: 20 },
      ],
      width: 960,
      height: 540,
      mime: 'video/webm;codecs=vp9',
      gotoState: async (shown) => ({ n: shown }) as unknown as HTMLCanvasElement,
      makeSink: () => sink as never,
      recorderFactory: (stream, opts) =>
        new (class {          state = 'inactive';
          ondataavailable: ((ev: { data: Blob }) => void) | null = null;
          onstop: (() => void) | null = null;
          start() {
            this.state = 'recording';
            this.ondataavailable?.({ data: new Blob(['v']) });
          }
          stop() {
            this.state = 'inactive';
            this.onstop?.();
          }
        })(),
      sleep: async () => {},
      onProgress: (d, t) => progress.push([d, t]),
      objectURL: () => 'blob:movie',
      download: (href, name) => downloads.push([href, name]),
    });
    expect(drawn).toEqual([0, 1]);
    expect(progress).toEqual([[1, 2], [2, 2]]);
    expect(downloads[0][1]).toMatch(/\.webm$/);
    expect(blob!.size).toBeGreaterThan(0);
    expect(n).toBe(0);
  });

  it('cancels mid-render without downloading', async () => {
    const downloads: [string, string][] = [];
    const blob = await renderTakeVideo({
      states: [
        { shown: 0, durMs: 10 },
        { shown: 1, durMs: 10 },
      ],
      width: 10,
      height: 10,
      mime: 'video/webm',
      gotoState: async () => ({}) as HTMLCanvasElement,
      makeSink: () =>
        ({
          canvas: {},
          ctx: { drawImage: () => {} },
          stream: { getTracks: () => [] },
        }) as never,
      recorderFactory: () =>
        ({
          state: 'inactive',
          ondataavailable: null,
          onstop: null,
          start() {},
          stop() {},
        }) as never,
      sleep: async () => {},
      isCancelled: () => true,
      download: (href, name) => downloads.push([href, name]),
    });
    expect(blob).toBeNull();
    expect(downloads).toEqual([]);
  });
});
