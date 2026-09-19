import { useRef } from 'react';
import { commands } from '../../store/commands.js';
import {
  RecordingSession,
  downloadBlob,
  pickMimeType,
  startRegionCapture,
} from '../../recording/session.js';
import { useEditor, useEditorTheme } from '../storeHooks.js';
import { ExportMenu } from './ExportMenu.js';

/** Transport ribbon: project crumb, theme toggle, Preview/Record/Export/Open. */
export function TopBar() {
  const name = useEditor((s) => s.project.currentSceneName ?? 'Untitled project');
  const playing = useEditor((s) => s.playback.active);
  const shown = useEditor((s) => s.playback.shown);
  const total = useEditor((s) => s.project.comps.length);
  const recStatus = useEditor((s) => s.exportState.status);
  const [theme, toggleTheme] = useEditorTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<RecordingSession | null>(null);

  const onOpenFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      commands.loadProject(JSON.parse(await f.text()));
    } catch {
      /* invalid project file — legacy alerts; shell stays on current doc */
    }
  };

  const toggleRecord = async () => {
    if (recStatus === 'recording') {
      const session = sessionRef.current;
      sessionRef.current = null;
      commands.setExportStatus('idle');
      commands.stopAuto();
      commands.stopPlayback();
      if (session) {
        try {
          const blob = await session.stop();
          downloadBlob(blob, `explainer-${new Date().toISOString().slice(0, 10)}.webm`);
        } catch {
          /* download failed — the take state is untouched */
        }
      }
      return;
    }
    try {
      const { stream } = await startRegionCapture(document.getElementById('scene'));
      const session = new RecordingSession(stream, { mimeType: pickMimeType() });
      session.start();
      sessionRef.current = session;
      commands.setExportStatus('recording');
      commands.startAuto();
    } catch (err) {
      commands.setExportStatus('idle');
      alert(
        `capture failed (${err instanceof Error ? err.message : err}) — ` +
          'open the ⧉ Popout and pick its tab instead',
      );
    }
  };

  return (
    <header className="es-topbar">
      <span className="es-logo"><span className="es-logo-mark">▷</span>Explainer Studio</span>
      <span className="es-top-sep" />
      <span className="es-crumb">Projects &nbsp;›&nbsp; <b>{name}</b> ⌄</span>
      <span className="es-spacer" />
      {playing && (
        <>
          <button className="es-btn" onClick={() => commands.stepBack()} title="back">←</button>
          <span className="es-crumb" data-testid="take-pos">{shown}/{total}</span>
          <button className="es-btn" onClick={() => commands.stepNext()} title="next (Space in legacy)">→</button>
        </>
      )}
      <button
        className="es-btn"
        onClick={() => (playing ? commands.stopPlayback() : commands.play())}
        title={playing ? 'exit to edit (Esc in legacy)' : 'play from blank'}
      >
        {playing ? '⏹ Stop' : '▶ Preview'}
      </button>
      <button
        className="es-btn"
        onClick={() => void toggleRecord()}
        title="region-capture the scene while the take auto-plays"
      >
        {recStatus === 'recording' ? '⏺ Recording…' : '⏺ Record'}
      </button>
      <button
        className="es-btn"
        onClick={() => window.open('popout.html', '_blank')}
        title="borderless scene mirror for OBS"
      >
        ⧉ Popout
      </button>
      <ExportMenu />
      <button className="es-btn" onClick={() => fileRef.current?.click()} title="open project JSON">
        📂 Open
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => {
          void onOpenFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button className="es-icon-btn" onClick={toggleTheme} title="editor light/dark (canvas themes independent)">
        {theme === 'light' ? '☀' : '☾'}
      </button>
      <span className="es-avatar" title="local profile">JD</span>
    </header>
  );
}
