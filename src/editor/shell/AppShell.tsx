import { useEffect, useState } from 'react';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import { recorder, useRecorder } from '../../recording/recorder.js';
import { TopBar } from '../toolbar/TopBar.js';
import { ComponentLibrary } from '../library/ComponentLibrary.js';
import { RAIL_SECTIONS } from '../library/catalog.js';
import { CanvasWorkspace } from '../canvas/CanvasWorkspace.js';
import { PropertiesInspector } from '../inspector/PropertiesInspector.js';
import { StoryPanel } from '../story/StoryPanel.js';
import { useEditor } from '../storeHooks.js';
import './shell.css';
import fixtureJson from '../../../migration/fixtures/phase0-coverage.json';

/**
 * AppShell — TopBar / filter rail / library / canvas / inspector / story.
 * Boots with the Phase 0 coverage fixture so existing projects display
 * immediately; 📂 Open loads any project file through the command layer.
 */
/** The one control that must survive chrome hiding while rolling. */
function RecHud({ status, cropped }: { status: string; cropped: boolean }) {
  const shown = useEditor((s) => s.playback.shown);
  const total = useEditor((s) => s.project.comps.length);
  const { elapsedMs } = useRecorder();
  const secs = Math.floor(elapsedMs / 1000);
  const timer = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <div className="es-rechud">
      <div className={'es-tally' + (status === 'recording' ? ' is-live' : '')}>
        <span className="es-tally-lamp" aria-hidden />
        {status === 'recording' ? 'Recording' : 'Waiting for capture'}
      </div>
      <div className="es-rechud-readout es-readout">
        <span className="es-readout-cap">time</span>
        {timer}
      </div>
      <div className="es-rechud-readout es-readout">
        <span className="es-readout-cap">step</span>
        {shown}/{total}
      </div>
      {!cropped && status === 'recording' && (
        <p className="es-pane-hint">
          No region crop in this browser — keep the ⧉ Popout tab in front so it fills the clip.
        </p>
      )}
      <button className="es-btn primary" onClick={() => void recorder.stop()}>
        ⏹ Stop and save
      </button>
      <p className="es-pane-hint">Space advances; the take ends itself after the last step.</p>
    </div>
  );
}

export function AppShell() {
  const [section, setSection] = useState<string>('components');
  const [libOpen, setLibOpen] = useState(true);
  const { status: recStatus, cropped } = useRecorder();

  useEffect(() => {
    if (editorStore.getState().project.comps.length === 0) {
      commands.loadProject(fixtureJson);
    }
  }, []);

  const pickSection = (key: string) => {
    setSection(key);
    setLibOpen(true);
  };

  const recording = recStatus !== 'idle';
  return (
    <div
      className={
        'es-root' + (libOpen ? '' : ' no-lib') + (recording ? ' is-recording' : '')
      }
    >
      <TopBar />
      <nav className="es-rail" aria-label="library sections">
        {RAIL_SECTIONS.filter((f) => f.key !== 'settings').map((f) => (
          <button
            key={f.key}
            className={section === f.key && libOpen ? 'on' : ''}
            onClick={() => (section === f.key && libOpen ? setLibOpen(false) : pickSection(f.key))}
          >
            <span className="glyph">{f.glyph}</span>
            <span>{f.label}</span>
          </button>
        ))}
        <span className="grow" />
        <button
          className={section === 'settings' && libOpen ? 'on' : ''}
          onClick={() => (section === 'settings' && libOpen ? setLibOpen(false) : pickSection('settings'))}
        >
          <span className="glyph">⚙</span>
          <span>Settings</span>
        </button>
      </nav>
      <aside className="es-lib">
        <ComponentLibrary section={section} onCollapse={() => setLibOpen(false)} />
      </aside>
      <CanvasWorkspace />
      <aside className="es-insp">
        {recording ? (
          <RecHud status={recStatus} cropped={cropped} />
        ) : (
          <PropertiesInspector />
        )}
      </aside>
      <div className="es-storywrap">
        <div className="es-story-head">
          <h2>Story</h2>
          <button className="es-btn" onClick={() => commands.addScene()}>+ Add scene</button>
        </div>
        <div className="es-story" data-testid="sequence">
          <StoryPanel />
        </div>
      </div>
    </div>
  );
}
