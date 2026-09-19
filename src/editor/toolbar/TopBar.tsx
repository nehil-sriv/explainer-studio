import { useRef } from 'react';
import { commands } from '../../store/commands.js';
import { recorder, useRecorder } from '../../recording/recorder.js';
import { useEditor, useEditorTheme } from '../storeHooks.js';
import { ExportMenu } from './ExportMenu.js';

/** Transport ribbon: project crumb, theme toggle, Preview/Record/Export/Open. */
export function TopBar() {
  const name = useEditor((s) => s.project.currentSceneName ?? 'Untitled project');
  const playing = useEditor((s) => s.playback.active);
  const shown = useEditor((s) => s.playback.shown);
  const total = useEditor((s) => s.project.comps.length);
  const [theme, toggleTheme] = useEditorTheme();
  const { status: recStatus } = useRecorder();
  const fileRef = useRef<HTMLInputElement>(null);

  const onOpenFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      commands.loadProject(JSON.parse(await f.text()));
    } catch {
      /* invalid project file — legacy alerts; shell stays on current doc */
    }
  };

  const toggleRecord = async () => {
    if (recStatus !== 'idle') {
      await recorder.stop();
      return;
    }
    // full legacy flow: rewind → recording layout → settle → capture → take
    await recorder.start(document.getElementById('scene'));
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
          <span
            className="es-readout es-readout--pill"
            data-testid="take-pos"
            data-cap="step"
            aria-label={`step ${shown} of ${total}`}
          >
            {shown}/{total}
          </span>
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
      {/* the tally lamp: red only while actually rolling */}
      <button
        className={'es-btn es-tally' + (recStatus !== 'idle' ? ' is-live' : '')}
        onClick={() => void toggleRecord()}
        title="region-capture the scene while the take auto-plays"
        aria-pressed={recStatus !== 'idle'}
      >
        <span className="es-tally-lamp" aria-hidden />
        {recStatus === 'recording' ? 'Recording' : recStatus === 'arming' ? 'Waiting…' : 'Record'}
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
