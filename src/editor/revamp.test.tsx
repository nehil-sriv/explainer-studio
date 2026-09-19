import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

describe('revamped chrome (mock parity)', () => {
  it('topbar shows breadcrumb, actions and avatar', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const bar = container.querySelector('.es-topbar')!;
    expect(bar.textContent).toContain('Projects');
    expect(bar.textContent).toContain('Explainer Studio');
    expect(within(bar as HTMLElement).getByText('▶ Preview')).toBeTruthy();
    expect(within(bar as HTMLElement).getByText('⤴ Export')).toBeTruthy();
    expect(within(bar as HTMLElement).getByText('⧉ Popout')).toBeTruthy();
    expect(bar.querySelector('.es-avatar')?.textContent).toBe('JD');
  });

  it('library shows the curated storefront with See-all escape', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const lib = container.querySelector('.es-lib')!;
    for (const g of ['Infrastructure', 'Services', 'People & Devices', 'Arrows & Connectors']) {
      expect(lib.textContent).toContain(g);
    }
    // curated tile adds with mapped props (Mobile → clientdev labeled Mobile)
    await user.click(within(lib as HTMLElement).getByTitle('Mobile'));
    const added = editorStore.getState().project.comps;
    const mobile = added[added.length - 1];
    expect(mobile.type).toBe('clientdev');
    expect((mobile.props as Record<string, unknown>)['label']).toBe('Mobile');
    // See all → full registry grid; curated back
    await user.click(within(lib as HTMLElement).getAllByText('See all')[0]);
    expect(lib.textContent).toContain('All components');
    await user.click(within(lib as HTMLElement).getByText('← Curated'));
    expect(lib.textContent).toContain('Infrastructure');
  });

  it('rail sections switch the library view', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const rail = container.querySelector('.es-rail')!;
    await user.click(within(rail as HTMLElement).getByText('Icons'));
    const lib = container.querySelector('.es-lib')!;
    expect(lib.textContent).toContain('Icons');
    expect(lib.querySelector('[data-comp="icon"]')).toBeTruthy();
    // icon tile stamps that icon kind
    await user.click(lib.querySelector('[data-comp="icon"]')!);
    const comps = editorStore.getState().project.comps;
    expect(comps[comps.length - 1].type).toBe('icon');
    // settings pane edits real preferences
    await user.click(within(rail as HTMLElement).getByText('Settings'));
    const hold = within(container.querySelector('.es-lib') as HTMLElement).getByLabelText('Hold s') as HTMLInputElement;
    fireEvent.change(hold, { target: { value: '3.5' } });
    expect(editorStore.getState().playback.holdDefault).toBe(3.5);
  });

  it('uploads stamp local images onto the canvas', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(within(container.querySelector('.es-rail')!).getByText('Uploads'));
    const input = container.querySelector('.es-lib input[type="file"]') as HTMLInputElement;
    const file = new File(['png-bytes'], 'logo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise((res) => setTimeout(res, 50));
    const comps = editorStore.getState().project.comps;
    const img = comps[comps.length - 1];
    expect(img.type).toBe('image');
    expect(String((img.props as Record<string, unknown>)['src'])).toContain('data:image/png');
  });

  it('story renders scene cards with per-scene steps and checklist rows', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const seq = container.querySelector('[data-testid="sequence"]')!;
    expect(seq.textContent).toContain('Scene 1');
    expect(seq.textContent).toContain('Scene 2');
    // checklist items render as numbered rows (Scene 2 in the mock)
    expect(seq.textContent).toContain('Detect the issue');
    // per-scene numbering restarts (Scene 2 first step shows 1)
    const cards = seq.querySelectorAll('[data-scene]');
    expect(cards.length).toBe(2);
    expect(cards[1].querySelector('.es-step .n')?.textContent).toBe('1');
    // add-step arms the scene; add-scene appends a card
    const addStep = [...cards[1].querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Add step'),
    )!;
    fireEvent.click(addStep);
    const scenes = editorStore.getState().project.scenes;
    expect(editorStore.getState().prefs.activeSceneId).toBe(scenes[1].id);
    act(() => {
      commands.addScene('Scene 3');
    });
    expect(container.querySelector('[data-testid="sequence"]')!.textContent).toContain('Scene 3');
  });

  it('properties tabs match the mock: Content / Style / Layout own their sections', async () => {
    loadFixture();
    act(() => {
      commands.selectComps(['db']);
    });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const insp = container.querySelector('.es-insp')!;
    const tabs = within(insp.querySelector('.es-tabs') as HTMLElement);

    // Content (default): Text + Story + Entrance + Copy as + Duplicate/Delete
    for (const t of ['Text', 'Story', 'Appears', 'Changes', 'Exits', 'Entrance', 'Copy as', 'PNG', 'Video', 'Duplicate', 'Delete']) {
      expect(insp.textContent).toContain(t);
    }
    expect(insp.textContent).toContain('Advanced timing');
    for (const t of ['Typography', 'Text color', 'Align to canvas', 'Constraints']) {
      expect(insp.textContent).not.toContain(t);
    }

    // Style: Typography + Text color + Background + Effects + Opacity + Reset
    await user.click(tabs.getByText('Style'));
    for (const t of ['Typography', 'Font', 'Weight', 'Size', 'Alignment', 'Line height', 'Letter spacing', 'Text color', 'Background', 'Effects', 'Shadow', 'Blur', 'Opacity', 'Reset style']) {
      expect(insp.textContent).toContain(t);
    }
    for (const t of ['Appears', 'Entrance', 'Position', 'Arrange', 'Align to canvas', 'Copy as']) {
      expect(insp.textContent).not.toContain(t);
    }

    // Layout: Position + Size + Rotation + Align + Arrange + Constraints + Lock
    await user.click(tabs.getByText('Layout'));
    for (const t of ['Position', 'Size', 'Rotation', 'Align to canvas', 'Arrange', 'Bring to front', 'Bring forward', 'Send backward', 'Send to back', 'Constraints', 'Horizontal', 'Vertical', 'Lock']) {
      expect(insp.textContent).toContain(t);
    }
    for (const t of ['Typography', 'Text color', 'Entrance', 'Copy as', 'Appears']) {
      expect(insp.textContent).not.toContain(t);
    }

    // arrange still flows through commands (Bring forward lifts z)
    const z0 = editorStore.getState().project.comps.find((c) => c.id === 'db')!.z!;
    await user.click(within(insp as HTMLElement).getByText(/Bring forward/));
    expect(editorStore.getState().project.comps.find((c) => c.id === 'db')!.z).toBeGreaterThan(z0!);
    // lock toggle persists
    const lockSwitch = within(insp as HTMLElement).getByLabelText('Lock component');
    fireEvent.click(lockSwitch);
    expect(
      editorStore.getState().project.comps.find((c) => c.id === 'db')!.locked,
    ).toBe(true);
    fireEvent.click(lockSwitch);
    expect(
      editorStore.getState().project.comps.find((c) => c.id === 'db')!.locked,
    ).toBe(false);
    // style writes persist (font size + alignment)
    await user.click(tabs.getByText('Style'));
    const sizeInput = within(insp as HTMLElement).getByLabelText('Size') as HTMLInputElement;
    fireEvent.blur(sizeInput);
    await user.click(within(insp as HTMLElement).getByLabelText('Align Center'));
    expect(
      (editorStore.getState().project.comps.find((c) => c.id === 'db')!.props as Record<string, unknown>)['align'],
    ).toBe('center');
    // back to content: story step + entrance still wired
    await user.click(tabs.getByText('Content'));
    expect(insp.textContent).toContain('Appears');
    expect(insp.textContent).toContain('Component image');
  });
});
