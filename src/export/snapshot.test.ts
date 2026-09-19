import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildCompHTML, buildFrameHTML } from './snapshot.js';
import { canvasCssBundle, themeCss } from './css.js';
import { importProjectFile } from '../domain/migrations.js';

function fixture() {
  const raw = JSON.parse(readFileSync('migration/fixtures/phase0-coverage.json', 'utf8'));
  return importProjectFile(raw).project;
}

describe('export snapshot', () => {
  it('bundles canvas CSS incl. fonts and the active theme', () => {
    const css = canvasCssBundle('studio-black');
    expect(css).toContain('@font-face');
    expect(css).toContain('--phos-green');
    expect(css).toContain('.tk-svc');
    expect(themeCss('studio-black')).toContain('--bg-deep');
    expect(themeCss('nope')).toBe('');
  });

  it('renders the resolved take frame deterministically', () => {
    const p = fixture();
    const spec = {
      comps: p.comps!,
      edges: p.edges!,
      scene: { w: 1920, h: 1080 },
      theme: 'studio-black',
      shown: 5,
      revealed: {},
    };
    const a = buildFrameHTML(spec);
    const b = buildFrameHTML(spec);
    expect(a).toBe(b);
    expect(a).toContain('data-theme="studio-black"');
    // clearBefore at shown=5: only pinned lb + db survive…
    expect(a).toContain('data-id="lb"');
    expect(a).toContain('data-id="db"');
    expect(a).not.toContain('data-id="users"');
    // …state steps draw nothing, edges follow both-endpoint visibility…
    expect(a).not.toContain('data-id="db-fail-patch"');
    // (e-app-db needs app1, cleared at shown=5 — see shown=4 below)
    expect(a).not.toContain('data-edge=');
    const at4 = buildFrameHTML({ ...spec, shown: 4 });
    expect(at4).toContain('data-edge="e-users-lb"');
    expect(at4).toContain('data-edge="e-lb-app"');
    // …and the db state patch applies once its step fires (index 6 → shown 7)
    const at7 = buildFrameHTML({ ...spec, shown: 7 });
    expect(at7).toContain('Fails to respond');
    expect(at7).not.toContain('Stores application data');
    expect(a).toContain('Stores application data');
  });

  it('edit snapshot (shown=null) shows all with no editor chrome', () => {
    const p = fixture();
    const html = buildFrameHTML({
      comps: p.comps!,
      edges: p.edges!,
      scene: { w: 1920, h: 1080 },
      theme: 'paper',
      shown: null,
    });
    expect(html).toContain('data-id="users"');
    expect(html).toContain('data-id="term1"');
    expect(html).not.toContain('es-sel');
    expect(html).not.toContain('data-guide');
    // settled export truth: no entrance fill on comp nodes
    expect(html).not.toContain('backwards');
  });

  it('isolates single components on a padded transparent stage', () => {
    const p = fixture();
    const db = p.comps!.find((c) => c.id === 'db')!;
    const html = buildCompHTML(db, p.comps!, 'studio-black');
    expect(html).toContain('padding:64px');
    expect(html).toContain('background:transparent');
    expect(html).toContain('tk-svc');
    expect(html).not.toContain('data-id="users"');
  });
});
