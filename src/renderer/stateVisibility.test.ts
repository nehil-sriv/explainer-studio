import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SceneComponent } from '../domain/component.js';
import { importProjectFile } from '../domain/migrations.js';
import {
  effEdge,
  effProps,
  findTarget,
  lastStateIdx,
  statePatches,
  stateSummary,
} from './stateChanges.js';
import { resolveSceneAtStep } from './visibility.js';

function fixture(): SceneComponent[] {
  const raw = JSON.parse(
    readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'),
  );
  return importProjectFile(raw).project.comps!;
}

describe('stateChanges', () => {
  it('applies patches from the step position onward (later wins)', () => {
    const comps = fixture();
    const db = comps.find((c) => c.id === 'db')!;
    // cutoff 0 = edit base: patch not applied
    expect(effProps(comps, db, 0)['sub']).toBe('Stores application data');
    // cutoff through the state step (index 6) = take state
    expect(effProps(comps, db, 7)['sub']).toBe('Fails to respond');
    expect(statePatches(comps, 'db', 7)).toEqual([
      { state: 'error', accent: 'var(--alert-red)', sub: 'Fails to respond' },
    ]);
    expect(lastStateIdx(comps, 'db', 7)).toBe(6);
    expect(lastStateIdx(comps, 'db', 0)).toBe(-1);
  });

  it('patches edges too, and summarizes for the inspector', () => {
    const comps: SceneComponent[] = [
      { id: 'n', type: 'svc', props: {} },
      { id: 's1', type: 'state', target: 'e1', patch: { weight: 5 } },
    ];
    const edge = { id: 'e1', from: 'n', to: 'n' };
    expect(effEdge(comps, edge, 0)['weight']).toBeUndefined();
    expect(effEdge(comps, edge, 2)['weight']).toBe(5);
    expect(findTarget(comps, [edge], 'e1')).toBe(edge);
    expect(findTarget(comps, [edge], 'nope')).toBeNull();
    expect(stateSummary(comps[1])).toContain('weight=5');
    expect(stateSummary({ id: 'e', type: 'state' })).toBe('no changes yet');
  });
});

describe('visibility (phase0 story)', () => {
  it('reveals in order; edges follow both-endpoint visibility', () => {
    const raw = JSON.parse(
      readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'),
    );
    const { project } = importProjectFile(raw);
    const comps = project.comps!;
    const edges = project.edges!;

    // shown=4: first four comps; state step draws nothing
    let f = resolveSceneAtStep(comps, edges, 4);
    expect(f.visibleIds).toEqual(['title1', 'users', 'lb', 'app1']);
    expect(f.edgeIds).toEqual(['e-users-lb', 'e-lb-app']);

    // shown=5: db arrives with clearBefore — only pinned lb survives.
    // No edge draws: e-users-lb needs users, e-lb-app needs app1 (both
    // cleared), e-app-db needs app1. Both-endpoints-visible rule.
    f = resolveSceneAtStep(comps, edges, 5);
    expect(f.visibleIds).toEqual(['lb', 'db']);
    expect(f.edgeIds).toEqual([]);

    // shown=9: alert retired once err-msg (its hideWhen) appears
    f = resolveSceneAtStep(comps, edges, 9);
    expect(f.visibleIds).toContain('err-msg');
    expect(f.visibleIds).not.toContain('alert1');
  });

  it('honors scene takes, solo takes and parked comps', () => {
    const comps: SceneComponent[] = [
      { id: 'a', type: 'caption', sceneId: 's1', props: {} },
      { id: 'b', type: 'caption', sceneId: 's2', parked: true, props: {} },
      { id: 'c', type: 'caption', sceneId: 's2', props: {} },
    ];
    expect(
      resolveSceneAtStep(comps, [], 3, { sceneId: 's2' }).visibleIds,
    ).toEqual(['c']);
    expect(
      resolveSceneAtStep(comps, [], 3, { soloIds: ['c'] }).visibleIds,
    ).toEqual(['c']);
  });
});
