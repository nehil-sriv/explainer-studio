import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import { primaryTextField } from './canvas/editableFields.js';

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

afterEach(() => {
  commands.stopPlayback();
});

describe('primaryTextField', () => {
  it('maps short labels first, documents second, null when textless', () => {
    loadFixture();
    const comps = editorStore.getState().project.comps;
    const byId = (id: string) => comps.find((c) => c.id === id)!;
    expect(primaryTextField(byId('title1'))).toEqual({ key: 'text', multiline: false });
    expect(primaryTextField(byId('db'))).toEqual({ key: 'name', multiline: false });
    expect(primaryTextField(byId('term1'))).toEqual({ key: 'title', multiline: false });
    expect(primaryTextField(byId('check1'))).toEqual({ key: 'items', multiline: true });
    expect(primaryTextField({ id: 'x', type: 'spinner', props: {} })).toBeNull();
    expect(primaryTextField({ id: 'y', type: 'nope', props: { text: 't' } })).toBeNull();
  });
});

describe('inline text editing', () => {
  it('double-click edits a short label; Enter commits one undo entry', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const before = editorStore.getState().history.past.length;
    const title = container.querySelector('[data-id="title1"]')!;
    fireEvent.doubleClick(title);
    const input = container.querySelector('[data-inline-editor]') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    // raw rich-text tokens preserved in the editor
    expect(input.value).toBe('From users to [a]insights[/a]');
    await user.clear(input);
    await user.type(input, 'Hello');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(container.querySelector('[data-inline-editor]')).toBeNull();
    expect(container.querySelector('[data-id="title1"]')!.innerHTML).toContain('Hello');
    expect(editorStore.getState().history.past.length).toBe(before + 1);
  });

  it('Escape cancels with no history growth', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const before = editorStore.getState().history.past.length;
    fireEvent.doubleClick(container.querySelector('[data-id="db"]')!);
    const input = container.querySelector('[data-inline-editor]') as HTMLInputElement;
    expect(input.value).toBe('Database');
    await user.clear(input);
    await user.type(input, 'Discarded');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(container.querySelector('[data-inline-editor]')).toBeNull();
    expect(container.querySelector('[data-id="db"]')!.innerHTML).toContain('Database');
    expect(editorStore.getState().history.past.length).toBe(before);
  });

  it('multiline: Shift+Enter breaks lines, Ctrl+Enter commits', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    fireEvent.doubleClick(container.querySelector('[data-id="check1"]')!);
    const area = container.querySelector('[data-inline-editor]') as HTMLTextAreaElement;
    expect(area.tagName).toBe('TEXTAREA');
    area.focus();
    await user.type(area, '{Shift>}{Enter}{/Shift}Verify|done');
    expect(area.value).toContain('\n');
    const before = editorStore.getState().history.past.length;
    fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true });
    expect(container.querySelector('[data-inline-editor]')).toBeNull();
    expect(editorStore.getState().history.past.length).toBe(before + 1);
    expect(
      (editorStore.getState().project.comps.find((c) => c.id === 'check1')!.props as Record<string, unknown>)['items'],
    ).toContain('Verify|done');
  });

  it('click outside commits; textless comps ignore double-click', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    let spin!: { id: string };
    act(() => {
      commands.addComponent({ type: 'spinner', x: 10, y: 10 });
    });
    spin = editorStore.getState().project.comps.find((c) => c.type === 'spinner')!;
    fireEvent.doubleClick(container.querySelector(`[data-id="${spin.id}"]`)!);
    expect(container.querySelector('[data-inline-editor]')).toBeNull();
    fireEvent.doubleClick(container.querySelector('[data-id="title1"]')!);
    const input = container.querySelector('[data-inline-editor]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Outside commits' } });
    act(() => {
      const ev = new window.Event('pointerdown', { bubbles: true });
      Object.assign(ev, { clientX: 5, clientY: 5 });
      window.dispatchEvent(ev);
    });
    expect(container.querySelector('[data-inline-editor]')).toBeNull();
    expect(container.querySelector('[data-id="title1"]')!.innerHTML).toContain('Outside commits');
  });

  it('edits render identically in preview takes', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    fireEvent.doubleClick(container.querySelector('[data-id="title1"]')!);
    const input = container.querySelector('[data-inline-editor]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Take me' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    act(() => {
      commands.play();
      commands.stepNext();
    });
    expect(
      container.querySelector('[data-id="title1"]')!.innerHTML,
    ).toContain('Take me');
    expect(screen.getByTestId('takebar').textContent).toContain('1/11');
  });
});
