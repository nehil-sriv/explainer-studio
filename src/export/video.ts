import { runBoundaries } from '../domain/step.js';
import { isStepped, stepTotalFor } from '../catalog/lines.js';
import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';
import { resolveSceneAtStep } from '../renderer/visibility.js';
import { RecordingSession, type RecorderFactory } from '../recording/session.js';
import { downloadUrl } from './stills.js';

/**
 * WebM/MP4 take export — legacy exportVideo parity: one frame set per run
 * boundary (blank + 3 settled frames per run: anim½, anim½, hold — CSS
 * entrances can't be sampled headless, so settled frames carry the
 * durations), drawn onto a canvas.captureStream + MediaRecorder.
 */

export interface VideoState {
  shown: number;
  durMs: number;
}

/** Frame plan: blank 700ms, then 3 settled frames per run boundary. */
export function planVideoStates(
  comps: SceneComponent[],
  holdDefault: number,
): VideoState[] {
  if (!comps.length) return [];
  const ends = [0, ...runBoundaries(comps).filter((b) => b > 0)];
  // Legacy ends here — but that drops the finale: boundaries are run
  // STARTS, so the last run's frames never render ("every sequence state
  // (0=blank … n)" per the header comment). Always close at n.
  if (ends[ends.length - 1] !== comps.length) ends.push(comps.length);
  const states: VideoState[] = [{ shown: 0, durMs: 700 }];
  for (let bi = 1; bi < ends.length; bi++) {
    const k = ends[bi];
    const mem = comps.slice(ends[bi - 1], k);
    const animMs = Math.round(
      (mem.length
        ? Math.max(...mem.map((c) => (c.animDelay || 0) + (c.animDur || 0.6)))
        : 0.6) * 1000,
    );
    const holdMs = Math.round(
      (mem.length
        ? Math.max(
            ...mem.map((c) => {
              const per = parseFloat(String(c.seqHold));
              return isFinite(per) && per >= 0 ? per : holdDefault;
            }),
          )
        : holdDefault) * 1000,
    );
    states.push(
      { shown: k, durMs: Math.round(animMs * 0.5) },
      { shown: k, durMs: Math.round(animMs * 0.5) },
      { shown: k, durMs: holdMs },
    );
  }
  return states;
}

export interface TakeFrame {
  comps: SceneComponent[];
  edges: Edge[];
  shown: number;
  revealed: Record<string, number>;
}

/** True when no visible stepped line is left unrevealed at shown. */
export function linesSettled(frame: TakeFrame): boolean {
  const vis = new Set(resolveSceneAtStep(frame.comps, frame.edges, frame.shown).visibleIds);
  return !frame.comps.some((c) => {
    if (!vis.has(c.id) || !isStepped(c)) return false;
    const total = stepTotalFor(c);
    return (frame.revealed[c.id] ?? total) < total;
  });
}

export interface VideoSink {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stream: MediaStream;
}

export interface VideoDeps {
  states: VideoState[];
  width: number;
  height: number;
  mime: string;
  fps?: number;
  gotoState: (shown: number) => Promise<HTMLCanvasElement>;
  makeSink: (w: number, h: number) => VideoSink;
  recorderFactory?: RecorderFactory;
  sleep: (ms: number) => Promise<void>;
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
  download?: (href: string, name: string) => void;
  objectURL?: (blob: Blob) => string;
}

function defaultObjectURL(blob: Blob): string {
  if (typeof URL.createObjectURL === 'function') return URL.createObjectURL(blob);
  throw new Error('blob URLs unavailable in this environment');
}

export function videoBitrate(w: number, h: number, fps: number): number {
  return Math.min(50e6, Math.max(8e6, Math.round(w * h * fps * 0.2)));
}

export async function renderTakeVideo(deps: VideoDeps): Promise<Blob | null> {
  const fps = deps.fps ?? 30;
  const sink = deps.makeSink(deps.width, deps.height);
  const session = new RecordingSession(sink.stream, {
    mimeType: deps.mime,
    recorderFactory: deps.recorderFactory,
  });
  session.start();
  try {
    for (let i = 0; i < deps.states.length; i++) {
      if (deps.isCancelled?.()) return null;
      const st = deps.states[i];
      const cv = await deps.gotoState(st.shown);
      sink.ctx.drawImage(cv, 0, 0);
      deps.onProgress?.(i + 1, deps.states.length);
      await deps.sleep(st.durMs);
    }
    await deps.sleep(400);
    const blob = await session.stop();
    const ext = deps.mime.includes('mp4') ? 'mp4' : 'webm';
    const date = new Date().toISOString().slice(0, 10);
    (deps.download ?? downloadUrl)(
      (deps.objectURL ?? defaultObjectURL)(blob),
      `explainer-scene-${date}.${ext}`,
    );
    return blob;
  } finally {
    if (!session.active) {
      for (const track of sink.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* already stopped */
        }
      }
    }
  }
}
