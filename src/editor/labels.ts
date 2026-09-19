import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';
import { isState, stateSummary } from '../renderer/stateChanges.js';

/** Human label for sequence rows / inspector titles (legacy compLabel parity). */
export function compLabel(
  c: SceneComponent,
  comps: SceneComponent[] = [],
  edges: Edge[] = [],
): string {
  if (isState(c)) {
    const t =
      comps.find((x) => x.id === c.target) ??
      edges.find((x) => x.id === c.target) ??
      null;
    // Note: zod catchall index signatures defeat `in`-narrowing here —
    // the union member is resolved by probing instead.
    const tt = t as SceneComponent & { type?: string };
    const on = !t
      ? '⚠ missing target'
      : isState({ type: tt.type ?? '' })
        ? 'state step'
        : tt.type || 'wire';
    const what = String((c as { label?: unknown }).label || '').trim() || stateSummary(c);
    return `${what} → ${on}`;
  }
  const p = (c.props ?? {}) as Record<string, unknown>;
  const direct = String(p['text'] || p['title'] || p['label'] || p['name'] || '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();
  if (direct) return direct;
  const items = String(p['items'] || '')
    .split('\n')
    .flatMap((l) => l.split('|'))
    .map((s) => s.trim().replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean);
  return items[0] || '';
}
