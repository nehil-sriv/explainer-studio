import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { act, render } from '@testing-library/react';
import { SceneView } from './canvas/SceneView.js';
import { importProjectFile } from '../domain/migrations.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import { AppShell } from './shell/AppShell.js';

function fixture() {
  const raw = JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'));
  return importProjectFile(raw).project;
}

const animOf = (html: string, id: string): string | null => {
  const m = html.match(new RegExp(`data-id="${id}"[^>]*style="([^"]*)"`));
  return m ? m[1] : null;
};

describe('SceneView entrances', () => {
  it('paints entrances only on the newly revealed run (delay skipped)', () => {
    const p = fixture();
    const base = {
      comps: p.comps!,
      edges: [],
      w: 1920,
      h: 1080,
      theme: 'studio-black',
      fit: 1,
      revealed: {},
      visibleIds: null,
      edgeIds: null,
    };
    const edit = renderToString(<SceneView {...base} active={false} shown={0} />);
    expect(edit).not.toContain('animation:');
    expect(edit).toContain('--ks:');
    const take1 = renderToString(<SceneView {...base} active shown={1} />);
    // fixture title1 carries explicit pa-left (explicit wins over default)
    expect(animOf(take1, 'title1')).toContain('pa-left');
    expect(animOf(take1, 'title1')).not.toContain('0.2s');
    const take2 = renderToString(<SceneView {...base} active shown={2} />);
    // previous run settles; the new run animates with its type default
    expect(animOf(take2, 'title1')).not.toContain('animation:');
    expect(animOf(take2, 'users')).toContain('pa-up');
  });

  it('stepping back removes entrances until the next advance', () => {
    commands.loadProject(
      JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
    );
    const { container } = render(<AppShell />);
    act(() => {
      commands.play();
      commands.stepNext();
      commands.stepNext();
    });
    const users = container.querySelector('[data-id="users"]') as HTMLElement;
    expect(users.style.animation).toContain('pa-up');
    act(() => {
      commands.stepBack();
    });
    const usersAfter = container.querySelector('[data-id="users"]');
    expect(usersAfter).toBeNull(); // shown=1: users not yet revealed
    const title = container.querySelector('[data-id="title1"]') as HTMLElement;
    expect(title.style.animation).toBe('');
  });
});
