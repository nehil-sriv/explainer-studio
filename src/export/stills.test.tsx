import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { AppShell } from '../editor/shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import {
  compPngName,
  downloadUrl,
  exportCompPNG,
  exportFramePNG,
  exportFrameSVG,
  sceneFilename,
} from './stills.js';
import type { RasterLib } from './raster.js';

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

const stubLib = (seen: { node: unknown; opts: unknown }[]): RasterLib => ({
  toPng: async (node, opts) => {
    seen.push({ node, opts });
    return 'data:image/png;base64,STUB';
  },
  toSvg: async (node, opts) => {
    seen.push({ node, opts });
    return 'data:image/svg+xml,STUB';
  },
  toCanvas: async (node, opts) => {
    seen.push({ node, opts });
    return document.createElement('canvas');
  },
});

describe('stills export', () => {
  it('names files like the legacy exporter', () => {
    expect(
      compPngName({ id: 'a', type: 'svc', props: { name: 'Pay Svc!' } }, 0),
    ).toBe('01-svc-pay-svc.png');
    expect(compPngName({ id: 'b', type: 'warn', props: {} }, 9)).toBe('10-warn.png');
    expect(sceneFilename('frame', 'png', 'My Clip')).toMatch(
      /^explainer-My-Clip-\d{4}-\d{2}-\d{2}\.png$/,
    );
  });

  it('PNG still cloaks chrome, rasters, downloads', async () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const scene = container.querySelector('#scene') as HTMLElement;
    const seen: { node: unknown; opts: unknown }[] = [];
    const downloads: [string, string][] = [];
    const url = await exportFramePNG(scene, {
      pixelRatio: 2,
      lib: stubLib(seen),
      download: (href, name) => downloads.push([href, name]),
    });
    expect(url).toBe('data:image/png;base64,STUB');
    expect(seen[0].opts).toMatchObject({ pixelRatio: 2 });
    expect(downloads[0][0]).toBe(url);
    expect(downloads[0][1]).toMatch(/\.png$/);
  });

  it('SVG still downloads the vector document', async () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const scene = container.querySelector('#scene') as HTMLElement;
    const downloads: [string, string][] = [];
    const url = await exportFrameSVG(scene, {
      lib: stubLib([]),
      download: (href, name) => downloads.push([href, name]),
    });
    expect(url).toContain('svg');
    expect(downloads[0][1]).toMatch(/\.svg$/);
  });

  it('per-component PNG isolates on a padded transparent stage', async () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const scene = container.querySelector('#scene') as HTMLElement;
    const el = container.querySelector('[data-id="db"]') as HTMLElement;
    const seen: { node: unknown; opts: unknown }[] = [];
    const downloads: [string, string][] = [];
    const comp = editorStore.getState().project.comps.find((c) => c.id === 'db')!;
    const url = await exportCompPNG(scene, el, comp, 4, {
      lib: stubLib(seen),
      download: (href, name) => downloads.push([href, name]),
    });
    expect(url).toBe('data:image/png;base64,STUB');
    expect(downloads[0][1]).toBe('05-svc-database.png');
    // padded transparent stage, cleaned up afterwards
    expect((seen[0].opts as Record<string, unknown>)['backgroundColor']).toBe(
      'rgba(0,0,0,0)',
    );
    expect(document.body.innerHTML).not.toContain('left:-10000px');
  });

  it('downloadUrl anchors with revocation for blobs', () => {
    const clicked: { href: string; name: string }[] = [];
    const origCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(
      ((tag: string, ...rest: unknown[]) => {
        const el = origCreate(tag, ...(rest as [])) as HTMLAnchorElement;
        if (tag === 'a') {
          el.click = () => {
            clicked.push({ href: el.href, name: el.download });
          };
        }
        return el;
      }) as typeof document.createElement,
    );
    try {
      downloadUrl('blob:fake-1', 'clip.webm');
      expect(clicked).toEqual([{ href: 'blob:fake-1', name: 'clip.webm' }]);
    } finally {
      createSpy.mockRestore();
    }
  });
});
