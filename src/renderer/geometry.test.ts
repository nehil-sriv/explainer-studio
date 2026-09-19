import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { importProjectFile } from '../domain/migrations.js';
import {
  edgeColor,
  edgeGeom,
  edgeRoute,
  edgeWireText,
  portsOf,
  visualBox,
} from './geometry.js';

describe('geometry', () => {
  it('measures center-based visual boxes', () => {
    const b = visualBox({ x: 90, y: 70, wpx: 220, hpx: 120, scale: 1, rot: 0 });
    expect(b).toEqual({ cx: 200, cy: 130, hw: 110, hh: 60, rot: 0 });
    const ports = portsOf({ x: 90, y: 70, wpx: 220, hpx: 120, scale: 1, rot: 0 });
    expect(ports.find((p) => p.id === 'right')).toMatchObject({
      x: 310,
      y: 130,
      nx: 1,
      ny: 0,
    });
  });

  it('routes smooth/step/straight/curved deterministically', () => {
    const S = { x: 0, y: 0, nx: 1, ny: 0 };
    const E = { x: 100, y: 0, nx: -1, ny: 0 };
    expect(edgeRoute(S, E, 'smooth').d).toBe('M 0 0 C 40 0, 60 0, 100 0');
    expect(edgeRoute(S, E, 'step').d).toBe('M 0 0 H 50 V 0 H 100');
    expect(edgeRoute(S, E, 'straight').d).toBe('M 0 0 L 100 0');
    expect(edgeRoute(S, E, 'curved').d).toContain('Q');
    expect(edgeRoute(S, E, undefined).d).toBe(edgeRoute(S, E, 'smooth').d);
  });

  it('computes phase0 wire geometry from auto ports', () => {
    const raw = JSON.parse(
      readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'),
    );
    const { project } = importProjectFile(raw);
    const lookup = (id: string) => project.comps!.find((c) => c.id === id);
    const e = project.edges!.find((x) => x.id === 'e-users-lb')!;
    const g = edgeGeom(lookup, e);
    expect(g).not.toBeNull();
    // users right port (310,480) → lb left port (420,490)
    expect(g!.d).toBe('M 310 480 C 354.2 480, 375.8 490, 420 490');
    expect(g!.headEnd).toContain('420,490');
    // missing endpoints / self-loops / parked → null (never drawn)
    expect(edgeGeom(lookup, { ...e, to: 'ghost' })).toBeNull();
    expect(edgeGeom(lookup, { ...e, to: e.from })).toBeNull();
  });

  it('resolves wire colors and labels without the DOM', () => {
    expect(edgeColor({ branch: 'success' } as never)).toBe('#39FF7A');
    expect(edgeColor({ preset: 'sql' } as never)).toBe('var(--amber)');
    expect(
      edgeColor({ preset: 'none', accent: '#E11D48' } as never),
    ).toBe('#E11D48');
    expect(
      edgeColor({ preset: 'none' } as never, (r) => `live:${r}`),
    ).toBe('live:--phos-green');
    expect(edgeWireText({ preset: 'https', caption: '' })).toBe('HTTPS');
    expect(edgeWireText({ preset: 'https', caption: 'edge' })).toBe('edge');
  });
});
