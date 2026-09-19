import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { PopoutApp } from './PopoutApp.js';
import { POPOUT_CHANNEL, postPopoutFrame, type PopoutFrameMessage } from './sync.js';
import { importProjectFile } from '../domain/migrations.js';

function frameFor(shown: number): PopoutFrameMessage {
  const raw = JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'));
  const { project } = importProjectFile(raw);
  return {
    v: 1,
    comps: project.comps!,
    edges: project.edges!,
    scene: { w: 1920, h: 1080 },
    theme: 'studio-black',
    active: true,
    shown,
    revealed: {},
  };
}

const ids = (html: string): string[] =>
  [...html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);

describe('popout mirror', () => {
  it('waits for the editor with no frame yet', () => {
    expect(renderToString(<PopoutApp />)).toContain('Waiting for the editor');
  });

  it('renders the identical take state as the editor frame', () => {
    // editor take at shown=5 shows [lb, db] (clearBefore) — popout agrees
    const html = renderToString(<PopoutApp initial={frameFor(5)} />);
    expect(ids(html)).toEqual(['lb', 'db']);
    expect(html).toContain('data-theme="studio-black"');
    // no editor chrome ever leaks into the mirror
    expect(html).not.toContain('es-topbar');
    expect(html).not.toContain('es-takebar');
  });

  it('posts frames on the popout channel without depending on it', () => {
    expect(POPOUT_CHANNEL).toBe('explainer-studio-popout');
    expect(() => postPopoutFrame(frameFor(1))).not.toThrow();
  });
});
