/**
 * GIF take export — legacy exportGIF parity: live-capture the canvas as-is
 * (~8fps × duration, ambient loops play, takes/steps untouched), then
 * gif.js assembly with Blob-URL workers + stall watchdog.
 * File I/O, timers and the encoder are injected — headless-testable.
 */

export interface GifFrame {
  canvas: HTMLCanvasElement;
  delayMs: number;
}

export interface GifEncoder {
  addFrame: (cv: HTMLCanvasElement, opts: { copy: boolean; delay: number }) => void;
  on: (ev: 'progress' | 'finished', cb: (arg: never) => void) => void;
  render: () => void;
  abort: () => void;
}

export type GifFactory = (opts: Record<string, unknown>) => GifEncoder;

export const GIF_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js';

/** Blob-URL worker (inherits our origin — file:// safe); CDN fallback. */
export async function gifWorkerScript(deps?: {
  fetchFn?: typeof fetch;
  createObjectURL?: (b: Blob) => string;
}): Promise<string> {
  try {
    const fetchFn = deps?.fetchFn ?? fetch;
    const r = await fetchFn(GIF_CDN);
    if (!r.ok) throw new Error(`worker fetch ${r.status}`);
    const createURL =
      deps?.createObjectURL ??
      (typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL.bind(URL)
        : undefined);
    if (!createURL) throw new Error('no blob URLs here');
    return createURL(new Blob([await r.text()], { type: 'application/javascript' }));
  } catch {
    return GIF_CDN;
  }
}

export function defaultGifFactory(opts: Record<string, unknown>): GifEncoder {
  const G = (window as unknown as Record<string, unknown>)['GIF'];
  if (typeof G !== 'function') {
    throw new Error('gif.js not loaded — needs internet once for the CDN encoder');
  }
  return (G as (o: Record<string, unknown>) => GifEncoder)(opts);
}

/** Frame plan: ~8fps live capture, 2–96 frames (legacy collectLiveFrames). */
export function planGifFrames(totalMs: number, intervalMs = 125): number {
  return Math.max(2, Math.min(96, Math.round(totalMs / intervalMs)));
}

export async function collectFrames(deps: {
  totalMs: number;
  rasterizeOne: () => Promise<HTMLCanvasElement>;
  sleep: (ms: number) => Promise<void>;
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
}): Promise<GifFrame[]> {
  const n = planGifFrames(deps.totalMs);
  const out: GifFrame[] = [];
  for (let i = 0; i < n; i++) {
    if (deps.isCancelled?.()) break;
    deps.onProgress?.(i + 1, n);
    out.push({ canvas: await deps.rasterizeOne(), delayMs: 125 });
  }
  return out;
}

export async function encodeGif(deps: {
  frames: HTMLCanvasElement[] | GifFrame[];
  width: number;
  height: number;
  background: string;
  workerScript: string;
  gifFactory?: GifFactory;
  onProgress?: (p: number) => void;
  /** stall watchdog (ms of encoder silence); 0 disables (tests) */
  watchdogMs?: number;
  /** watchdog check interval (default 5000; tests shrink it) */
  watchdogEveryMs?: number;
  now?: () => number;
}): Promise<Blob> {
  const factory = deps.gifFactory ?? defaultGifFactory;
  const frames = deps.frames.map((f) =>
    'canvas' in f ? f : { canvas: f as HTMLCanvasElement, delayMs: 125 },
  );
  const gif = factory({
    workers: 2,
    quality: 9,
    width: deps.width,
    height: deps.height,
    repeat: 0,
    workerScript: deps.workerScript,
    background: deps.background,
  });
  for (const f of frames) {
    gif.addFrame(f.canvas, {
      copy: true,
      delay: Math.max(100, Math.min(10000, f.delayMs)),
    });
  }
  const now = deps.now ?? Date.now;
  let lastTick = now();
  gif.on('progress', (p) => {
    lastTick = now();
    deps.onProgress?.(p as number);
  });
  return new Promise<Blob>((resolve, reject) => {
    let watchdog: ReturnType<typeof setInterval> | null = null;
    if ((deps.watchdogMs ?? 90000) > 0) {
      const every = deps.watchdogEveryMs ?? 5000;
      watchdog = setInterval(() => {
        if (now() - lastTick > (deps.watchdogMs ?? 90000)) {
          if (watchdog) clearInterval(watchdog);
          try {
            gif.abort();
          } catch {
            /* already dead */
          }
          reject(new Error('GIF encoder stalled — workers blocked? Try WebM export instead'));
        }
      }, every);
    }
    gif.on('finished', (blob) => {
      if (watchdog) clearInterval(watchdog);
      resolve(blob as Blob);
    });
    try {
      gif.render();
    } catch (err) {
      if (watchdog) clearInterval(watchdog);
      reject(err);
    }
  });
}
