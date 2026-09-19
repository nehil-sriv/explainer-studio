import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SceneView } from './SceneView.js';
import { createEditorStore } from '../../store/editorStore.js';
import type { SceneComponent } from '../../domain/component.js';

/**
 * Inspector → canvas bridge contract: generic Style/Layout props must reach
 * the rendered `.comp` wrapper (class flags + CSS custom properties) so the
 * designer sees every field change on the canvas.
 */

function comp(overrides: Partial<SceneComponent> = {}): SceneComponent {
  return {
    id: 't',
    type: 'title',
    x: 10,
    y: 20,
    scale: 1,
    rot: 0,
    z: 1,
    opacity: 1,
    props: { text: 'Hello', size: 120 },
    ...overrides,
  };
}

function renderComp(c: SceneComponent): HTMLElement {
  const { container } = render(
    <SceneView
      comps={[c]}
      edges={[]}
      w={1920}
      h={1080}
      theme="phosphor"
      fit={1}
      active={false}
      shown={0}
      revealed={{}}
      visibleIds={null}
      edgeIds={null}
    />,
  );
  return container.querySelector('.comp') as HTMLElement;
}

describe('inspector style wiring reaches the canvas', () => {
  it('leaves an untouched component on its native theme styling', () => {
    const el = renderComp(comp());
    for (const c of ['es-so-font', 'es-so-size', 'es-so-align', 'es-so-effects', 'es-so-bg']) {
      expect(el.classList.contains(c)).toBe(false);
    }
    expect(el.style.getPropertyValue('--es-font')).toBe('');
  });

  it('maps typography fields to override classes + variables', () => {
    const el = renderComp(
      comp({
        props: {
          text: 'Hello',
          size: 120,
          font: 'VT323',
          weight: 'Bold',
          fontSize: 84,
          align: 'center',
          lineHeight: 1.4,
          letterSpacing: 3,
        },
      }),
    );
    expect(el.classList.contains('es-so-font')).toBe(true);
    expect(el.style.getPropertyValue('--es-font')).toContain('--font-display');
    expect(el.classList.contains('es-so-weight')).toBe(true);
    expect(el.style.getPropertyValue('--es-weight')).toBe('700');
    expect(el.classList.contains('es-so-size')).toBe(true);
    expect(el.style.getPropertyValue('--es-size')).toBe('84px');
    expect(el.classList.contains('es-so-align')).toBe(true);
    expect(el.style.getPropertyValue('--es-align')).toBe('center');
    expect(el.classList.contains('es-so-lh')).toBe(true);
    expect(el.style.getPropertyValue('--es-lh')).toBe('1.4');
    expect(el.classList.contains('es-so-ls')).toBe(true);
    expect(el.style.getPropertyValue('--es-ls')).toBe('3px');
  });

  it('maps text color to the tint channels and background to --cbg', () => {
    const el = renderComp(
      comp({
        props: { text: 'Hello', size: 120, color: '#ff0000', bg: '#112233', bgEnabled: true },
      }),
    );
    expect(el.style.getPropertyValue('--ca')).toBe('#ff0000');
    expect(el.style.getPropertyValue('--cc')).toBe('#ff0000');
    expect(el.style.getPropertyValue('--ct')).toBe('#ff0000');
    expect(el.style.getPropertyValue('--cbg')).toBe('#112233');
    expect(el.classList.contains('es-so-bg')).toBe(true);
  });

  it('maps shadow + blur to the effects filter', () => {
    const el = renderComp(
      comp({ props: { text: 'Hello', size: 120, shadowEnabled: true, blur: 6 } }),
    );
    expect(el.classList.contains('es-so-effects')).toBe(true);
    const filter = el.style.getPropertyValue('--es-filter');
    expect(filter).toContain('drop-shadow');
    expect(filter).toContain('blur(6px)');
  });

  it('stretches child SVGs when explicit W/H boxes are set', () => {
    const el = renderComp(comp({ wpx: 640, hpx: 360 }));
    expect(el.style.width).toBe('640px');
    expect(el.style.height).toBe('360px');
    expect(el.classList.contains('es-has-w')).toBe(true);
    expect(el.classList.contains('es-has-h')).toBe(true);
  });
});

describe('layout constraints reflow on canvas resize', () => {
  it('moves centred/right comps and stretches explicit boxes', () => {
    const store = createEditorStore();
    store.getState().loadProject({
      scene: { w: 1000, h: 1000 },
      comps: [
        { id: 'a', type: 'title', x: 0, y: 0, props: { hConstraint: 'Left', vConstraint: 'Top' } },
        { id: 'b', type: 'title', x: 0, y: 0, props: { hConstraint: 'Center', vConstraint: 'Middle' } },
        { id: 'c', type: 'title', x: 0, y: 0, wpx: 200, hpx: 100, props: { hConstraint: 'Stretch', vConstraint: 'Stretch' } },
      ],
      edges: [],
      scenes: [],
    });
    store.getState().setCanvasSize(1200, 1400);
    const byId = (id: string) =>
      store.getState().project.comps.find((c) => c.id === id)!;
    expect(byId('a').x).toBe(0);
    expect(byId('a').y).toBe(0);
    expect(byId('b').x).toBe(100);
    expect(byId('b').y).toBe(200);
    expect(byId('c').wpx).toBe(400);
    expect(byId('c').hpx).toBe(500);
  });
});
