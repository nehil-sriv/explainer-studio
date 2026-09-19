import { REGISTRY } from './registry.js';
import type { SceneComponent } from '../domain/component.js';
import { isState } from '../renderer/stateChanges.js';

/**
 * Stepped line counting — how many Space presses a stepped comp absorbs.
 * Counts rendered `.tline`/`.cline` nodes exactly like legacy stepTotal
 * (which queries the live DOM); here we count the same classes in the
 * extracted markup output, so no DOM is needed.
 */
export function stepTotalFor(c: Pick<SceneComponent, 'type' | 'props'>): number {
  if (!c || isState(c as SceneComponent)) return 0;
  const def = REGISTRY[(c as SceneComponent).type];
  if (!def) return 0;
  const html = def.markup(structuredClone((c.props ?? {}) as never));
  const m = html.match(/class="(tline|cline)\b/g);
  return m ? m.length : 0;
}

/** True when the comp absorbs per-line Space presses in takes. */
export function isStepped(c: Pick<SceneComponent, 'type' | 'props'>): boolean {
  const p = (c.props ?? {}) as Record<string, unknown>;
  return !!p['stepped'] && stepTotalFor(c) > 0;
}
