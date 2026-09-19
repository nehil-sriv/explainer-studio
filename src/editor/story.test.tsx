import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './shell/AppShell.js';
import { commands } from '../store/commands.js';
import { editorStore } from '../store/editorStore.js';
import { takeFrame } from '../store/selectors.js';

const STEP_DND = 'application/x-story-step';

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

function dndMock() {
  return {
    types: [STEP_DND] as string[],
    data: '',
    setData(_t: string, v: string) {
      this.data = v;
    },
    getData() {
      return this.data;
    },
    dropEffect: '',
    effectAllowed: '',
  };
}

function dispatch(node: Element, type: string, props: Record<string, unknown>): void {
  act(() => {
    const ev = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(ev, props);
    node.dispatchEvent(ev);
  });
}

afterEach(() => {
  commands.stopPlayback();
});

describe('story workflow', () => {
  it('expands rows, toggles flags, moves to a new step', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const rows = container.querySelectorAll('[data-testid="sequence"] .es-step');
    // expand the first row (chevron is the first .mini button)
    const chevron = rows[0].querySelector('.mini')!;
    await user.click(chevron);
    expect(container.querySelector('[data-expanded]')).toBeTruthy();
    // move to new step from the expanded row
    const moveBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Move to new step'),
    )!;
    const firstId = editorStore.getState().project.comps[0].id;
    await user.click(moveBtn);
    const order = editorStore.getState().project.comps.map((c) => c.id);
    expect(order[order.length - 1]).toBe(firstId);
  });

  it('row flags toggle clear/pin through commands', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const row = container.querySelector('[data-testid="sequence"] .es-step')!;
    const clearBtn = [...row.querySelectorAll('.mini')].find(
      (b) => (b as HTMLElement).title.includes('clear screen'),
    )!;
    await user.click(clearBtn);
    expect(
      editorStore.getState().project.comps[0].clearBefore,
    ).toBe(true);
  });

  it('dragging a row reorders the sequence', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const seq = container.querySelector('[data-testid="sequence"]')!;
    const getRows = () =>
      [...seq.querySelectorAll('.es-step[data-seq]')].map((r) =>
        r.querySelector('.lbl')!.textContent,
      );
    const before = getRows();
    const dt = dndMock();
    const rows = seq.querySelectorAll('.es-step[data-seq]');
    dispatch(rows[0], 'dragstart', { dataTransfer: dt });
    dt.data = editorStore.getState().project.comps[0].id;
    dispatch(rows[2], 'dragover', { dataTransfer: dt });
    dispatch(rows[2], 'drop', { dataTransfer: dt });
    const after = getRows();
    expect(after).not.toEqual(before);
    // dropped on row 2 → lands at position 1 of the result list
    expect(after[1]).toBe(before[0]);
  });

  it('adds a state change and patches it from the inspector', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    act(() => {
      commands.selectComps(['db']);
    });
    await user.click(screen.getByText('Content'));
    const changes = container.querySelector('select[aria-label="Changes"]') as HTMLSelectElement;
    fireEvent.change(changes, { target: { value: '__add__' } });
    const s = editorStore.getState();
    const step = s.project.comps[s.project.comps.length - 1];
    expect(step.type).toBe('state');
    expect(step.target).toBe('db');
    // patch editor lists an Add-field picker
    const addPick = [...container.querySelectorAll('.es-insp select')].find((el) =>
      el.textContent?.includes('+ field'),
    ) as HTMLSelectElement;
    expect(addPick).toBeTruthy();
    fireEvent.change(addPick, { target: { value: 'sub' } });
    const stored = editorStore.getState().project.comps.find((c) => c.id === step.id)!;
    // base value as of the step: the fixture's earlier db patch already
    // changed sub (legacy stateBeforeAt parity — later steps see it)
    expect((stored.patch as Record<string, unknown>)['sub']).toBe('Fails to respond');
    // status line warns while the step fires before its target appears
    expect(container.querySelector('.es-insp')!.textContent).toContain('fires');
  });

  it('appear-together merges selection into one Space press', async () => {
    loadFixture();
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    act(() => {
      commands.selectComps(['users', 'lb']);
    });
    const merge = screen.getByText('⊞ Appear together');
    await user.click(merge);
    const comps = editorStore.getState().project.comps;
    const sid = comps.find((c) => c.id === 'users')!.stepId;
    expect(sid).toBeTruthy();
    expect(comps.find((c) => c.id === 'lb')!.stepId).toBe(sid);
    expect(container.querySelector('[data-testid="sequence"]')!.textContent).toContain('⊞');
  });

  it('scene cards carry live previews', () => {
    loadFixture();
    const { container } = render(<AppShell />);
    const previews = container.querySelectorAll('[data-scene-preview]');
    expect(previews.length).toBe(2);
    expect(previews[0].innerHTML).toContain('tk-svc');
  });
});

describe('acceptance workflow', () => {
  it('database + arrow appear together, alert follows, reorder previews whole beats', () => {
    // fresh doc: Database onto canvas (active step = end)
    commands.newProject();
    const db = commands.addComponent({ type: 'db', x: 100, y: 100, props: { label: 'Database' } });
    // Failure Arrow into the same step…
    const arrow = commands.addComponent({ type: 'arrow', x: 300, y: 100, props: { label: 'Failure arrow' } });
    // …appear together
    expect(commands.mergeSteps([db, arrow])).toMatch(/^st/);
    // Alert to a new step
    const alert = commands.addComponent({ type: 'alert', x: 500, y: 100, props: { text: 'Alert' } });
    // reorder: alert first
    commands.moveComponentToStep(alert, 0);
    expect(
      editorStore.getState().project.comps.map((c) => c.id),
    ).toEqual([alert, db, arrow]);
    // preview: first Space reveals the alert alone…
    commands.play();
    commands.stepNext();
    let f = takeFrame(editorStore.getState());
    expect(f.visibleIds).toEqual([alert]);
    // …second Space reveals database + arrow together (same sequence state
    // the legacy engine produces for the merged run)
    commands.stepNext();
    f = takeFrame(editorStore.getState());
    expect(f.visibleIds).toEqual([alert, db, arrow]);
    commands.stopPlayback();
  });
});
