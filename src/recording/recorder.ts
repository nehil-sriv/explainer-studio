import { useSyncExternalStore } from 'react';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import {
  RecordingSession,
  downloadBlob,
  pickMimeType,
  recordingBitrate,
  recordingFilename,
  startRegionCapture,
} from './session.js';

/**
 * Recording controller — the legacy ⏺ REC flow, rebuilt for the React shell.
 *
 * The old builder's recording worked because it did five things in order:
 *   1. rewound the story to a blank first frame,
 *   2. switched the workbench into "rec-crop" (chrome hidden, canvas fills
 *      the window) and re-fit, so the capture is as large as the display,
 *   3. let layout settle before resolving the crop region,
 *   4. ran the take on hold timing while MediaRecorder rolled,
 *   5. tore the mode down and downloaded the clip.
 *
 * The React port only did steps 4 and 5, so it recorded a small editor-sized
 * canvas. This controller restores the whole sequence. It owns the browser
 * APIs and drives `exportState.status`, which the shell reads to enter the
 * recording layout.
 */

export type RecorderStatus = 'idle' | 'arming' | 'recording';

export interface RecorderSnapshot {
  status: RecorderStatus;
  /** true when Region Capture cropped to the scene (false → popout guidance) */
  cropped: boolean;
  elapsedMs: number;
}

function settle(): Promise<void> {
  return new Promise((resolve) => {
    const raf =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16);
    raf(() => raf(() => setTimeout(resolve, 250)));
  });
}

class RecorderController {
  private status: RecorderStatus = 'idle';
  private cropped = false;
  private startedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private session: RecordingSession | null = null;
  private unsubPlayback: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private snap: RecorderSnapshot = { status: 'idle', cropped: false, elapsedMs: 0 };

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = (): RecorderSnapshot => this.snap;

  private emit(): void {
    this.snap = {
      status: this.status,
      cropped: this.cropped,
      elapsedMs: this.status === 'recording' ? Date.now() - this.startedAt : 0,
    };
    for (const l of this.listeners) l();
  }

  private clearTimers(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
  }

  /** Full teardown: leave rec layout, drop the take, reset status. */
  private teardown(): void {
    this.clearTimers();
    this.unsubPlayback?.();
    this.unsubPlayback = null;
    commands.stopAuto();
    commands.stopPlayback();
    commands.setExportStatus('idle');
    this.status = 'idle';
    this.cropped = false;
    this.session = null;
    this.emit();
  }

  private scheduleAutoStop(ms: number): void {
    if (this.autoStopTimer || this.status !== 'recording') return;
    this.autoStopTimer = setTimeout(() => {
      this.autoStopTimer = null;
      void this.stop();
    }, ms);
  }

  async start(sceneEl: HTMLElement | null): Promise<Blob | null> {
    if (this.status !== 'idle') return null;
    const st = editorStore.getState();
    if (!st.project.comps.length) {
      alert('nothing to record — add components from the library first');
      return null;
    }
    this.status = 'arming';
    this.cropped = false;
    this.emit();

    // 1 · rewind to a blank first frame (clears selection too)
    commands.stopAuto();
    commands.play(0);
    // 2 · enter the recording layout so the canvas fills the window and re-fits
    commands.setExportStatus('recording');
    // 3 · let layout + the fit observer settle before resolving the crop
    await settle();

    let stream: MediaStream;
    try {
      const cap = await startRegionCapture(sceneEl);
      stream = cap.stream;
      this.cropped = cap.cropped;
      this.emit();
    } catch (err) {
      this.teardown();
      if (!err || ((err as DOMException).name !== 'AbortError' && (err as DOMException).name !== 'NotAllowedError')) {
        console.warn('capture failed:', err);
      }
      return null;
    }

    const mime = pickMimeType();
    if (!mime) {
      for (const t of stream.getTracks()) t.stop();
      this.teardown();
      alert('MediaRecorder is not available in this browser');
      return null;
    }

    const { w, h } = editorStore.getState().project.scene;
    const session = new RecordingSession(stream, {
      mimeType: mime,
      videoBitsPerSecond: recordingBitrate(w, h),
    });
    this.session = session;
    session.start();

    this.status = 'recording';
    this.startedAt = Date.now();
    this.emit();
    this.timer = setInterval(() => this.emit(), 250);

    // 4 · run the take; stop a beat after the last step so the tail survives
    commands.startAuto();
    this.unsubPlayback = editorStore.subscribe(() => {
      if (this.status !== 'recording') return;
      if (!editorStore.getState().playback.active) this.scheduleAutoStop(1200);
    });
    return null;
  }

  /** Stop rolling, download the clip, and return to editing. */
  async stop(): Promise<Blob | null> {
    if (this.status === 'idle') return null;
    const session = this.session;
    this.session = null;
    // 5 · stop the take first so the recorder settles on the final frame
    commands.stopAuto();
    commands.stopPlayback();
    let blob: Blob | null = null;
    if (session) {
      try {
        blob = await session.stop();
      } catch (err) {
        console.warn('recorder stop failed:', err);
      }
    }
    this.teardown();
    // name the file after the container that was actually recorded (mp4/webm)
    if (blob && blob.size > 0) downloadBlob(blob, recordingFilename(blob.type));
    return blob;
  }
}

export const recorder = new RecorderController();

/** Subscribe the chrome to recorder status (tally, HUD, layout). */
export function useRecorder(): RecorderSnapshot {
  return useSyncExternalStore(recorder.subscribe, recorder.getSnapshot, recorder.getSnapshot);
}
