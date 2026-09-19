import { describe, expect, it } from 'vitest';
import { sequenceLength, stepsFromComponents } from './step.js';

describe('derived steps', () => {
  it('maps one position per comp with state steps flagged', () => {
    const steps = stepsFromComponents([
      { id: 'a', type: 'caption' },
      { id: 's', type: 'state', target: 'a', patch: {} },
      { id: 'b', type: 'svc' },
    ]);
    expect(sequenceLength([{ id: 'a', type: 'x' }])).toBe(1);
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(steps.map((s) => s.isState)).toEqual([false, true, false]);
  });
});
