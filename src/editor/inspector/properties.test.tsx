import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../shell/AppShell.js';
import { commands } from '../../store/commands.js';

const CSS_PATH = 'src/editor/inspector/properties.css';
const TSX_PATH = 'src/editor/inspector/PropertiesInspector.tsx';

/** Skin hooks: es-properties + es-properties__* (BEM). */
function skinClasses(src: string): Set<string> {
  const out = new Set<string>();
  const re = /(?:\.|\b)es-properties__[a-z][a-z-]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.add(m[0].startsWith('.') ? m[0].slice(1) : m[0]);
  return out;
}

function loadFixture(): void {
  commands.loadProject(
    JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8')),
  );
}

describe('properties skin wiring', () => {
  it('properties.css parses: balanced braces, no dead-syntax typos', () => {
    const css = readFileSync(CSS_PATH, 'utf8');
    expect(css.match(/{/g)?.length).toBe(css.match(/}/g)?.length);
    for (const typo of [
      'var (',
      'O#',
      'Orgb(',
      ', !important',
      ': active',
      "' group'",
      "' light'",
      '#de0ea',
      '.es-bt.',
      '- 1px',
      'es-properties_section',
      'aria-Label',
    ]) {
      expect(css, `typo still in skin: ${typo}`).not.toContain(typo);
    }
  });

  it('light-theme override targets the inspector scope', () => {
    const css = readFileSync(CSS_PATH, 'utf8');
    expect(css).toContain("[data-editor-theme='light'] .es-properties");
  });

  it('every skin class used by the inspector is defined by the skin', () => {
    const css = readFileSync(CSS_PATH, 'utf8');
    const tsx = readFileSync(TSX_PATH, 'utf8');
    const defined = skinClasses(css);
    const used = skinClasses(tsx);
    expect(used.size).toBeGreaterThan(0);
    for (const c of used) {
      expect(defined, `inspector uses .${c} but the skin never defines it`).toContain(c);
    }
  });

  it('inspector renders inside the skin scope with tab + section hooks', async () => {
    loadFixture();
    act(() => {
      commands.selectComps(['db']);
    });
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    const insp = container.querySelector('.es-insp')!;
    const tabs = within(insp.querySelector('.es-tabs') as HTMLElement);

    // Content tab skin hooks
    expect(insp.querySelector('.es-properties')).toBeTruthy();
    expect(tabs.getByText('Content').classList.contains('is-active')).toBe(true);
    for (const c of [
      'es-properties__component',
      'es-properties__component-icon',
      'es-properties__section-title',
      'es-properties__story',
      'es-properties__story-body',
      'es-properties__story-title',
      'es-properties__copy-grid',
      'es-properties__copy-card',
      'es-properties__actions',
      'es-properties__delete',
    ]) {
      expect(insp.querySelector(`.${c}`), `missing .${c} on Content`).toBeTruthy();
    }

    // Style tab skin hooks (segmented alignment + switches + range)
    await user.click(tabs.getByText('Style'));
    expect(tabs.getByText('Style').classList.contains('is-active')).toBe(true);
    expect(insp.querySelector('[role="group"][aria-label="Alignment"]')).toBeTruthy();
    expect(insp.querySelector('.es-toggle')).toBeTruthy();
    expect(insp.querySelector('input[type="range"].es-range')).toBeTruthy();

    // Layout tab stays in scope with the active marker moved
    await user.click(tabs.getByText('Layout'));
    expect(tabs.getByText('Layout').classList.contains('is-active')).toBe(true);
    expect(tabs.getByText('Content').classList.contains('is-active')).toBe(false);
    expect(insp.querySelector('.es-properties__component')).toBeTruthy();
  });
});
