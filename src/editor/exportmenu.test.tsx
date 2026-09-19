import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fireEvent, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMenu, type ExportMenuDeps } from './toolbar/ExportMenu.js';
import { AppShell } from './shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import type { RasterLib } from '../export/raster.js';

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

const stubRaster = (): RasterLib => ({
  toPng: async () => 'data:image/png;base64,STUB',
  toSvg: async () => 'data:image/svg+xml,STUB',
  toCanvas: async () => ({ width: 960, height: 540 }) as HTMLCanvasElement,
});

function stubGif() {
  return () => ({
    addFrame: () => {},
    on: (ev: string, cb: (arg: never) => void) => {
      if (ev === 'finished') setTimeout(() => cb(new Blob(['gif']) as never), 0);
    },
    render: () => {},
    abort: () => {},
  });
}

async function openMenu(container: HTMLElement) {
  const user = userEvent.setup();
  await user.click(within(container).getByText('⤴ Export'));
  return { user, menu: container.querySelector('[data-export-menu]')! };
}

async function clickItem(menu: Element, label: string) {
  const btn = [...menu.querySelectorAll('button')].find(
    (b) => b.textContent === label,
  )!;
  fireEvent.click(btn);
  // let the async export run to completion
  await new Promise((res) => setTimeout(res, 50));
}

describe('export menu', () => {
  it('saves PNG/SVG stills and project JSON through the menu', async () => {
    loadFixture();
    render(<AppShell />);
    const downloads: [string, string][] = [];
    const deps: ExportMenuDeps = {
      rasterLib: stubRaster(),
      download: (href, name) => downloads.push([href, name]),
      objectURL: () => 'blob:fake',
      sleep: async () => {},
    };
    const { container } = render(<ExportMenu deps={deps} />);
    const { menu } = await openMenu(container);
    await clickItem(menu, 'PNG still');
    expect(downloads[downloads.length - 1][1]).toMatch(/\.png$/);
    await clickItem(menu, 'SVG still');
    expect(downloads[downloads.length - 1][1]).toMatch(/\.svg$/);
    await clickItem(menu, 'Project JSON');
    expect(downloads[downloads.length - 1][1]).toMatch(/\.json$/);
  });

  it('encodes a GIF take from live frames', async () => {
    loadFixture();
    render(<AppShell />);
    const downloads: [string, string][] = [];
    const deps: ExportMenuDeps = {
      rasterLib: stubRaster(),
      download: (href, name) => downloads.push([href, name]),
      gifFactory: stubGif() as never,
      workerScript: 'blob:worker',
      sleep: async () => {},
      objectURL: () => 'blob:gif',
    };
    const { container } = render(<ExportMenu deps={deps} />);
    const { menu } = await openMenu(container);
    await clickItem(menu, 'GIF take');
    expect(downloads[downloads.length - 1][1]).toMatch(/\.gif$/);
    expect(menu.textContent).toContain('✔ GIF saved');
  });

  it('renders a WebM take and restores the edit state', async () => {
    loadFixture();
    render(<AppShell />);
    const stop = vi.fn();
    const downloads: [string, string][] = [];
    vi.stubGlobal('MediaRecorder', class {
      static isTypeSupported = () => true;
      state = 'inactive';
      ondataavailable: ((ev: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
        this.ondataavailable?.({ data: new Blob(['v']) });
      }
      stop() {
        this.state = 'inactive';
        this.onstop?.();
      }
    });
    const deps: ExportMenuDeps = {
      rasterLib: stubRaster(),
      download: (href, name) => downloads.push([href, name]),
      sleep: async () => {},
      objectURL: () => 'blob:movie',
      recorderFactory: (stream, opts) =>
        new (class {
          state = 'inactive';
          ondataavailable: ((ev: { data: Blob }) => void) | null = null;
          onstop: (() => void) | null = null;
          start() {
            this.state = 'recording';
            this.ondataavailable?.({ data: new Blob(['v']) });
          }
          stop() {
            this.state = 'inactive';
            this.onstop?.();
          }
        })() as never,
      sink: {
        canvas: {},
        ctx: { drawImage: () => {} },
        stream: { getTracks: () => [{ stop }] },
      } as never,
    };
    try {
      const { container } = render(<ExportMenu deps={deps} />);
      const { menu } = await openMenu(container);
      await clickItem(menu, 'WebM take');
      expect(downloads[downloads.length - 1][1]).toMatch(/\.(webm|mp4)$/);
      // take restored to pre-export edit state
      expect(editorStore.getState().playback.active).toBe(false);
      expect(menu.textContent).toContain('✔ video saved');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reports guards: empty project and missing recorder', async () => {
    commands.newProject();
    const { container } = render(
      <ExportMenu deps={{ download: () => {}, sleep: async () => {} }} />,
    );
    const { menu } = await openMenu(container);
    await clickItem(menu, 'WebM take');
    expect(menu.textContent).toContain('nothing to export');
    loadFixture();
  });
});
