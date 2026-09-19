import { useEffect, useState } from 'react';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import { TopBar } from '../toolbar/TopBar.js';
import { ComponentLibrary } from '../library/ComponentLibrary.js';
import { RAIL_SECTIONS } from '../library/catalog.js';
import { CanvasWorkspace } from '../canvas/CanvasWorkspace.js';
import { PropertiesInspector } from '../inspector/PropertiesInspector.js';
import { StoryPanel } from '../story/StoryPanel.js';
import './shell.css';
import fixtureJson from '../../../migration/fixtures/phase0-coverage.json';

/**
 * AppShell — TopBar / filter rail / library / canvas / inspector / story.
 * Boots with the Phase 0 coverage fixture so existing projects display
 * immediately; 📂 Open loads any project file through the command layer.
 */
export function AppShell() {
  const [section, setSection] = useState<string>('components');
  const [libOpen, setLibOpen] = useState(true);

  useEffect(() => {
    if (editorStore.getState().project.comps.length === 0) {
      commands.loadProject(fixtureJson);
    }
  }, []);

  const pickSection = (key: string) => {
    setSection(key);
    setLibOpen(true);
  };

  return (
    <div className={'es-root' + (libOpen ? '' : ' no-lib')}>
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
        <PropertiesInspector />
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
