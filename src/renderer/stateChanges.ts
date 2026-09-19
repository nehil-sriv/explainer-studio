import type { Edge } from '../domain/edge.js';
import { STATE_TYPE, type SceneComponent } from '../domain/component.js';

/**
 * State-change resolution — pure extraction of index.html statePatches /
 * effProps / effEdge / lastStateIdx / stateSummary.
 *
 * A state step draws nothing and patches its target's props (or an edge's
 * settings) from its sequence position onward. Later steps win; jumping
 * back un-applies for free. All functions take an explicit `cutoff`
 * (how far down the list patches apply) instead of reading editor globals:
 * - takes/exports: cutoff = SEQ.shown (everything revealed so far)
 * - edit default: cutoff = 0 (the base state you author)
 * - state-row scrub: cutoff = rowIndex + 1
 */
export function isState(c: Pick<SceneComponent, 'type'>): boolean {
  return !!c && c.type === STATE_TYPE;
}

/** Ordered patch list for a target (comp or edge id) below the cutoff. */
export function statePatches(
  comps: SceneComponent[],
  targetId: string,
  cutoff: number,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const n = Math.min(cutoff, comps.length);
  for (let j = 0; j < n; j++) {
    const s = comps[j];
    if (
      isState(s) &&
      (s as SceneComponent).target === targetId &&
      (s as SceneComponent).patch
    )
      out.push((s as SceneComponent).patch as Record<string, unknown>);
  }
  return out;
}

/** Effective props: base + applied patches (later wins). */
export function effProps(
  comps: SceneComponent[],
  c: SceneComponent,
  cutoff: number,
): Record<string, unknown> {
  const base = (c.props ?? {}) as Record<string, unknown>;
  const p = statePatches(comps, c.id, cutoff);
  return p.length ? Object.assign({}, base, ...p) : base;
}

/** Effective edge settings (edges are patch targets too). */
export function effEdge(
  comps: SceneComponent[],
  e: Edge,
  cutoff: number,
): Edge {
  const p = statePatches(comps, e.id, cutoff);
  return p.length ? Object.assign({}, e, ...p) : e;
}

/** Newest applied state-step index for a target (-1 = none). */
export function lastStateIdx(
  comps: SceneComponent[],
  id: string,
  cutoff: number,
): number {
  const n = Math.min(cutoff, comps.length);
  for (let j = n - 1; j >= 0; j--)
    if (isState(comps[j]) && comps[j].target === id) return j;
  return -1;
}

export function findTarget(
  comps: SceneComponent[],
  edges: Edge[],
  targetId: string,
): SceneComponent | Edge | null {
  return (
    comps.find((x) => x.id === targetId) ??
    edges.find((x) => x.id === targetId) ??
    null
  );
}

/** Inspector one-liner for a state step ("sub=Fails…, state=error"). */
export function stateSummary(s: SceneComponent): string {
  const p = (s.patch ?? {}) as Record<string, unknown>;
  const keys = Object.keys(p);
  if (!keys.length) return 'no changes yet';
  return keys
    .map((k) => `${k}=${String(p[k]).replace(/^var\(--(.*)\)$/, '$1')}`)
    .join(', ');
}
