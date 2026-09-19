import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  importProjectFile,
  parseProjectFile,
  serializeProject,
} from './migrations.js';
import { toFileJson } from '../persistence/projectFile.js';
import type { Project } from './project.js';

const EXAMPLES = [
  'examples/hackrisk-dash.json',
  'examples/invest-cards.json',
  'examples/memory-bandwidth.json',
  'examples/microservices.json',
  'examples/rag-short.json',
  'migration/fixtures/phase0-coverage.json',
];

function load(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('importProjectFile', () => {
  it('imports every representative project without loss of comps/edges', () => {
    for (const path of EXAMPLES) {
      const raw = load(path) as Record<string, unknown>;
      const { project, note } = importProjectFile(raw);
      expect(project.comps, path).toBeDefined();
      // structural import keeps every non-legacy comp (only flowlink/
      // emptycanvas entries are folded) and drops no valid edges
      const rawComps = (raw['comps'] as unknown[] | undefined) ?? [];
      const legacyFolded = rawComps.filter(
        (c) =>
          (c as Record<string, unknown>)['type'] === 'flowlink' ||
          (c as Record<string, unknown>)['type'] === 'emptycanvas',
      ).length;
      // legacy scenes OBJECT map flattens additional comps (see importProject)
      const scenesMap =
        raw['scenes'] && typeof raw['scenes'] === 'object' && !Array.isArray(raw['scenes'])
          ? (raw['scenes'] as Record<string, unknown[]>)
          : {};
      const flattened = Object.values(scenesMap).reduce(
        (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
        0,
      );
      expect(project.comps!.length, `${path} comp count`).toBe(
        rawComps.length - legacyFolded + flattened,
      );
      // legacy markers (beats>1 / scenes object map) produce the flatten note
      const isLegacy =
        (typeof raw['beats'] === 'number' && raw['beats'] > 1) || flattened > 0;
      if (isLegacy) expect(note, path).toContain('flattened to sequence');
      else expect(note, path).toBe('');
    }
  });

  it('phase0 fixture keeps its story features', () => {
    const { project } = importProjectFile(load('migration/fixtures/phase0-coverage.json'));
    const ids = new Set(project.comps!.map((c) => c.id));
    expect(project.scenes!.length).toBe(2);
    expect(project.edges!.length).toBe(3);
    // clear/pin/hide/exit/state/stepped survivors
    expect(project.comps!.find((c) => c.id === 'db')?.clearBefore).toBe(true);
    expect(project.comps!.find((c) => c.id === 'lb')?.pin).toBe(true);
    expect(project.comps!.find((c) => c.id === 'alert1')?.hideWhen).toBe('err-msg');
    expect(project.comps!.find((c) => c.id === 'err-msg')?.out).toBe('fade');
    const patch = project.comps!.find((c) => c.id === 'db-fail-patch');
    expect(patch?.type).toBe('state');
    expect(patch?.target).toBe('db');
    expect(ids.has('db')).toBe(true);
  });

  it('sorts v2 beats into sequence order (stable)', () => {
    const { project } = importProjectFile({
      version: 1,
      comps: [
        { id: 'b', type: 'caption', beat: 0, props: {} },
        { id: 'a', type: 'caption', beat: 2, props: {} },
        { id: 'c', type: 'caption', beat: 2, props: {} },
      ],
    });
    expect(project.comps!.map((c) => c.id)).toEqual(['b', 'a', 'c']);
    expect(project.comps!.every((c) => !('beat' in c))).toBe(true);
  });

  it('migrates carry→pin and strips transients', () => {
    const { project } = importProjectFile({
      comps: [
        {
          id: 'x', type: 'caption', carry: true, _stateAt: 1, _played: true,
          revealed: 2, _rw: 5, beat: 3, props: {},
        },
      ],
    });
    const c = project.comps![0] as Record<string, unknown>;
    expect(c['pin']).toBe(true);
    for (const k of ['carry', 'beat', '_stateAt', '_played', 'revealed', '_rw'])
      expect(k in c, k).toBe(false);
    // legacy spread defaults still apply when missing
    expect(c['scale']).toBe(1);
    expect(c['opacity']).toBe(1);
  });

  it('converts flowlink comps and emptycanvas into edges/clears', () => {
    const { project } = importProjectFile({
      comps: [
        { id: 'n1', type: 'svc', props: {} },
        { id: 'n2', type: 'svc', props: {} },
        {
          id: 'f1', type: 'flowlink',
          props: { from: 'n1', to: 'n2', mode: 'pulse', label: 'w' },
        },
        { id: 'e1', type: 'emptycanvas', props: {} },
        { id: 'n3', type: 'caption', props: {} },
      ],
    });
    expect(project.comps!.map((c) => c.id)).toEqual(['n1', 'n2', 'n3']);
    expect(project.edges!.length).toBe(1);
    expect(project.edges![0].style).toBe('pulse');
    expect(project.comps!.find((c) => c.id === 'n3')?.clearBefore).toBe(true);
  });

  it('revalidates exits and prunes dangling edges', () => {
    // rule (index.html revalidateExits): hideWhen must point DOWNSTREAM —
    // a target at the same or an earlier position is dropped
    const { project } = importProjectFile({
      comps: [
        { id: 'a', type: 'caption', hideWhen: 'missing', props: {} },
        { id: 'b', type: 'caption', hideWhen: 'c', props: {} },
        { id: 'c', type: 'caption', hideWhen: 'b', props: {} },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'ghost' },
        { id: 'e2', from: 'b', to: 'c' },
      ],
    });
    // 'missing' doesn't exist → dropped; 'c' is downstream of 'b' → kept;
    // 'b' is upstream of 'c' → dropped
    expect(project.comps![0].hideWhen).toBeUndefined();
    expect(project.comps![1].hideWhen).toBe('c');
    expect(project.comps![2].hideWhen).toBeUndefined();
    expect(project.edges!.map((e) => e.id)).toEqual(['e2']);
  });

  it('aliases holdDefault and flattens legacy scenes with a note', () => {
    const { project, note } = importProjectFile({
      beats: 3,
      holdDefault: 2.5,
      scenes: { Old: [{ id: 'o1', type: 'caption', props: {} }] },
      comps: [{ id: 'n1', type: 'caption', props: {} }],
    });
    expect(project.seqHoldDefault).toBe(2.5);
    expect(project.comps!.map((c) => c.id)).toEqual(['n1', 'o1']);
    expect(note).toContain('flattened to sequence (2 steps)');
  });

  it('normalizes episode.scenes into the scenes array', () => {
    const { project } = importProjectFile({
      episode: { scenes: [{ id: 's1', name: 'One' }] },
      comps: [],
    });
    expect(project.scenes).toEqual([{ id: 's1', name: 'One' }]);
  });
});

describe('round-trip', () => {
  it('old JSON → typed → exported JSON → re-import is stable', () => {
    for (const path of EXAMPLES) {
      const first = importProjectFile(load(path)).project;
      const exported = JSON.parse(toFileJson(first as Project));
      expect(exported.version).toBe(3);
      const second = importProjectFile(exported).project;
      expect(second.comps, `${path} comps stable`).toEqual(first.comps);
      expect(second.edges, `${path} edges stable`).toEqual(first.edges);
      // serialize() never leaks runtime transients
      const blob = JSON.stringify(exported);
      for (const k of ['_stateAt', '_played', 'revealed', '"beat"'])
        expect(blob, `${path} leaks ${k}`).not.toContain(k);
    }
  });

  it('parseProjectFile accepts raw text and serializeProject omits empties', () => {
    const { project } = parseProjectFile('{"comps":[]}');
    expect(project.version).toBe(1);
    const out = serializeProject(project);
    expect(out['version']).toBe(3);
    expect(out).not.toHaveProperty('scenes');
    expect(out).not.toHaveProperty('script');
  });
});
