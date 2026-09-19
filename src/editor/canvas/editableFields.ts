import { REGISTRY } from '../../catalog/registry.js';
import type { SceneComponent } from '../../domain/component.js';

/**
 * Primary text field per component — what double-click edits in place.
 * Priority follows the plan's short-label contract (text/title/label/name
 * first); body/items are the multiline document fields. Rich-text tokens
 * are preserved verbatim (edited raw, rendered by the normal path).
 */

const PRIORITY = ['text', 'title', 'label', 'name', 'sub', 'body', 'items'];
const MULTILINE_KEYS = new Set(['body', 'items']);

export interface EditableField {
  key: string;
  multiline: boolean;
}

export function primaryTextField(c: SceneComponent): EditableField | null {
  if (c.type === 'state') return null;
  const def = REGISTRY[c.type];
  if (!def) return null;
  const props = (c.props ?? {}) as Record<string, unknown>;
  const fts = (def.fieldTypes ?? {}) as Record<string, string>;
  for (const key of PRIORITY) {
    if (!(key in props)) continue;
    const t = fts[key];
    const multiline = t === 'textarea' || t === 'code' || MULTILINE_KEYS.has(key);
    return { key, multiline };
  }
  return null;
}
