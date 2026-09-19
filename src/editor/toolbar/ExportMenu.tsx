import { useState } from 'react';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import { toFileJson } from '../../persistence/projectFile.js';
import { useEditor } from '../storeHooks.js';
import {
  consumeExportCancel,
  isExportCancelled,
  requestExportCancel,
} from '../../export/cancel.js';
import {
  collectFrames,
  encodeGif,
  gifWorkerScript,
  type GifFactory,
} from '../../export/gif.js';
import {
  linesSettled,
  planVideoStates,
  renderTakeVideo,
  videoBitrate,
} from '../../export/video.js';
import {
  compPngName,
  downloadUrl,
  exportCompPNG,
  exportFramePNG,
  exportFrameSVG,
  sceneFilename,
} from '../../export/stills.js';
import {
  rasterizeCanvas,
  requireScene,
  type RasterLib,
} from '../../export/raster.js';
import {
  pickMimeType,
  type RecorderFactory,
} from '../../recording/session.js';

export interface ExportMenuDeps {
  rasterLib?: RasterLib;
  download?: (href: string, name: string) => void;
  gifFactory?: GifFactory;
  workerScript?: string;
  sleep?: (ms: number) => Promise<void>;
  recorderFactory?: RecorderFactory;
  objectURL?: (blob: Blob) => string;
  /** pre-made video sink (tests; default builds a live canvas) */
  sink?: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; stream: MediaStream };
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

function canvasBg(scene: HTMLElement): string {
  try {
    const v = getComputedStyle(scene).getPropertyValue('--bg-deep').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  } catch {
    /* fall through */
  }
  return '#0A0F0A';
}

/** Walk the live take to every video state (settled lines included). */
async function walkTake(
  ends: number[],
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  for (const k of ends) {
    for (;;) {
      const st = editorStore.getState();
      const frame = {
        comps: st.project.comps,
        edges: st.project.edges,
        shown: st.playback.shown,
        revealed: st.playback.revealed,
      };
      if (st.playback.shown >= k && linesSettled(frame)) break;
      if (!st.playback.active || isExportCancelled()) return;
      commands.stepNext();
      await sleep(30);
    }
  }
}

/**
 * Export menu — one-click stills + take movies. Every path renders the
 * resolved take state (no capture picker, no legacy DOM ids).
 */
export function ExportMenu({ deps }: { deps?: ExportMenuDeps }) {
  const busy = useEditorBusy();
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState('0.5');
  const [gifSecs, setGifSecs] = useState('3');
  const [status, setStatus] = useState('');
  const sleep = deps?.sleep ?? realSleep;
  const download = deps?.download ?? downloadUrl;

  const run = async (label: string, fn: () => Promise<string | null>) => {
    if (busy) return;
    if (editorStore.getState().exportState.status === 'recording') {
      setStatus('stop recording first');
      return;
    }
    commands.setExportStatus('exporting');
    consumeExportCancel();
    setStatus(label);
    try {
      const done = await fn();
      if (done) setStatus(done);
    } catch (err) {
      setStatus(`⚠ ${err instanceof Error ? err.message : err}`);
    } finally {
      commands.setExportStatus('idle');
    }
  };

  const projectJSON = () =>
    run('packing project…', async () => {
      const st = editorStore.getState();
      const json = toFileJson(st.project as never);
      const safe = (st.project.currentSceneName || 'clip')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'clip';
      const href = deps?.objectURL
        ? deps.objectURL(new Blob([json], { type: 'application/json' }))
        : URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      download(href, `explainer-${safe}.json`);
      return '✔ project saved';
    });

  const pngStill = () =>
    run('rendering PNG…', async () => {
      const scene = requireScene();
      await exportFramePNG(scene, {
        pixelRatio: 2,
        lib: deps?.rasterLib,
        download,
        projectName: editorStore.getState().project.currentSceneName ?? undefined,
      });
      return '✔ PNG saved';
    });

  const svgStill = () =>
    run('rendering SVG…', async () => {
      const scene = requireScene();
      await exportFrameSVG(scene, {
        lib: deps?.rasterLib,
        download,
        projectName: editorStore.getState().project.currentSceneName ?? undefined,
      });
      return '✔ SVG saved (current canvas state)';
    });

  const compPNGs = () =>
    run('rendering components…', async () => {
      const st = editorStore.getState();
      const scene = requireScene();
      const picked = st.selection.compIds.length
        ? st.project.comps.filter((c) => st.selection.compIds.includes(c.id))
        : st.project.comps.filter((c) => c.type !== 'state');
      let i = 0;
      for (const c of picked) {
        if (isExportCancelled()) return 'cancelled';
        const el = scene.querySelector(`[data-id="${c.id}"]`) as HTMLElement | null;
        if (!el) continue;
        setStatus(`component ${++i}/${picked.length}… (Esc cancels)`);
        await exportCompPNG(scene, el, c, st.project.comps.indexOf(c), {
          lib: deps?.rasterLib,
          download,
        });
        await sleep(350);
      }
      return `✔ ${i} component PNG${i === 1 ? '' : 's'} saved`;
    });

  const gifTake = () =>
    run('capturing live canvas…', async () => {
      const st = editorStore.getState();
      if (!st.project.comps.length) return 'nothing to export — add components first';
      const scene = requireScene();
      const scaleNum = parseFloat(scale) || 0.5;
      const frames = await collectFrames({
        totalMs: Math.max(500, parseFloat(gifSecs) || 3) * 1000,
        rasterizeOne: () => rasterizeCanvas(scene, scaleNum, deps?.rasterLib),
        sleep,
        onProgress: (d, n) => setStatus(`capturing live canvas ${d}/${n}… (Esc cancels)`),
        isCancelled: isExportCancelled,
      });
      if (isExportCancelled()) return 'cancelled';
      if (!frames.length) return 'cancelled';
      const first = frames[0].canvas;
      setStatus('encoding GIF… (starting workers)');
      const blob = await encodeGif({
        frames,
        width: first.width,
        height: first.height,
        background: canvasBg(scene),
        workerScript: deps?.workerScript ?? (await gifWorkerScript()),
        gifFactory: deps?.gifFactory,
        onProgress: (p) => setStatus(`encoding GIF… ${Math.round(p * 100)}% (${frames.length} frames)`),
      });
      download(
        deps?.objectURL ? deps.objectURL(blob) : URL.createObjectURL(blob),
        sceneFilename('scene', 'gif', st.project.currentSceneName ?? undefined),
      );
      return `✔ GIF saved · ${frames.length} frames · ${first.width}×${first.height}`;
    });

  const webmTake = () =>
    run('rendering steps…', async () => {
      const st0 = editorStore.getState();
      if (!st0.project.comps.length) return 'nothing to export — add components first';
      if (typeof MediaRecorder === 'undefined') {
        return 'MediaRecorder unavailable in this browser';
      }
      const mime = pickMimeType();
      if (!mime) return 'no supported video mime (need mp4/webm)';
      const scene = requireScene();
      const take = {
        active: st0.playback.active,
        shown: st0.playback.shown,
        maxShown: st0.playback.maxShown,
        revealed: structuredClone(st0.playback.revealed),
      };
      const scaleNum = parseFloat(scale) || 0.5;
      try {
        commands.play(0);
        const states = planVideoStates(
          editorStore.getState().project.comps,
          editorStore.getState().playback.holdDefault,
        );
        const ends = [...new Set(states.map((s) => s.shown))].sort((a, b) => a - b);
        await walkTake(ends, sleep);
        if (isExportCancelled()) return 'cancelled';
        const rasterOne = () => rasterizeCanvas(scene, scaleNum, deps?.rasterLib);
        const first = await rasterOne();
        const W = first.width;
        const H = first.height;
        let sink: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; stream: MediaStream };
        let cleanupSink: (() => void) | null = null;
        if (deps?.sink) {
          sink = deps.sink;
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('2d canvas unavailable');
          const stream = (canvas as HTMLCanvasElement).captureStream(30);
          sink = { canvas, ctx, stream };
          cleanupSink = () => {
            for (const t of stream.getTracks()) {
              try {
                t.stop();
              } catch {
                /* already stopped */
              }
            }
          };
        }
        const gotoState = async (shown: number): Promise<HTMLCanvasElement> => {
          void shown; // walked into place above; rasterize the live canvas
          return rasterOne();
        };
        try {
          await renderTakeVideo({
            states,
            width: W,
            height: H,
            mime,
            fps: 30,
            gotoState,
            makeSink: () => sink,
            recorderFactory:
              deps?.recorderFactory ??
              ((s, o) =>
                new MediaRecorder(s, {
                  mimeType: o.mimeType,
                  videoBitsPerSecond: videoBitrate(W, H, 30),
                }) as unknown as import('../../recording/session.js').MediaRecorderLike),
            sleep,
            onProgress: (d, n) => setStatus(`recording ${d}/${n}… (Esc cancels)`),
            isCancelled: isExportCancelled,
            objectURL: deps?.objectURL,
            download,
          });
        } finally {
          cleanupSink?.();
        }
        const secs = states.reduce((n, s) => n + s.durMs, 0) / 1000;
        return mime.includes('mp4')
          ? `✔ video saved · ${secs.toFixed(1)}s · ${W}×${H} · mp4`
          : `✔ video saved · ${secs.toFixed(1)}s · ${W}×${H} · webm`;
      } finally {
        commands.restoreTake(take);
      }
    });

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="es-btn primary"
        onClick={() => setOpen((o) => !o)}
        title="one-click export: stills + take movies"
      >
        ⤴ Export
      </button>
      {open && (
        <div
          data-export-menu
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 50,
            background: 'var(--ed-panel-bg)',
            border: '1px solid var(--ed-border)',
            borderRadius: 14,
            padding: 14,
            width: 288,
            boxShadow: 'var(--ed-shadow-lg)',
          }}
        >
          <div className="es-row">
            <label>Scale</label>
            <select value={scale} onChange={(e) => setScale(e.target.value)} title="GIF/WebM raster scale">
              <option value="0.5">0.5× (small)</option>
              <option value="1">1×</option>
              <option value="2">2× (sharp)</option>
            </select>
          </div>
          <div className="es-row">
            <label>GIF secs</label>
            <select value={gifSecs} onChange={(e) => setGifSecs(e.target.value)}>
              <option value="2">2s</option>
              <option value="3">3s</option>
              <option value="6">6s</option>
            </select>
          </div>
          {(
            [
              ['Project JSON', projectJSON],
              ['PNG still', pngStill],
              ['SVG still', svgStill],
              ['Component PNGs', compPNGs],
              ['GIF take', gifTake],
              ['WebM take', webmTake],
            ] as [string, () => Promise<void>][]
          ).map(([label, fn]) => (
            <button
              key={label}
              className="es-btn"
              disabled={busy}
              style={{ display: 'block', width: '100%', marginBottom: 6, textAlign: 'left' }}
              onClick={() => void fn()}
            >
              {label}
            </button>
          ))}
          {busy && (
            <button className="es-btn" onClick={() => requestExportCancel()}>
              Cancel (Esc)
            </button>
          )}
          {status && <p style={{ fontSize: 11 }}>{status}</p>}
        </div>
      )}
    </div>
  );
}

function useEditorBusy(): boolean {
  return useEditor((s) => s.exportState.status === 'exporting');
}
