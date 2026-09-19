import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

afterEach(() => {
  commands.stopPlayback();
});

const canvasIds = (c: HTMLElement): string[] =>
  [...c.querySelectorAll('[data-id]')].map((n) => n.getAttribute('data-id')!);

describe('AppShell', () => {
  it('displays an existing project: canvas, library, story', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    expect(screen.getByText(/Explainer Studio/)).toBeTruthy();
    expect(container.querySelector('[data-theme="studio-black"]')).toBeTruthy();
    // edit mode shows all non-state comps (11 - 1 state step)
    expect(canvasIds(container)).toHaveLength(10);
    expect(canvasIds(container)).toContain('db');
    expect(container.querySelector('[data-comp="gateway"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="sequence"]')?.textContent,
    ).toContain('Scene 1');
    // canvas markup carries the real renderer output
    expect(container.querySelector('.tk-svc')).toBeTruthy();
  });

  it('library click adds through commands; story click selects', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(container.querySelector('[data-comp="gateway"]')!);
    expect(canvasIds(container)).toHaveLength(11);
    expect(
      container.querySelector('[data-testid="sequence"]')?.textContent,
    ).toContain('gateway');
    // new comp is selected → inspector shows its fields
    expect(editorStore.getState().selection.compIds).toHaveLength(1);
    // story row click selects db
    const seq = container.querySelector('[data-testid="sequence"]')!;
    const rows = [...seq.querySelectorAll('.es-step')];
    const dbRow = rows.find((r) => r.textContent?.includes('Database'))!;
    fireEvent.click(dbRow);
    expect(editorStore.getState().selection.compIds).toEqual(['db']);
  });

  it('inspector edits flow through commands onto the canvas', async () => {
    loadFixture();
    commands.selectComps(['db']);
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(screen.getByText('Content'));
    const sub = screen.getByLabelText('sub') as HTMLInputElement;
    await user.clear(sub);
    await user.type(sub, 'ZZZ edited');
    fireEvent.blur(sub);
    const well = container.querySelector('[data-testid="canvas-well"]')!;
    expect(well.innerHTML).toContain('ZZZ edited');
    expect(well.innerHTML).not.toContain('Stores application data');
    expect(editorStore.getState().history.past.length).toBeGreaterThan(0);
  });

  it('preview plays the take state through the same frame resolver', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await user.click(screen.getByText('▶ Preview'));
    expect(screen.getByTestId('takebar').textContent).toContain('0/11');
    const fwd = within(screen.getByTestId('takebar')).getByText('→');
    for (let i = 0; i < 5; i++) fireEvent.click(fwd);
    // db's clearBefore hides everything unpinned before it
    expect(canvasIds(container)).toEqual(['lb', 'db']);
    expect(screen.getByTestId('take-pos').textContent).toBe('5/11');
  });

  it('Space steps the take; ⏩ Auto runs it on hold timing', async () => {
    loadFixture();
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByText('▶ Preview'));
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByTestId('take-pos').textContent).toBe('1/11');
    await user.click(screen.getByText('⏩ Auto'));
    expect(editorStore.getState().playback.auto).toBe(true);
    await user.click(screen.getByText('⏸ Auto'));
    expect(editorStore.getState().playback.auto).toBe(false);
  });
});
