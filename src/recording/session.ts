/**
 * Recording capture — region-cropped screen capture down to a .webm file.
 * Browser APIs are guarded throughout (Safari rejects surface hints, so a
 * bare request is the fallback); all logic around them is pure/testable.
 */

export type MediaRecorderLike = {
  state: string;
  start: (timeslice?: number) => void;
  stop: () => void;
  ondataavailable: ((ev: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
};

export type RecorderFactory = (
  stream: MediaStream,
  opts: { mimeType?: string; videoBitsPerSecond?: number },
) => MediaRecorderLike;

/** Legacy pickRecMime order (video-only): mp4/avc1 → mp4 → vp9 → vp8 → webm. */
export function pickMimeType(
  isTypeSupported?: (t: string) => boolean,
): string {
  const supported =
    isTypeSupported ??
    (typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function'
      ? (t: string) => MediaRecorder.isTypeSupported(t)
      : undefined);
  if (!supported) return '';
  for (const t of [
    'video/mp4;codecs=avc1.42001f',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]) {
    try {
      if (supported(t)) return t;
    } catch {
      /* ignore and try the next */
    }
  }
  return '';
}

/** Container extension for a MediaRecorder mime (legacy parity: mp4 else webm). */
export function mimeExtension(mime: string | undefined): 'mp4' | 'webm' {
  return (mime || '').includes('mp4') ? 'mp4' : 'webm';
}

/**
 * Clip filename. The extension follows the container MediaRecorder actually
 * produced — naming an MP4 ".webm" makes editors refuse it.
 */
export function recordingFilename(mime?: string, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `explainer-${stamp}.${mimeExtension(mime)}`;
}

export interface RecordingSessionOpts {
  mimeType?: string;
  videoBitsPerSecond?: number;
  timesliceMs?: number;
  recorderFactory?: RecorderFactory;
  onBlob?: (blob: Blob, filename: string) => void;
}

const defaultFactory: RecorderFactory = (stream, opts) =>
  new MediaRecorder(
    stream,
    opts.mimeType || opts.videoBitsPerSecond
      ? { mimeType: opts.mimeType, videoBitsPerSecond: opts.videoBitsPerSecond }
      : undefined,
  ) as unknown as MediaRecorderLike;

/** Collects chunks while recording; stop() resolves the assembled Blob. */
export class RecordingSession {
  private recorder: MediaRecorderLike | null = null;
  private chunks: Blob[] = [];
  private stopped = false;

  constructor(
    private stream: MediaStream,
    private opts: RecordingSessionOpts = {},
  ) {}

  get active(): boolean {
    return !!this.recorder && !this.stopped;
  }

  start(): void {
    if (this.recorder) return;
    const factory = this.opts.recorderFactory ?? defaultFactory;
    const rec = factory(this.stream, { mimeType: this.opts.mimeType });
    this.recorder = rec;
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
    };
    rec.start(this.opts.timesliceMs ?? 250);
  }

  stop(): Promise<Blob> {
    const rec = this.recorder;
    if (!rec) return Promise.resolve(new Blob([], { type: 'video/webm' }));
    this.stopped = true;
    return new Promise((resolve) => {
      const finish = () => {
        const mime = this.opts.mimeType || 'video/webm';
        // blob type is the container only — codecs in `type` break playback
        const blob = new Blob(this.chunks, { type: mime.split(';')[0] });
        for (const track of this.stream.getTracks()) {
          try {
            track.stop();
          } catch {
            /* already stopped */
          }
        }
        this.opts.onBlob?.(blob, recordingFilename(mime));
        resolve(blob);
      };
      rec.onstop = finish;
      try {
        rec.stop();
      } catch {
        finish();
      }
    });
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export interface CapturedRegion {
  stream: MediaStream;
  /** true when the stream was cropped to the scene (Region Capture worked) */
  cropped: boolean;
  cleanup: () => void;
}

/**
 * Screen-capture cropped to the scene element (Region Capture).
 *
 * Mirrors the legacy constraints (ideal 4K so the crop has headroom, 30fps,
 * current surface included). Falls back to a bare capture when surface hints
 * are rejected (Safari) — `cropped` then tells the caller to point people at
 * the popout tab.
 */
export async function startRegionCapture(
  sceneEl: Element | null,
): Promise<CapturedRegion> {
  const md = navigator.mediaDevices;
  if (!md?.getDisplayMedia) {
    throw new Error('screen capture is not supported in this browser');
  }
  let stream: MediaStream;
  try {
    stream = await md.getDisplayMedia({
      video: {
        displaySurface: 'browser',
        width: { ideal: 3840 },
        height: { ideal: 3840 },
        frameRate: { ideal: 30 },
      } as MediaTrackConstraints,
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
    } as DisplayMediaStreamOptions);
  } catch {
    // Safari rejects surface hints — retry bare (tab capture excludes
    // browser chrome; window captures bake the OS title bar in).
    stream = await md.getDisplayMedia({ video: true, audio: false });
  }
  let cropped = false;
  try {
    const CT = (window as unknown as Record<string, unknown>)['CropTarget'];
    if (CT && sceneEl && typeof (CT as Record<string, unknown>)['fromElement'] === 'function') {
      const target = await (
        CT as { fromElement: (el: Element) => Promise<unknown> }
      ).fromElement(sceneEl);
      const [track] = stream.getVideoTracks();
      await (track as unknown as { cropTo: (t: unknown) => Promise<void> }).cropTo(target);
      cropped = true;
    }
  } catch {
    /* uncropped capture still records — user picks the popout tab */
  }
  return {
    stream,
    cropped,
    cleanup: () => {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}

/** Bitrate heuristic (legacy parity): ~0.2 bits/pixel/frame, clamped 8–50 Mbps. */
export function recordingBitrate(w: number, h: number, fps = 30): number {
  return Math.min(50e6, Math.max(8e6, Math.round(w * h * fps * 0.2)));
}
