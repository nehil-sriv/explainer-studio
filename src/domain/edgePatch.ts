import { REGISTRY } from '../catalog/registry.js';
import type { Edge } from './edge.js';
import type { SceneComponent } from './component.js';

/**
 * Patchable state-step fields (legacy renderStateInspector parity):
 * comp targets → registry fields + color/bg; edge targets → wire fields.
 */
export const EDGE_PATCH_FIELDS: [string, string, string[] | null][] = [
  ['style', 'select', ['dots', 'dash', 'pulse']],
  ['routing', 'select', ['smooth', 'step', 'straight', 'curved']],
  ['dir', 'select', ['fwd', 'both', 'bwd']],
  ['label', 'text', null],
  ['caption', 'text', null],
  ['labSize', 'number', null],
  ['pillAccent', 'accent', null],
  ['labPos', 'select', ['start', 'mid', 'end']],
  ['labRot', 'select', ['flat', 'follow']],
  ['weight', 'number', null],
  ['speed', 'number', null],
  ['animate', 'check', null],
  ['accent', 'accent', null],
];

export interface PatchField {
  key: string;
  kind: string;
  options: string[] | null;
}

export function patchableFields(
  target: SceneComponent | Edge | null,
): PatchField[] {
  if (!target) return [];
  const maybeEdge = target as Partial<Edge> & Partial<SceneComponent>;
  if (maybeEdge.from !== undefined && maybeEdge.type === undefined) {
    return EDGE_PATCH_FIELDS.map(([key, kind, options]) => ({ key, kind, options }));
  }
  const comp = target as SceneComponent;
  const reg = REGISTRY[comp.type];
  const fields = reg ? [...(reg.fields ?? [])] : [];
  if (!fields.some((f) => f.toLowerCase() === 'color')) fields.push('color');
  if (!fields.some((f) => f.toLowerCase() === 'bg')) fields.push('bg');
  const fts = (reg?.fieldTypes ?? {}) as Record<string, string>;
  return fields.map((key) => ({
    key,
    kind:
      key === 'color' || key === 'bg'
        ? 'accent'
        : fts[key] || 'text',
    options: (reg?.options as Record<string, string[]> | undefined)?.[key] ?? null,
  }));
}
