import { describe, expect, it } from 'vitest';
import { seqHoldFor } from '../domain/step.js';
import { stepTotalFor, isStepped } from '../catalog/lines.js';
import { applyLineReveal } from '../renderer/lines.js';
import { REGISTRY } from '../catalog/registry.js';

describe('take timing + lines', () => {
  it('seqHoldFor prefers the per-step override', () => {
    expect(seqHoldFor({ seqHold: 2.5 }, 1.6)).toBe(2.5);
    expect(seqHoldFor({}, 1.6)).toBe(1.6);
    expect(seqHoldFor({ seqHold: NaN }, 1.6)).toBe(1.6);
    expect(seqHoldFor({ seqHold: -1 }, 1.6)).toBe(1.6);
  });

  it('stepTotalFor counts rendered lines like legacy stepTotal', () => {
    // legacy quirk (node-verified): terminal's rich() eats newlines before
    // the tline split, so a 3-line body counts 1; code/checklist split first.
    const term = {
      type: 'terminal',
      props: { title: 't', body: 'a\nb\nc', w: 900, stepped: true },
    };
    expect(stepTotalFor(term)).toBe(1);
    expect(isStepped(term)).toBe(true);
    expect(isStepped({ type: 'terminal', props: { title: 't', body: 'a', stepped: false } })).toBe(false);
    expect(stepTotalFor({ type: 'state' as never, props: {} })).toBe(0);
    expect(stepTotalFor({ type: 'nope', props: {} })).toBe(0);
    const check = {
      type: 'checklist',
      props: { items: 'a|done\nb|never', stepped: true },
    };
    expect(stepTotalFor(check)).toBe(2);
  });

  it('applyLineReveal hides lines past the count, preserving styles', () => {
    const html = REGISTRY['code'].markup({
      title: '',
      lang: 'text',
      body: 'a\nb\nc',
      w: 900,
      nums: false,
      focus: '',
      stepped: true,
    });
    expect(stepTotalFor({ type: 'code', props: { body: 'a\nb\nc', stepped: true } })).toBe(3);
    const doc = new DOMParser().parseFromString(
      `<body>${applyLineReveal(html, 1)}</body>`,
      'text/html',
    );
    const lines = doc.querySelectorAll('.tline');
    expect(lines.length).toBe(3);
    expect((lines[0] as HTMLElement).style.visibility).not.toBe('hidden');
    expect((lines[1] as HTMLElement).style.visibility).toBe('hidden');
    expect((lines[2] as HTMLElement).style.visibility).toBe('hidden');
    // full reveal is a no-op
    expect(applyLineReveal(html, 99)).toBe(html);
  });
});
