import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../shell/AppShell.js';
import { commands } from '../../store/commands.js';
import { editorStore } from '../../store/editorStore.js';
import {
  backgroundCss,
  hasBackground,
  DEFAULT_BACKGROUND,
} from '../../domain/background.js';
import { CANVAS_THEMES, themeSwatch } from '../canvasTheme.js';
import { themeCss } from '../../export/css.js';

/** Open the Canvas rail section. */
function openCanvas(container: HTMLElement): HTMLElement {
  const rail = container.querySelector('.es-rail') as HTMLElement;
  return rail;
}

describe('canvas background compiler', () => {
  it('defers to the theme by default', () => {
    expect(backgroundCss(undefined)).toEqual({});
    expect(backgroundCss(DEFAULT_BACKGROUND)).toEqual({});
    expect(hasBackground(DEFAULT_BACKGROUND)).toBe(false);
  });

  it('compiles solid, gradient, mesh and shader records', () => {
    expect(backgroundCss({ kind: 'solid', color: '#123456' })).toMatchObject({
      backgroundColor: '#123456',
      backgroundImage: 'none',
    });
    const g = backgroundCss({ kind: 'gradient', from: '#000000', to: '#ffffff', angle: 90 });
    expect(g.backgroundImage).toBe('linear-gradient(90deg, #000000 0%, #ffffff 100%)');

    const m = backgroundCss({
      kind: 'mesh',
      mesh: ['#111111', '#222222', '#333333'],
      meshBase: '#101010',
    });
    expect(m.backgroundImage).toContain('radial-gradient');
    // six layers, one per mesh vertex
    expect((m.backgroundImage as string).split('radial-gradient').length - 1).toBe(3);
    expect(m.backgroundColor).toBe('#101010');

    const s = backgroundCss({ kind: 'shader', shader: 'ion' });
    expect(s.backgroundImage).toContain('radial-gradient');
    expect(s.animation).toContain('es-bg-drift');
    expect(hasBackground({ kind: 'shader' })).toBe(true);
  });
});

describe('theme swatches use real theme values', () => {
  it('reads a theme surface and never hard-fails on unknown keys', () => {
    const phosphor = themeSwatch('phosphor');
    expect(phosphor['--bg-deep']).toBe('#0A0F0A');
    expect(phosphor.preview.backgroundColor).toBe('#0A0F0A');
    // unknown theme falls back rather than throwing
    expect(themeSwatch('does-not-exist').preview.backgroundColor).toBeTruthy();
  });

  it('gives every theme its own self-hosted font combination', () => {
    const SELF_HOSTED = /Inter|JetBrains Mono|Fraunces|Caveat|VT323/;
    const roles = ['--font-display', '--font-body', '--font-data', '--font-hand'] as const;
    for (const t of CANVAS_THEMES) {
      const s = themeSwatch(t.key);
      for (const role of roles) {
        expect(s[role], `${t.key} missing ${role}`).toBeTruthy();
        expect(s[role], `${t.key} ${role} is not self-hosted`).toMatch(SELF_HOSTED);
      }
    }
    // neighbouring themes must not share one typographic voice
    expect(themeSwatch('neon')['--font-display']).toContain('VT323');
    expect(themeSwatch('editorial')['--font-display']).toContain('Fraunces');
    expect(themeSwatch('quiet-terminal')['--font-body']).toContain('JetBrains Mono');
    expect(themeSwatch('insta')['--font-display']).toContain('Caveat');
    expect(themeSwatch('neon')['--font-display']).not.toBe(
      themeSwatch('editorial')['--font-display'],
    );
  });

  it('carries theme fonts into the export bundle', () => {
    const css = themeCss('neon');
    expect(css).toContain('--font-display:');
    expect(css).toContain('VT323');
  });
});

describe('canvas settings pane', () => {
  it('sets canvas size from a preset and a custom pair', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const rail = openCanvas(container);
    await user.click(within(rail).getByText('Canvas'));

    const lib = container.querySelector('.es-lib') as HTMLElement;
    expect(lib.textContent).toContain('Canvas size');
    await user.click(within(lib).getByTitle('1080 × 1920'));
    expect(editorStore.getState().project.scene).toEqual({ w: 1080, h: 1920 });

    const w = within(lib).getByLabelText('Canvas width') as HTMLInputElement;
    const h = within(lib).getByLabelText('Canvas height') as HTMLInputElement;
    fireEvent.change(w, { target: { value: '1440' } });
    fireEvent.change(h, { target: { value: '900' } });
    fireEvent.blur(w);
    expect(editorStore.getState().project.scene).toEqual({ w: 1440, h: 900 });
  });

  it('switches theme and records it on the scene', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(within(openCanvas(container)).getByText('Canvas'));
    const lib = container.querySelector('.es-lib') as HTMLElement;
    await user.click(within(lib).getByTitle('Neon'));
    expect(editorStore.getState().project.theme).toBe('neon');
    expect(container.querySelector('#scene')!.getAttribute('data-theme')).toBe('neon');
  });

  it('drives the scene background through theme → solid → gradient', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(within(openCanvas(container)).getByText('Canvas'));
    const lib = container.querySelector('.es-lib') as HTMLElement;

    // default: follow the theme (no inline background)
    act(() => {
      commands.setCanvasBackground({ kind: 'solid', color: '#101820' });
    });
    let scene = container.querySelector('#scene') as HTMLElement;
    expect(scene.style.backgroundColor).toBe('rgb(16, 24, 32)');

    await user.click(within(lib).getByRole('radio', { name: 'Gradient' }));
    act(() => {
      commands.setCanvasBackground({
        kind: 'gradient',
        from: '#000000',
        to: '#ffffff',
        angle: 90,
      });
    });
    scene = container.querySelector('#scene') as HTMLElement;
    expect(scene.style.backgroundImage).toContain('linear-gradient');
  });

  it('offers iOS system colour wells and iOS-style gradients', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(within(openCanvas(container)).getByText('Canvas'));
    const lib = container.querySelector('.es-lib') as HTMLElement;

    await user.click(within(lib).getByRole('radio', { name: 'Color' }));
    await user.click(within(lib).getByRole('button', { name: 'Indigo' }));
    expect(editorStore.getState().project.background).toMatchObject({
      kind: 'solid',
      color: '#5856D6',
    });

    await user.click(within(lib).getByRole('radio', { name: 'Gradient' }));
    await user.click(within(lib).getByTitle('Bloom gradient'));
    const stored = editorStore.getState().project.background!;
    expect(stored.kind).toBe('gradient');
    expect(stored.stops).toEqual(['#FF2D55', '#AF52DE', '#5856D6']);
    // multi-stop ramp reaches the scene (jsdom normalises hex → rgb)
    const scene = container.querySelector('#scene') as HTMLElement;
    expect(scene.style.backgroundImage).toContain('linear-gradient(145deg');
    expect(scene.style.backgroundImage).toContain('rgb(175, 82, 222) 50%');
  });

  it('keeps the theme gallery under the Theme background segment', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(within(openCanvas(container)).getByText('Canvas'));
    const lib = container.querySelector('.es-lib') as HTMLElement;

    // default background family is Theme → gallery visible
    expect(within(lib).getByTitle('Neon')).toBeTruthy();
    await user.click(within(lib).getByRole('radio', { name: 'Color' }));
    expect(within(lib).queryByTitle('Neon')).toBeNull();
    await user.click(within(lib).getByRole('radio', { name: 'Theme' }));
    expect(within(lib).getByTitle('Neon')).toBeTruthy();
  });

  it('offers mesh gradients and animated shaders (Screen Movie style)', async () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(within(openCanvas(container)).getByText('Canvas'));
    const lib = container.querySelector('.es-lib') as HTMLElement;

    await user.click(within(lib).getByRole('radio', { name: 'Gradient' }));
    await user.click(within(lib).getByTitle('Nebuluxe mesh'));
    const mesh = editorStore.getState().project.background!;
    expect(mesh.kind).toBe('mesh');
    expect(mesh.mesh?.[0]).toBe('#4C1D95');
    expect(mesh.meshBase).toBe('#1b1040');

    await user.click(within(lib).getByRole('radio', { name: 'Shader' }));
    await user.click(within(lib).getByTitle('Aurora shader'));
    const shader = editorStore.getState().project.background!;
    expect(shader).toMatchObject({ kind: 'shader', shader: 'aurora' });

    // the animated shader reaches the scene with its drift
    const scene = container.querySelector('#scene') as HTMLElement;
    expect(scene.style.backgroundImage).toContain('radial-gradient');
    expect(scene.style.animation).toContain('es-bg-drift');
  });

  it('returns to the theme background', () => {
    commands.loadProject({ scene: { w: 1920, h: 1080 }, comps: [], edges: [] });
    act(() => {
      commands.setCanvasBackground({ kind: 'shader', shader: 'ion' });
    });
    expect(editorStore.getState().project.background?.kind).toBe('shader');
    act(() => {
      commands.setCanvasBackground(null);
    });
    expect(editorStore.getState().project.background).toBeUndefined();
  });
});
